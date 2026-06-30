/**
 * Joker (pur, testable). Règle métier : **1 joker par membre et par mois** pour annuler une séance
 * sans pénalité ni vote (excuse « gratuite »). On suit l'usage par mois calendaire LOCAL.
 * Les conséquences (séance exemptée) = Étape 9.
 */

/** Premier jour du mois (local) de `d`, au format `YYYY-MM-01`. Sert de clé d'usage mensuel. */
export function monthStartString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

/** Libellé court du mois (« juin », « décembre »…) pour l'UI. */
export function monthLabel(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(d);
}

/** Un joker du mois en cours a-t-il déjà été consommé ? (`usedMonthStart` = clé stockée ou null) */
export function isJokerUsed(usedMonthStart: string | null | undefined, now: Date): boolean {
  return !!usedMonthStart && usedMonthStart === monthStartString(now);
}
