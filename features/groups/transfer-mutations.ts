import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

/**
 * Transfère l'administration du groupe à un autre membre (RPC `transfer_admin`).
 * L'ancien admin redevient membre simple et reste dans le groupe.
 * Renvoie le prénom/pseudo du nouvel admin (pour le toast).
 */
export function useTransferAdmin(groupId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newAdminUserId: string): Promise<string> => {
      const { data, error } = await supabase.rpc("transfer_admin", {
        p_group_id: groupId!,
        p_new_admin_id: newAdminUserId,
      });
      if (error) throw error;
      return (data as unknown as string) ?? "Le nouveau membre";
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
    },
  });
}
