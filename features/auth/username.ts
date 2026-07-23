import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

/**
 * Une violation de contrainte unique remonte sous des formes très différentes selon
 * l'étage qui la déclenche (trigger `auth`, RPC `upsert_my_profile`, insert direct).
 * On les regroupe ici plutôt que d'éparpiller des regex dans les écrans.
 */
export function isUsernameTakenError(error: {
  code?: string;
  message?: string;
  details?: string;
}): boolean {
  const haystack = `${error.message ?? ""} ${error.details ?? ""}`;
  if (error.code === "23505" && /username/i.test(haystack)) return true;
  return /username.*(already|exist|taken|unique|duplicate)|duplicate key.*username|users_username_key/i.test(
    haystack
  );
}

/**
 * L'e-mail est déjà rattaché à un compte.
 *
 * Volontairement plus strict que « ça parle de doublon » : un pseudo déjà pris
 * remonte lui aussi un message contenant « already », et l'annoncer comme un
 * problème d'e-mail envoyait le joueur corriger le mauvais champ.
 */
export function isEmailTakenError(error: { code?: string; message?: string }): boolean {
  if (error.code === "user_already_exists") return true;
  return /EMAIL_ALREADY_REGISTERED|user already registered|email address is already|email.*already.*(registered|taken|use)/i.test(
    error.message ?? ""
  );
}

/**
 * Disponibilité d'un pseudo (RPC `is_username_available`, SQL 033).
 *
 * Requête volontairement **optimiste** : si la RPC n'existe pas encore ou que le
 * réseau tousse, on renvoie `null` (« on ne sait pas ») plutôt que de bloquer le
 * formulaire. La contrainte unique en base reste le garde-fou.
 */
export function useUsernameAvailability(username: string) {
  const value = username.trim();
  return useQuery({
    queryKey: ["username-available", value.toLowerCase()],
    enabled: value.length >= 3,
    staleTime: 30_000,
    retry: false,
    queryFn: async (): Promise<boolean | null> => {
      const { data, error } = await supabase.rpc("is_username_available", {
        p_username: value,
      });
      if (error) return null;
      return data;
    },
  });
}
