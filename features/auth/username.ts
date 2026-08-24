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

/**
 * Nettoie une base de pseudo pour en dériver des suggestions : ne garde que les
 * caractères autorisés (mêmes que le schéma d'inscription : `[a-zA-Z0-9_.-]`) et
 * borne la longueur pour laisser la place à un suffixe (30 caractères max au total).
 */
export function sanitizeUsernameBase(raw: string): string {
  return raw
    .trim()
    .replace(/[^a-zA-Z0-9_.-]/g, "")
    .slice(0, 26);
}

/**
 * Candidats de pseudo dérivés d'une base, par ordre de préférence. Suffixes
 * numériques (pas d'aléatoire → déterministe et testable). Tous garantis valides :
 * jeu de caractères du schéma et ≤ 30 caractères. Doublons de casse écartés.
 */
export function buildUsernameCandidates(base: string): string[] {
  const clean = sanitizeUsernameBase(base);
  if (clean.length < 2) return [];
  // Ordre de préférence : petits nombres d'abord, puis quelques plus grands en
  // repli si les premiers sont déjà pris.
  const suffixes = ["1", "2", "3", "4", "5", "7", "11", "23", "42", "99"];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of suffixes) {
    const cand = `${clean}${s}`;
    if (cand.length <= 30 && !seen.has(cand.toLowerCase())) {
      seen.add(cand.toLowerCase());
      out.push(cand);
    }
  }
  return out;
}

/**
 * Suggestions de pseudos DISPONIBLES à proposer quand le pseudo choisi est déjà
 * pris. On génère des variantes (base + suffixe) et on vérifie leur disponibilité
 * via la MÊME RPC que le champ (`is_username_available`, insensible à la casse),
 * toutes en parallèle. Renvoie les 3 premières libres, dans l'ordre de préférence.
 *
 * Best-effort : en cas d'erreur réseau on renvoie `[]` (le message « déjà pris »
 * reste affiché, simplement sans suggestion) — jamais de blocage du formulaire.
 * N'est déclenché (`enabled`) que lorsque le pseudo saisi est effectivement pris.
 */
export function useUsernameSuggestions(username: string, enabled: boolean) {
  const value = username.trim();
  return useQuery({
    queryKey: ["username-suggestions", value.toLowerCase()],
    enabled: enabled && sanitizeUsernameBase(value).length >= 2,
    staleTime: 30_000,
    retry: false,
    queryFn: async (): Promise<string[]> => {
      const candidates = buildUsernameCandidates(value);
      if (candidates.length === 0) return [];
      const checks = await Promise.all(
        candidates.map(async (cand) => {
          const { data, error } = await supabase.rpc("is_username_available", {
            p_username: cand,
          });
          return !error && data === true ? cand : null;
        })
      );
      return checks.filter((c): c is string => c !== null).slice(0, 3);
    },
  });
}
