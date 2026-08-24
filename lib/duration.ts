/**
 * Calcul de la date de fin d'un défi à partir d'une date de début et d'une durée
 * (preset en mois, ou personnalisée jours/mois/années). Heure locale, minuit.
 */

export type DurationUnit = "jours" | "mois" | "annees";

export const DURATION_UNITS: DurationUnit[] = ["jours", "mois", "annees"];

/** Presets de durée proposés en chips (en mois). */
export const DURATION_PRESETS = [1, 2, 3, 6] as const;

export const DURATION_UNIT_LABELS: Record<DurationUnit, string> = {
  jours: "jours",
  mois: "mois",
  annees: "années",
};

/** Ajoute `value` × `unit` à `start` (minuit local) et renvoie la date de fin. */
export function addDuration(start: Date, value: number, unit: DurationUnit): Date {
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  if (unit === "jours") d.setDate(d.getDate() + value);
  else if (unit === "mois") d.setMonth(d.getMonth() + value);
  else d.setFullYear(d.getFullYear() + value);
  return d;
}

/** Date de fin pour un preset (en mois). */
export function endFromPreset(start: Date, months: number): Date {
  return addDuration(start, months, "mois");
}

/**
 * Durée d'une séance en toutes lettres : `45 min`, `1h`, `1h10`, `2h05`.
 *
 * Au-delà d'une heure, « 95 min » oblige à faire la division de tête. Les
 * minutes sont sur deux chiffres après l'heure (`2h05`, pas `2h5`) : c'est la
 * lecture d'un chrono, et ça évite de lire « 2h50 ».
 */
export function formatDuration(minutes: number | null | undefined): string {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  if (total < 60) return `${total} min`;

  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, "0")}`;
}
