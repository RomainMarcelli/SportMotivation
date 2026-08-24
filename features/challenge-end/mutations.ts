import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

/**
 * Déblocage de la cagnotte en fin de défi (RPC `unlock_pot`, SQL 049).
 *
 * Réservé à l'admin/trésorier et seulement une fois le défi terminé (la RPC vérifie tout côté
 * serveur ; on ne fait que déclencher). Idempotent : rappeler la RPC sur une cagnotte déjà
 * débloquée est sans effet. On invalide les vues qui affichent le montant / l'état de la
 * cagnotte pour que la bascule « verrouillée → débloquée » soit immédiate partout.
 */
export function useUnlockPot(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.rpc(
        "unlock_pot" as never,
        { p_group_id: groupId } as never
      );
      if (error) throw error;
      // La RPC renvoie l'horodatage de déblocage (timestamptz).
      return (data as string | null) ?? null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pot-status", groupId] });
      queryClient.invalidateQueries({ queryKey: ["pot", groupId] });
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
    },
  });
}

/** Messages d'erreur RPC → texte lisible (mêmes codes que les autres RPC groupe). */
export function mapUnlockError(message: string): string {
  if (/NOT_ADMIN|NOT_TREASURER/.test(message)) return "Seul l'admin peut débloquer la cagnotte.";
  if (/NOT_MEMBER/.test(message)) return "Tu n'es plus membre de ce groupe.";
  if (/NOT_ENDED|CHALLENGE_NOT_ENDED/.test(message))
    return "Le défi n'est pas encore terminé.";
  if (/NO_POT/.test(message)) return "Cagnotte introuvable pour ce défi.";
  return "Déblocage impossible pour le moment. Réessaie.";
}
