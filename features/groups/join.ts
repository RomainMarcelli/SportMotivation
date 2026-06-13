import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentUser } from "@/lib/auth-store";
import { isValidInviteCode } from "@/lib/group-code";
import { debugError } from "@/lib/log";
import { supabase } from "@/lib/supabase";
import type { Database, Json } from "@/types/database.types";

type DeadlineType = Database["public"]["Enums"]["deadline_type"];

/**
 * Aperçu d'un groupe renvoyé par la RPC get_group_preview_by_code.
 * Typé manuellement car la RPC n'est pas dans les types générés.
 */
export type GroupPreview = {
  id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  challenge_start: string;
  challenge_end: string;
  penalty_amount: number;
  accepted_activities: string[];
  min_duration_min: number;
  publication_deadline: DeadlineType;
  vote_deadline: DeadlineType;
  blame_threshold: number;
  max_excuses: number | null;
  max_members: number;
  status: string;
  member_count: number;
};

/** Traduit les exceptions SQL de join_group_by_code en messages utilisateur. */
export function mapJoinError(message: string): string {
  if (message.includes("GROUP_NOT_FOUND")) return "Aucun groupe trouvé avec ce code.";
  if (message.includes("GROUP_NOT_JOINABLE"))
    return "Ce groupe n'accepte plus de nouveaux membres.";
  if (message.includes("ALREADY_MEMBER")) return "Tu fais déjà partie de ce groupe.";
  if (message.includes("GROUP_FULL")) return "Ce groupe est complet (10 membres maximum).";
  if (message.includes("INVALID_TARGET")) return "Objectif hebdomadaire invalide.";
  if (message.includes("INVALID_PENALTY")) return "Montant de pénalité invalide.";
  // Fonction/colonne manquante côté base (SQL pas appliqué)
  if (/could not find the function|schema cache|does not exist/i.test(message))
    return "Configuration serveur incomplète (fonction ou colonne manquante en base). Contacte l'admin technique.";
  if (/row-level security|permission/i.test(message))
    return "Accès refusé par la base de données (RLS).";
  return message;
}

/** Récupère l'aperçu d'un groupe via son code (RPC SECURITY DEFINER). */
export function useGroupPreview(code: string | undefined) {
  return useQuery({
    queryKey: ["group-preview", code],
    enabled: !!code && isValidInviteCode(code),
    retry: false,
    queryFn: async (): Promise<GroupPreview | null> => {
      // RPC non typée dans database.types → cast.
      const { data, error } = await supabase.rpc(
        "get_group_preview_by_code" as never,
        { p_code: code } as never
      );
      if (error) throw error;
      const rows = (data ?? []) as Record<string, unknown>[];
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        ...(r as unknown as GroupPreview),
        accepted_activities: (r.accepted_activities as string[] | null) ?? [],
        member_count: Number(r.member_count ?? 0),
      };
    },
  });
}

type JoinArgs = {
  code: string;
  weeklyTarget: number;
  penaltyAmount: number;
  rulesSnapshot: Json;
};

/** Rejoint un groupe via code (RPC) puis enregistre l'acceptation des règles. */
export function useJoinGroup() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      code,
      weeklyTarget,
      penaltyAmount,
      rulesSnapshot,
    }: JoinArgs): Promise<string> => {
      if (!user) throw new Error("Aucun utilisateur connecté.");

      const { data, error } = await supabase.rpc(
        "join_group_by_code" as never,
        { p_code: code, p_weekly_target: weeklyTarget, p_penalty_amount: penaltyAmount } as never
      );
      if (error) {
        debugError("join_group_by_code", error);
        throw new Error(mapJoinError(error.message));
      }

      const groupId = data as unknown as string;

      // upsert (et non insert) : idempotent si l'utilisateur a déjà une acceptation
      // (cas d'une réintégration après départ, ou d'un double clic).
      const { error: acceptanceError } = await supabase.from("rule_acceptances").upsert(
        {
          group_id: groupId,
          user_id: user.id,
          rules_snapshot: rulesSnapshot,
        },
        { onConflict: "group_id,user_id" }
      );
      if (acceptanceError) {
        debugError("rule_acceptances.upsert", acceptanceError);
        throw new Error(mapJoinError(acceptanceError.message));
      }

      return groupId;
    },
    onSuccess: (groupId) => {
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
    },
  });
}
