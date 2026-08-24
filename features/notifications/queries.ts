import { useQuery } from "@tanstack/react-query";

import { useCurrentUser } from "@/lib/auth-store";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

export type AppNotification = Database["public"]["Tables"]["notifications"]["Row"];

/** Liste les notifications de l'utilisateur courant (plus récentes d'abord). */
export function useNotifications() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user?.id,
    // Rafraîchit le badge sans action de l'utilisateur (le vrai temps réel = Étape 11).
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<AppNotification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Nombre de notifications non lues (pour le badge). */
export function useUnreadCount() {
  const { data } = useNotifications();
  return (data ?? []).filter((n) => !n.read).length;
}

/**
 * Identifiants des séances et excuses sur lesquelles j'ai **déjà voté**.
 *
 * Sert à ne plus proposer « Voter » sur une notification déjà traitée. Une seule
 * requête pour toute la liste (la table `votes` porte les deux types de vote),
 * plutôt qu'un appel par groupe.
 *
 * Best-effort : en cas d'erreur on renvoie un ensemble vide, ce qui laisse le
 * bouton en place — un bouton en trop vaut mieux qu'un « déjà voté » mensonger.
 */
export function useMyVotedTargets() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: ["my-voted-targets", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("votes")
        .select("session_id, excuse_id")
        .eq("voter_id", user!.id);
      if (error) return new Set();
      const ids = new Set<string>();
      for (const row of data ?? []) {
        if (row.session_id) ids.add(row.session_id);
        if (row.excuse_id) ids.add(row.excuse_id);
      }
      return ids;
    },
  });
}
