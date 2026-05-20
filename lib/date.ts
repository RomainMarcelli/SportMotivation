/**
 * Helpers de dates. ⚠ Toujours raisonner en heure LOCALE (fuseau du membre, Europe/Paris par
 * défaut) et JAMAIS en UTC pour le calcul des semaines (lundi 00h00 → dimanche 23h59).
 */

/** Formate une Date en chaîne `YYYY-MM-DD` en utilisant les composantes locales (pas UTC). */
export function toDateOnly(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Retourne le lundi (00h00 local) de la semaine contenant `d`.
 * La semaine commence le lundi (ISO).
 */
export function startOfWeekMonday(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0 = dimanche, 1 = lundi, ...
  const diff = day === 0 ? -6 : 1 - day; // ramène au lundi
  date.setDate(date.getDate() + diff);
  return date;
}

/** Chaîne `YYYY-MM-DD` du lundi de la semaine contenant `d`. */
export function weekStartString(d: Date): string {
  return toDateOnly(startOfWeekMonday(d));
}

/** Formate une plage de dates pour affichage : "1 juin → 31 août 2026". */
export function formatDateRange(start: Date, end: Date): string {
  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
  const fmtFull = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${fmt.format(start)} → ${fmtFull.format(end)}`;
}

/** Formate une date `YYYY-MM-DD` (string DB) pour affichage court : "1 juin 2026". */
export function formatDbDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
