/** Formatages de l'écran Profil (purs, testables). */

const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
] as const;

/**
 * « Membre depuis mars 2026 ».
 * On formate à la main plutôt qu'avec `Intl` : le rendu de `toLocaleDateString`
 * varie selon le moteur JS (Hermes / JSC / navigateur), donc selon la plateforme.
 */
export function memberSince(createdAt: string | null | undefined): string | null {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return `Membre depuis ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** « @romz » — rien du tout si le pseudo est vide (jamais un « @ » orphelin). */
export function handle(username: string | null | undefined): string | null {
  const value = (username ?? "").trim();
  return value ? `@${value}` : null;
}

/** Montant en euros, sans décimale inutile : 5 → « 5 € », 5.5 → « 5,50 € ». */
export function euros(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return "0 €";
  return Number.isInteger(value)
    ? `${value} €`
    : `${value.toFixed(2).replace(".", ",")} €`;
}

/** « 1 défi » / « 3 défis » — le pluriel doit suivre. */
export function challengeCount(count: number): string {
  return count <= 1 ? `${count} défi` : `${count} défis`;
}

/** Première lettre du nom du groupe pour la tuile carrée (jamais vide). */
export function groupTile(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed[0].toUpperCase() : "?";
}
