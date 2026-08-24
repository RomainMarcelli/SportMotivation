import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentUser } from "@/lib/auth-store";
import { weekStartString } from "@/lib/date";
import { debugError } from "@/lib/log";
import { supabase } from "@/lib/supabase";

import { normalizePlannedDays, togglePlannedDay } from "./plan";

/**
 * Plan de la semaine en cours d'un membre dans un groupe (table `weekly_plans`).
 * `planned_days` = jours prévus, indexés 0 = lundi … 6 = dimanche.
 *
 * ⚠ Aucun module ne lisait cette table : ce hook est l'accès minimal (lecture + bascule d'un
 * jour) sur le schéma existant — il n'invente aucune colonne. `week_start` = lundi local.
 */
export function useWeeklyPlan(groupId: string | undefined) {
  const user = useCurrentUser();
  const weekStart = weekStartString(new Date());

  return useQuery({
    queryKey: ["weekly-plan", groupId, user?.id, weekStart],
    enabled: !!groupId && !!user?.id,
    queryFn: async (): Promise<number[]> => {
      const { data, error } = await supabase
        .from("weekly_plans")
        .select("planned_days")
        .eq("group_id", groupId!)
        .eq("user_id", user!.id)
        .eq("week_start", weekStart)
        .maybeSingle();
      if (error) {
        debugError("weekly_plans.select", error);
        throw error;
      }
      return normalizePlannedDays(data?.planned_days);
    },
  });
}

/**
 * Bascule un jour (0–6) dans le plan de la semaine courante : upsert de la ligne
 * `weekly_plans` (clé logique group_id + user_id + week_start).
 */
export function useToggleWeeklyPlanDay(groupId: string | undefined) {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const weekStart = weekStartString(new Date());

  return useMutation({
    mutationFn: async (vars: { dayIndex: number; current: number[] }): Promise<number[]> => {
      const next = togglePlannedDay(vars.current, vars.dayIndex);
      const { error } = await supabase.from("weekly_plans").upsert(
        {
          group_id: groupId!,
          user_id: user!.id,
          week_start: weekStart,
          planned_days: next,
        },
        { onConflict: "group_id,user_id,week_start" }
      );
      if (error) {
        debugError("weekly_plans.upsert", error);
        throw error;
      }
      return next;
    },
    onSuccess: (next) => {
      queryClient.setQueryData(["weekly-plan", groupId, user?.id, weekStart], next);
    },
  });
}
