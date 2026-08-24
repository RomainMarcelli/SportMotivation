import { useQuery } from "@tanstack/react-query";

import { useCurrentUser } from "@/lib/auth-store";
import { weekStartString } from "@/lib/date";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

type ExcuseRow = Database["public"]["Tables"]["excuses"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];
type ExcuseAuthor = Pick<
  UserRow,
  "id" | "first_name" | "last_name" | "username" | "avatar_url" | "avatar_color" | "avatar_icon"
>;

export type ExcuseWithAuthor = ExcuseRow & { author: ExcuseAuthor };

export type VotableExcuse = {
  excuse: ExcuseWithAuthor;
  yes: number;
  no: number;
};

/**
 * Mon excuse de la semaine en cours pour ce groupe (en attente ou acceptée). Sert à empêcher un
 * doublon et à refléter l'état (« excuse en cours / acceptée »). `null` si aucune.
 */
export function useMyWeekExcuse(groupId: string | undefined) {
  const user = useCurrentUser();
  const weekStart = weekStartString(new Date());

  return useQuery({
    queryKey: ["my-week-excuse", groupId, user?.id, weekStart],
    enabled: !!groupId && !!user?.id,
    queryFn: async (): Promise<ExcuseRow | null> => {
      const { data, error } = await supabase
        .from("excuses")
        .select("*")
        .eq("group_id", groupId!)
        .eq("user_id", user!.id)
        .eq("week_start", weekStart)
        .neq("status", "rejected")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

/**
 * Excuses **à voter par moi** : en attente de vote, soumises par un AUTRE membre, et que je n'ai pas
 * encore votées. Avec auteur + tally (oui/non). Même logique que `useVotableSessions`.
 */
export function useVotableExcuses(groupId: string | undefined, meId: string | undefined) {
  return useQuery({
    queryKey: ["excuses", groupId, "votable", meId],
    enabled: !!groupId && !!meId,
    queryFn: async (): Promise<VotableExcuse[]> => {
      const { data: rows, error } = await supabase
        .from("excuses")
        .select(
          "*, author:users(id, first_name, last_name, username, avatar_url, avatar_color, avatar_icon)"
        )
        .eq("group_id", groupId!)
        .eq("status", "pending_vote")
        .neq("user_id", meId!)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const excuses = (rows ?? []).map((row) => {
        const { author, ...excuse } = row as unknown as ExcuseWithAuthor;
        return { ...excuse, author } as ExcuseWithAuthor;
      });
      if (excuses.length === 0) return [];

      const ids = excuses.map((e) => e.id);
      const { data: votes } = await supabase
        .from("votes")
        .select("excuse_id, voter_id, vote_value")
        .in("excuse_id", ids);

      const tally = new Map<string, { yes: number; no: number }>();
      const votedByMe = new Set<string>();
      for (const v of votes ?? []) {
        if (!v.excuse_id) continue;
        const t = tally.get(v.excuse_id) ?? { yes: 0, no: 0 };
        if (v.vote_value) t.yes += 1;
        else t.no += 1;
        tally.set(v.excuse_id, t);
        if (v.voter_id === meId) votedByMe.add(v.excuse_id);
      }

      return excuses
        .filter((e) => !votedByMe.has(e.id))
        .map((excuse) => {
          const t = tally.get(excuse.id) ?? { yes: 0, no: 0 };
          return { excuse, yes: t.yes, no: t.no };
        });
    },
  });
}

/** URL signée temporaire pour afficher un justificatif d'excuse (bucket privé). */
export function useJustificationSignedUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["excuse-justification-url", path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.storage
        .from("excuse-justifications")
        .createSignedUrl(path!, 60 * 60);
      if (error) throw error;
      return data?.signedUrl ?? null;
    },
  });
}
