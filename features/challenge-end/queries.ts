import { useQuery } from "@tanstack/react-query";

import type { ReportOutcome } from "@/features/challenge-end/report";
import { supabase } from "@/lib/supabase";

/**
 * Résultats hebdomadaires figés d'un défi. Le bilan doit les lire directement :
 * recalculer depuis les seules séances ferait oublier excuses, jokers et suspensions.
 */
export function useGroupWeeklyOutcomes(groupId: string | undefined) {
  return useQuery({
    queryKey: ["group-weekly-outcomes", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<ReportOutcome[]> => {
      const { data, error } = await supabase
        .from("member_weekly_outcomes")
        .select("user_id, week_start, status")
        .eq("group_id", groupId!)
        .order("week_start", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        userId: row.user_id,
        weekStart: row.week_start,
        status: row.status as ReportOutcome["status"],
      }));
    },
  });
}
