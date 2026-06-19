/**
 * Helper pur du `Stepper` (pas d'import RN → testable). Incrémente/décrémente une valeur
 * en restant bornée [min, max].
 */
export function stepValue(
  value: number,
  direction: "inc" | "dec",
  opts: { min: number; max: number; step: number }
): number {
  const next = direction === "inc" ? value + opts.step : value - opts.step;
  return Math.min(opts.max, Math.max(opts.min, next));
}
