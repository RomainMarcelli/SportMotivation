import { useMutation } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

/**
 * Supprime (anonymise) le compte de l'utilisateur courant via l'Edge Function
 * `delete-account`, puis déconnecte localement.
 */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      await supabase.auth.signOut();
    },
  });
}
