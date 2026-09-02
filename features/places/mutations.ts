import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

/**
 * Enregistre les centres d'intérêt du groupe (`groups.interests`, SQL 070).
 * Réservé à l'admin par la RLS UPDATE de `groups` (le client ne fait que proposer).
 * Les clés sont stockées telles quelles (catalogue ou slug d'intérêt libre).
 */
export function useSetGroupInterests(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (interests: string[]) => {
      const { error } = await supabase
        .from("groups")
        .update({ interests })
        .eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
    },
  });
}
