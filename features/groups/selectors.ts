/**
 * Sélecteurs purs dérivés de la liste `useMyGroups` (pas d'import RN → testables).
 * Génériques sur la forme minimale nécessaire pour rester faciles à tester.
 */

type WithStatusId = { group: { id: string; status: string } };

/**
 * Groupe « actif » à mettre en avant sur l'accueil : le 1er en statut `active`,
 * sinon le 1er de la liste. `undefined` si aucun groupe.
 */
export function pickActiveGroup<T extends WithStatusId>(groups: T[] | undefined): T | undefined {
  if (!groups || groups.length === 0) return undefined;
  return groups.find((g) => g.group.status === "active") ?? groups[0];
}

/** Vue de l'onglet Groupes selon le nombre de défis. */
export type GroupsView =
  | { kind: "empty" }
  | { kind: "single"; groupId: string }
  | { kind: "list" };

/**
 * Décide ce qu'affiche l'onglet Groupes :
 * - 0 défi → état vide ;
 * - 1 défi → redirection directe vers son détail ;
 * - 2+ → liste.
 */
export function groupsView<T extends { group: { id: string } }>(
  groups: T[] | undefined
): GroupsView {
  const list = groups ?? [];
  if (list.length === 0) return { kind: "empty" };
  if (list.length === 1) return { kind: "single", groupId: list[0].group.id };
  return { kind: "list" };
}
