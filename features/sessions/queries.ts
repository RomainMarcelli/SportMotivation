import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
type SessionProofRow = Database["public"]["Tables"]["session_proofs"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];

export type SessionWithAuthor = SessionRow & {
  author: Pick<
    UserRow,
    "id" | "first_name" | "last_name" | "username" | "avatar_url" | "avatar_color" | "avatar_icon"
  >;
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
          "*, author:users(id, first_name, last_name, username, avatar_url, avatar_color, avatar_icon), proofs:session_proofs(*)"
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

export type SessionVote = { voterId: string; value: boolean; comment: string | null };

/**
 * Votes exprimés sur une séance (pour la fiche détaillée).
 *
 * On lit aussi `comment` : quand quelqu'un refuse, il peut joindre une raison, et
 * l'auteur doit pouvoir la relire dans le détail de sa séance (« pourquoi elle a
 * été refusée ? »).
 *
 * On ne joint PAS `users` : la RLS de cette table ne laisse pas lire n'importe
 * quel profil, la jointure reviendrait vide. L'écran croise les identifiants
 * avec la liste des membres du groupe, qu'il a déjà.
 */
export function useSessionVotes(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["session-votes", sessionId],
    enabled: !!sessionId,
    queryFn: async (): Promise<SessionVote[]> => {
      const { data, error } = await supabase
        .from("votes")
        .select("voter_id, vote_value, comment")
        .eq("session_id", sessionId!);
      if (error) throw error;
      return (data ?? []).map((v) => ({
        voterId: v.voter_id,
        value: v.vote_value,
        comment: v.comment ?? null,
      }));
    },
  });
}

export type SharedSessionGroup = { groupId: string; name: string; status: string };

/**
 * Les autres défis où cette même séance a été publiée (`shared_id`, cf. 036).
 *
 * La RLS ne renvoie que les défis dont on est membre : quelqu'un qui consulte la
 * séance d'un camarade ne découvre pas au passage la liste de ses autres défis.
 */
export function useSharedSessionGroups(sharedId: string | undefined) {
  return useQuery({
    queryKey: ["shared-session", sharedId],
    enabled: !!sharedId,
    queryFn: async (): Promise<SharedSessionGroup[]> => {
      const { data, error } = await supabase
        .from("sessions")
        .select("group_id, status, groups(name)")
        .eq("shared_id", sharedId!);
      if (error) throw error;
      return (data ?? []).map((row) => {
        const r = row as unknown as {
          group_id: string;
          status: string;
          groups: { name: string } | null;
        };
        return { groupId: r.group_id, name: r.groups?.name ?? "Un défi", status: r.status };
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
