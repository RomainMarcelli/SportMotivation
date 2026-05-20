import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentUser } from "@/lib/auth-store";
import { supabase } from "@/lib/supabase";
import type { Database, Json } from "@/types/database.types";

export type UserSearchResult = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

type DeadlineType = Database["public"]["Enums"]["deadline_type"];

export type GroupPreviewById = {
  id: string;
  name: string;
  description: string | null;
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
  member_count: number;
};

export function mapInviteError(message: string): string {
  if (message.includes("NOT_ADMIN")) return "Seul un admin peut inviter.";
  if (message.includes("ALREADY_MEMBER")) return "Ce joueur fait déjà partie du groupe.";
  if (message.includes("GROUP_NOT_FOUND")) return "Groupe introuvable.";
  if (message.includes("GROUP_FULL")) return "Le groupe est complet.";
  if (message.includes("INVITATION_RESOLVED")) return "Cette invitation a déjà été traitée.";
  return message;
}

/** Recherche d'utilisateurs par pseudo (activée à partir de 2 caractères). */
export function useSearchUsers(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["search-users", trimmed],
    enabled: trimmed.length >= 2,
    queryFn: async (): Promise<UserSearchResult[]> => {
      const { data, error } = await supabase.rpc("search_users_by_username", { p_query: trimmed });
      if (error) throw error;
      return (data ?? []) as UserSearchResult[];
    },
  });
}

/** Invite un utilisateur dans un groupe (admin). */
export function useInviteUser(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("invite_user_to_group", {
        p_group_id: groupId,
        p_user_id: userId,
      });
      if (error) throw new Error(mapInviteError(error.message));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-invitations", groupId] });
    },
  });
}

/** Aperçu d'un groupe par id (pour accepter une invitation). */
export function useGroupPreviewById(groupId: string | undefined) {
  return useQuery({
    queryKey: ["group-preview-id", groupId],
    enabled: !!groupId,
    retry: false,
    queryFn: async (): Promise<GroupPreviewById | null> => {
      const { data, error } = await supabase.rpc("get_group_preview_by_id", {
        p_group_id: groupId!,
      });
      if (error) throw error;
      const rows = (data ?? []) as Record<string, unknown>[];
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        ...(r as unknown as GroupPreviewById),
        accepted_activities: (r.accepted_activities as string[] | null) ?? [],
        member_count: Number(r.member_count ?? 0),
      };
    },
  });
}

type AcceptArgs = {
  invitationId: string;
  weeklyTarget: number;
  penaltyAmount: number;
  rulesSnapshot: Json;
};

/** Accepte une invitation (rejoint le groupe) + enregistre l'acceptation des règles. */
export function useAcceptInvitation() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invitationId,
      weeklyTarget,
      penaltyAmount,
      rulesSnapshot,
    }: AcceptArgs): Promise<string> => {
      if (!user) throw new Error("Aucun utilisateur connecté.");
      const { data, error } = await supabase.rpc("accept_invitation", {
        p_invitation_id: invitationId,
        p_weekly_target: weeklyTarget,
        p_penalty_amount: penaltyAmount,
      });
      if (error) throw new Error(mapInviteError(error.message));
      const groupId = data as unknown as string;

      const { error: acceptanceError } = await supabase.from("rule_acceptances").upsert(
        { group_id: groupId, user_id: user.id, rules_snapshot: rulesSnapshot },
        { onConflict: "group_id,user_id" }
      );
      if (acceptanceError) throw acceptanceError;
      return groupId;
    },
    onSuccess: (groupId) => {
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
    },
  });
}

/** Refuse une invitation (update status). */
export function useRefuseInvitation() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from("group_invitations")
        .update({ status: "refused", resolved_at: new Date().toISOString() })
        .eq("id", invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
}
