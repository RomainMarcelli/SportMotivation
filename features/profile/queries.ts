import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/lib/auth-store";
import type { Database } from "@/types/database.types";

export type ProfileStats = {
  sessionsDone: number;
  streakWeeks: number;
  targetRate: number;
  penaltiesPaid: number;
  groupsCount: number;
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
  streakWeeks: 0,
  targetRate: 0,
  penaltiesPaid: 0,
  groupsCount: 0,
};

/**
 * Statistiques de l'écran Profil (RPC `get_my_profile_stats`, SQL 030).
 *
 * Un profil neuf n'a pas de stats : plutôt que de casser l'écran, on renvoie des
 * zéros quand la RPC n'existe pas encore (SQL non exécuté) ou ne renvoie rien.
 */
export function useProfileStats() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: ["profile-stats", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<ProfileStats> => {
      const { data, error } = await supabase.rpc("get_my_profile_stats");
      if (error) return EMPTY_STATS;
      const row = (data ?? [])[0];
      if (!row) return EMPTY_STATS;
      return {
        sessionsDone: row.sessions_done ?? 0,
        streakWeeks: row.streak_weeks ?? 0,
        targetRate: row.target_rate ?? 0,
        penaltiesPaid: Number(row.penalties_paid ?? 0),
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
