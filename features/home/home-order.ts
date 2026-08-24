/**
 * Ordonnancement des défis sur l'accueil (pur, testable — aucun import RN).
 *
 * L'utilisateur peut mettre en avant le défi de son choix (ex. « groupe 2 devant
 * groupe 1 »). On stocke une simple liste ordonnée d'identifiants ; ces deux
 * helpers l'appliquent et la modifient sans jamais muter les tableaux d'entrée.
 */

/**
 * Réordonne `ids` selon la préférence `order`.
 *
 * - Les identifiants présents dans `order` viennent en tête, dans l'ordre choisi.
 * - Un identifiant absent de `order` (défi rejoint après le dernier réglage)
 *   passe à la fin, en conservant son ordre d'origine — plutôt que de disparaître.
 * - Un identifiant de `order` qui n'existe plus (défi quitté) est simplement ignoré.
 */
export function orderGroups(ids: string[], order: string[]): string[] {
  const present = new Set(ids);
  const known = order.filter((id) => present.has(id));
  const knownSet = new Set(known);
  const rest = ids.filter((id) => !knownSet.has(id));
  return [...known, ...rest];
}

/**
 * Déplace `id` d'un cran dans la liste (`dir` = -1 vers le haut, +1 vers le bas).
 * Renvoie un NOUVEAU tableau ; inchangé si `id` est absent ou déjà à l'extrémité.
 */
export function moveInList(ids: string[], id: string, dir: -1 | 1): string[] {
  const i = ids.indexOf(id);
  if (i < 0) return ids;
  const j = i + dir;
  if (j < 0 || j >= ids.length) return ids;
  const next = ids.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
