import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

/**
 * Outil de TEST : remet à zéro mon excuse de la semaine et mon joker du mois, pour pouvoir
 * enchaîner les scénarios sans attendre lundi / le mois suivant.
 *
 * ⚠ Masqué hors développement. La RPC `dev_reset_excuse_joker` doit être SUPPRIMÉE en base
 * avant la mise en production (voir `supabase/sql/027_dev_reset_excuse_joker.sql`).
 */
export const devResetEnabled = __DEV__;

export function useDevResetExcuseJoker(groupId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<string> => {
      const { data, error } = await supabase.rpc("dev_reset_excuse_joker", {
        p_group_id: groupId!,
      });
      if (error) throw error;
      return (data as unknown as string) ?? "Réinitialisé";
    },
    onSuccess: () => {
      // Clés préfixées : ["joker", groupId, …], ["my-week-excuse", groupId, …], etc.
      queryClient.invalidateQueries({ queryKey: ["joker"] });
      queryClient.invalidateQueries({ queryKey: ["my-week-excuse"] });
      queryClient.invalidateQueries({ queryKey: ["excuses"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
