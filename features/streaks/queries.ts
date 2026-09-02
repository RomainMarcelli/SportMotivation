import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

/**
 * Série (streak) d'un membre pour UN groupe. Combine le cache clôturé et la semaine
 * en cours (RPC `get_group_streak`, cf. `060_streak_tables.sql`). La règle « +1 dès
 * l'objectif effectif atteint » est appliquée côté serveur — le client ne fait que
 * lire (jamais incrémenter).
 */
export type GroupStreak = {
  currentStreak: number;
  bestStreak: number;
  currentWeekCompleted: boolean;
  remainingSessions: number;
};

const EMPTY: GroupStreak = {
  currentStreak: 0,
  bestStreak: 0,
  currentWeekCompleted: false,
  remainingSessions: 0,
};

type StreakRow = {
  current_streak: number | null;
  best_streak: number | null;
  current_week_completed: boolean | null;
  remaining_sessions: number | null;
};

export function useGroupStreak(groupId: string | undefined) {
  return useQuery({
    queryKey: ["group-streak", groupId],
    enabled: !!groupId,
    // La série peut bouger dès qu'une séance est validée (semaine en cours) → on
    // reste réactif sans marteler le serveur.
    staleTime: 20_000,
    queryFn: async (): Promise<GroupStreak> => {
      // `enabled: !!groupId` garantit un id défini quand la requête part.
      const { data, error } = await supabase.rpc("get_group_streak", {
        p_group_id: groupId!,
      });
      if (error) throw error;
      // Retour TABLE(...) → tableau de lignes.
      const row = (Array.isArray(data) ? data[0] : data) as StreakRow | undefined;
      if (!row) return EMPTY;
      return {
        currentStreak: row.current_streak ?? 0,
        bestStreak: row.best_streak ?? 0,
        currentWeekCompleted: !!row.current_week_completed,
        remainingSessions: row.remaining_sessions ?? 0,
      };
    },
  });
}
