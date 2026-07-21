import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { SessionWithAuthor } from "@/features/sessions/queries";
import type { Database } from "@/types/database.types";

type SessionProofRow = Database["public"]["Tables"]["session_proofs"]["Row"];

export type VotableSession = {
  session: SessionWithAuthor;
  /** Votes « oui » déjà exprimés (hors le mien, que je n'ai pas encore voté). */
  yes: number;
  /** Votes « non » déjà exprimés. */
  no: number;
};

/**
 * Séances d'un groupe **à voter par moi** : en attente de vote, déclarées par un AUTRE membre,
 * et que je n'ai pas encore votées. Avec auteur, preuves et compteur de votes (tally).
 */
export function useVotableSessions(groupId: string | undefined, meId: string | undefined) {
  return useQuery({
    queryKey: ["votes", groupId, meId],
    enabled: !!groupId && !!meId,
    queryFn: async (): Promise<VotableSession[]> => {
      const { data: rows, error } = await supabase
        .from("sessions")
        .select(
          "*, author:users(id, first_name, last_name, username, avatar_url, avatar_color, avatar_icon), proofs:session_proofs(*)"
        )
        .eq("group_id", groupId!)
        .eq("status", "pending_vote")
        .neq("user_id", meId!)
        .order("published_at", { ascending: true });
      if (error) throw error;

      const sessions = (rows ?? []).map((row) => {
        const { author, proofs, ...session } = row as unknown as SessionWithAuthor & {
          author: SessionWithAuthor["author"];
          proofs: SessionProofRow[];
        };
        return { ...session, author, proofs: proofs ?? [] } as SessionWithAuthor;
      });

      if (sessions.length === 0) return [];

      // Votes de ces séances (lecture autorisée aux membres via RLS) → tally + filtre « déjà voté ».
      const ids = sessions.map((s) => s.id);
      const { data: votes } = await supabase
        .from("votes")
        .select("session_id, voter_id, vote_value")
        .in("session_id", ids);

      const tally = new Map<string, { yes: number; no: number }>();
      const votedByMe = new Set<string>();
      for (const v of votes ?? []) {
        if (!v.session_id) continue;
        const t = tally.get(v.session_id) ?? { yes: 0, no: 0 };
        if (v.vote_value) t.yes += 1;
        else t.no += 1;
        tally.set(v.session_id, t);
        if (v.voter_id === meId) votedByMe.add(v.session_id);
      }

      return sessions
        .filter((s) => !votedByMe.has(s.id))
        .map((session) => {
          const t = tally.get(session.id) ?? { yes: 0, no: 0 };
          return { session, yes: t.yes, no: t.no };
        });
    },
  });
}
