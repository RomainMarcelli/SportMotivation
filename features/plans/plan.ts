/**
 * Helpers purs du « plan de la semaine » (weekly_plans). Pas d'import RN → testable.
 * Les jours sont indexés 0 = lundi … 6 = dimanche (semaine ISO, cf. `lib/date`).
 */

/** Libellés courts des jours, lundi → dimanche. */
export const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"] as const;

/** Indice du jour courant (0 = lundi … 6 = dimanche) à partir d'une `Date` locale. */
export function todayWeekdayIndex(now: Date): number {
  const d = now.getDay(); // 0 = dimanche
  return d === 0 ? 6 : d - 1;
}

/**
 * Bascule l'appartenance d'un jour au plan : ajoute s'il est absent, retire sinon.
 * Retourne un nouveau tableau trié (immuable).
 */
export function togglePlannedDay(days: readonly number[], index: number): number[] {
  return days.includes(index)
    ? days.filter((d) => d !== index)
    : [...days, index].sort((a, b) => a - b);
}

/**
 * Normalise un `planned_days` (Json libre venant de la DB) en `number[]` valide 0–6,
 * dédupliqué et trié. Tolère `null`, valeurs hors borne ou non numériques.
 */
export function normalizePlannedDays(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const valid = raw
    .map((v) => (typeof v === "number" ? v : Number(v)))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  return [...new Set(valid)].sort((a, b) => a - b);
}
