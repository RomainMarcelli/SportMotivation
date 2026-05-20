import * as Linking from "expo-linking";

/**
 * Construit un lien d'invitation profond vers l'écran de confirmation de jonction.
 * En dev : `exp://.../--/group/join-confirm?code=123456`
 * En prod : `sportmotiv://group/join-confirm?code=123456`
 */
export function buildInviteLink(code: string): string {
  return Linking.createURL("/group/join-confirm", { queryParams: { code } });
}

/**
 * Extrait un code d'invitation à 6 chiffres depuis une donnée scannée ou un lien.
 * Gère : code brut "123456", lien avec `?code=123456`, ou chemin se terminant par 6 chiffres.
 * Retourne null si aucun code valide n'est trouvé.
 */
export function parseInviteData(data: string): string | null {
  if (!data) return null;

  // 1. Paramètre de requête code=XXXXXX
  const queryMatch = data.match(/[?&]code=(\d{6})\b/);
  if (queryMatch) return queryMatch[1];

  // 2. Code brut (éventuellement avec espaces/tirets)
  const normalized = data.replace(/\D/g, "");
  if (/^\d{6}$/.test(normalized)) return normalized;

  // 3. Dernière séquence de 6 chiffres dans la chaîne (ex: .../join/123456)
  const all = data.match(/\d{6}/g);
  if (all && all.length > 0) return all[all.length - 1];

  return null;
}
