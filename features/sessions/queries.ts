import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
type SessionProofRow = Database["public"]["Tables"]["session_proofs"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];

export type SessionWithAuthor = SessionRow & {
  author: Pick<UserRow, "id" | "first_name" | "last_name" | "username" | "avatar_url">;
  proofs: SessionProofRow[];
};

/** Feed des séances d'un groupe (les plus récentes d'abord), avec auteur et preuves. */
export function useGroupSessions(groupId: string | undefined) {
  return useQuery({
    queryKey: ["sessions", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<SessionWithAuthor[]> => {
      const { data, error } = await supabase
        .from("sessions")
        .select(
          "*, author:users(id, first_name, last_name, username, avatar_url), proofs:session_proofs(*)"
        )
        .eq("group_id", groupId!)
        .order("performed_at", { ascending: false })
        .order("published_at", { ascending: false });
      if (error) throw error;

      return (data ?? []).map((row) => {
        const { author, proofs, ...session } = row as unknown as SessionWithAuthor & {
          author: SessionWithAuthor["author"];
          proofs: SessionProofRow[];
        };
        return { ...session, author, proofs: proofs ?? [] } as SessionWithAuthor;
      });
    },
  });
}

/**
 * URL signée temporaire pour afficher une photo de preuve (bucket privé).
 * `path` est le chemin stocké dans `session_proofs.media_url`.
 */
export function useProofSignedUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["proof-url", path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000, // l'URL signée vaut 1h, on la garde ~50 min
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.storage
        .from("session-proofs")
        .createSignedUrl(path!, 60 * 60);
      if (error) throw error;
      return data?.signedUrl ?? null;
    },
  });
}
