import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

/**
 * Le trésorier (= admin en V1) coche / décoche le règlement d'un membre.
 * RPC `settle_member_pot` : passe toutes ses dettes à payé / non payé.
 * On invalide la cagnotte ET le pot (le montant réglé change les jauges partout).
 */
export function useSettleMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, paid }: { userId: string; paid: boolean }) => {
      const { error } = await supabase.rpc(
        "settle_member_pot" as never,
        { p_group_id: groupId, p_user_id: userId, p_paid: paid } as never
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cagnotte", groupId] });
      queryClient.invalidateQueries({ queryKey: ["pot", groupId] });
    },
  });
}

/**
 * Relance les membres avec un solde en attente (notification in-app).
 * RPC `remind_unpaid_members` → renvoie le nombre de membres relancés.
 */
export function useRemindUnpaid(groupId: string) {
  return useMutation({
    mutationFn: async (): Promise<number> => {
      const { data, error } = await supabase.rpc(
        "remind_unpaid_members" as never,
        { p_group_id: groupId } as never
      );
      if (error) throw error;
      return (data as number | null) ?? 0;
    },
  });
}

/** Messages d'erreur RPC → texte lisible (mêmes codes que les autres RPC groupe). */
export function mapCagnotteError(message: string): string {
  if (/NOT_TREASURER/.test(message)) return "Seul l'admin peut cocher les paiements.";
  if (/NOT_MEMBER/.test(message)) return "Tu n'es plus membre de ce groupe.";
  if (/NO_POT/.test(message)) return "Cagnotte introuvable pour ce défi.";
  return "Action impossible pour le moment. Réessaie.";
}
