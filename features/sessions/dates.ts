/**
 * Helpers de dates pour la déclaration d'une séance (logique pure, testable).
 *
 * Règle métier : on ne peut déclarer une séance que dans la **semaine en cours**
 * (lundi 00h00 → dimanche), et **jamais dans le futur** (donc au plus tard aujourd'hui).
 * Anti-fraude : la date d'une preuve (photo EXIF / activité Strava) doit tomber le **même
 * jour** que la date déclarée.
 */

import { startOfWeekMonday } from "@/lib/date";

/** Fin de journée locale (23h59:59.999) de `d`. */
export function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/** Bornes sélectionnables : lundi 00h00 de la semaine de `now` → fin de la journée de `now`. */
export function declarableDateRange(now: Date): { min: Date; max: Date } {
  return { min: startOfWeekMonday(now), max: endOfDay(now) };
}

/** La date déclarée est-elle dans la semaine en cours (lundi→dimanche) et pas dans le futur ? */
export function isDeclarableDate(date: Date, now: Date): boolean {
  const { min, max } = declarableDateRange(now);
  const t = date.getTime();
  return t >= min.getTime() && t <= max.getTime();
}

/** Vrai si deux dates tombent le même jour (composantes locales). */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export type ProofDateCheck = { ok: boolean; reason: "match" | "missing" | "mismatch" };

/**
 * Compare la date d'une preuve avec la date déclarée.
 * `missing` = pas de date exploitable (ex. web sans EXIF) ; `mismatch` = jour différent.
 */
export function checkProofDate(proofDate: Date | null | undefined, declared: Date): ProofDateCheck {
  if (!proofDate) return { ok: false, reason: "missing" };
  return isSameLocalDay(proofDate, declared)
    ? { ok: true, reason: "match" }
    : { ok: false, reason: "mismatch" };
}

function pickString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

/**
 * Extrait la date de prise de vue depuis les métadonnées EXIF d'un asset
 * (`expo-image-picker` avec `exif: true`). Le format EXIF est "YYYY:MM:DD HH:MM:SS"
 * (champ `DateTimeOriginal`). Renvoie `null` si absente/illisible (fréquent sur web).
 */
export function parseExifDate(exif: Record<string, unknown> | null | undefined): Date | null {
  if (!exif) return null;
  const nested = exif["{Exif}"];
  const raw =
    pickString(exif.DateTimeOriginal) ??
    pickString(exif.DateTimeDigitized) ??
    pickString(exif.DateTime) ??
    pickString(
      nested && typeof nested === "object"
        ? (nested as Record<string, unknown>).DateTimeOriginal
        : undefined
    );
  if (!raw) return null;

  const m = raw.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (m) {
    return new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4]),
      Number(m[5]),
      Number(m[6])
    );
  }
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : new Date(t);
}
