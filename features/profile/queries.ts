import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/lib/auth-store";
import type { Database } from "@/types/database.types";

export type ProfileStats = {
  sessionsDone: number;
  /** Meilleure série EN COURS (max des défis actifs). */
  bestCurrentStreak: number;
  /** Record historique de série (tous défis). */
  recordStreak: number;
  targetRate: number;
  penaltiesPaid: number;
  penaltiesDue: number;
  penaltiesAvoided: number;
  challengesFinished: number;
  challengesWon: number;
  challengesPlayed: number;
  groupsCount: number;
};

type ProfileStatsRow = {
  sessions_done: number | null;
  best_current_streak: number | null;
  record_streak: number | null;
  target_rate: number | null;
  penalties_paid: number | null;
  penalties_due: number | null;
  penalties_avoided: number | null;
  challenges_finished: number | null;
  challenges_won: number | null;
  challenges_played: number | null;
  groups_count: number | null;
};

export type ProfileGroup = {
  groupId: string;
  name: string;
  role: Database["public"]["Enums"]["member_role"];
  weeklyTarget: number;
  penaltyAmount: number;
  potTotal: number;
  membersCount: number;
};

const EMPTY_STATS: ProfileStats = {
  sessionsDone: 0,
  bestCurrentStreak: 0,
  recordStreak: 0,
  targetRate: 0,
  penaltiesPaid: 0,
  penaltiesDue: 0,
  penaltiesAvoided: 0,
  challengesFinished: 0,
  challengesWon: 0,
  challengesPlayed: 0,
  groupsCount: 0,
};

/**
 * Statistiques de l'écran Profil (RPC `get_my_profile_stats`, SQL 030).
 *
 * Un profil neuf n'a pas de ligne utile : on renvoie alors des zéros. Une erreur
 * réseau/RLS reste en revanche une vraie erreur afin que l'écran puisse l'expliquer
 * et proposer un nouvel essai, au lieu d'afficher des statistiques mensongères.
 */
export function useProfileStats() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: ["profile-stats", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<ProfileStats> => {
      const { data, error } = await supabase.rpc("get_my_profile_stats");
      if (error) throw error;
      const row = ((data ?? []) as unknown as ProfileStatsRow[])[0];
      if (!row) return EMPTY_STATS;
      return {
        sessionsDone: row.sessions_done ?? 0,
        bestCurrentStreak: row.best_current_streak ?? 0,
        recordStreak: row.record_streak ?? 0,
        targetRate: row.target_rate ?? 0,
        penaltiesPaid: Number(row.penalties_paid ?? 0),
        penaltiesDue: Number(row.penalties_due ?? 0),
        penaltiesAvoided: Number(row.penalties_avoided ?? 0),
        challengesFinished: row.challenges_finished ?? 0,
        challengesWon: row.challenges_won ?? 0,
        challengesPlayed: row.challenges_played ?? 0,
        groupsCount: row.groups_count ?? 0,
      };
    },
  });
}

/** Mes groupes au format « carte » de l'écran Profil (RPC `get_my_profile_groups`). */
export function useProfileGroups() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: ["profile-groups", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<ProfileGroup[]> => {
      const { data, error } = await supabase.rpc("get_my_profile_groups");
      if (error) return [];
      return (data ?? []).map((r) => ({
        groupId: r.group_id,
        name: r.name,
        role: r.role,
        weeklyTarget: r.weekly_target,
        penaltyAmount: Number(r.penalty_amount ?? 0),
        potTotal: Number(r.pot_total ?? 0),
        membersCount: r.members_count ?? 0,
      }));
    },
  });
}
