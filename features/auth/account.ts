import { useMutation } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

/** Ce qui est réellement arrivé au compte, pour l'écran de confirmation. */
export type DeleteAccountResult = "deleted" | "anonymized";

const SQL_MISSING =
  "Suppression indisponible : le script SQL 031_delete_account.sql n'a pas encore été " +
  "exécuté sur ce projet Supabase.";

/** La RPC n'existe pas côté serveur (script SQL 031 non exécuté). */
function isMissingFunction(error: { code?: string; message?: string }): boolean {
  if (error.code === "PGRST202" || error.code === "42883") return true;
  return /could not find the function|function .* does not exist/i.test(error.message ?? "");
}

/**
 * Le rôle `postgres` n'a pas le droit d'écrire dans le schéma `auth` sur ce projet.
 * Rien n'a été supprimé (la RPC est transactionnelle) → on peut retenter via
 * l'Edge Function, qui dispose de la `service_role`.
 */
function isAuthPermissionError(error: { code?: string; message?: string }): boolean {
  if (error.code === "42501") return true;
  return /permission denied|insufficient privilege/i.test(error.message ?? "");
}

/**
 * Traduit les erreurs de l'Edge Function `delete-account`.
 *
 * `Failed to send a request to the Edge Function` (FunctionsFetchError) = la requête n'a même
 * pas abouti : dans 99 % des cas la fonction **n'est pas déployée** sur le projet Supabase
 * (le code vit dans `supabase/functions/`, il ne part PAS avec les fichiers SQL).
 */
export function mapDeleteAccountError(message: string): string {
  if (/failed to send a request|failed to fetch|networkerror/i.test(message)) {
    return "Suppression indisponible : la fonction serveur « delete-account » n'est pas déployée (voir docs/guides/ACCOUNT_DELETION.md).";
  }
  if (/non authentifié|session invalide/i.test(message)) {
    return "Session expirée — reconnecte-toi puis réessaie.";
  }
  return message;
}

/**
 * Supprime le compte de l'utilisateur courant, puis déconnecte localement.
 *
 * Chemin principal : la RPC `delete_my_account()` (SQL 031) fait tout en une
 * transaction — effacement réel des données, passation d'admin, suppression des
 * groupes vides et re-résolution des scrutins dont la majorité vient de changer.
 *
 * Repli : si ce projet n'autorise pas le rôle `postgres` à toucher au schéma
 * `auth`, la RPC échoue **sans rien avoir supprimé** et on repasse par l'Edge
 * Function, qui possède la `service_role`.
 *
 * Renvoie `'deleted'` (tout est effacé) ou `'anonymized'` (de l'argent est engagé
 * dans une cagnotte : la ligne est conservée, l'identité est effacée).
 */
export function useDeleteAccount() {
  return useMutation<DeleteAccountResult>({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("delete_my_account");

      let mode = data as DeleteAccountResult | null;

      if (error) {
        if (isMissingFunction(error)) throw new Error(SQL_MISSING);
        if (!isAuthPermissionError(error)) throw new Error(error.message);

        // Repli Edge Function (service_role).
        const { data: fnData, error: fnError } =
          await supabase.functions.invoke<{ mode?: DeleteAccountResult }>("delete-account");
        if (fnError) throw new Error(mapDeleteAccountError(fnError.message));
        mode = fnData?.mode ?? "deleted";
      }

      await supabase.auth.signOut();
      return mode ?? "deleted";
    },
  });
}
