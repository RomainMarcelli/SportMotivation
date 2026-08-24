/**
 * Logique de SUSPENSION (pure, RN-free, testable). Un membre suspendu est exonéré
 * de tout (blâmes ET pénalités « séance manquée ») sur une période à date de fin
 * définie. Ces helpers ne font QUE de l'affichage / validation de formulaire ; la
 * vérité (exonération) est côté serveur (`is_suspended`, SQL 052/053/054).
 */

import { formatDbDate } from "@/lib/date";

export type SuspensionStatus = "pending" | "active" | "rejected" | "cancelled";
export type SuspensionOrigin = "admin" | "request";

/** Ligne `suspensions` mappée en camelCase (voir SQL 052). */
export type Suspension = {
  id: string;
  groupId: string;
  userId: string;
  /** `YYYY-MM-DD` (bornes incluses). */
  startDate: string;
  endDate: string;
  reason: string | null;
  status: SuspensionStatus;
  origin: SuspensionOrigin;
  requestedBy: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionComment: string | null;
  createdAt: string;
};

/** Ligne brute renvoyée par Supabase (snake_case). */
export type SuspensionRow = {
  id: string;
  group_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: SuspensionStatus;
  origin: SuspensionOrigin;
  requested_by: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_comment: string | null;
  created_at: string;
};

export function mapSuspension(row: SuspensionRow): Suspension {
  return {
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    startDate: row.start_date,
    endDate: row.end_date,
    reason: row.reason,
    status: row.status,
    origin: row.origin,
    requestedBy: row.requested_by,
    decidedBy: row.decided_by,
    decidedAt: row.decided_at,
    decisionComment: row.decision_comment,
    createdAt: row.created_at,
  };
}

/** Normalise une date ISO éventuellement horodatée en `YYYY-MM-DD`. */
function dayOnly(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Une suspension ACTIVE couvre-t-elle la date `onISO` (bornes incluses) ?
 * Comparaison lexicale sûre car toutes les dates sont au format `YYYY-MM-DD`.
 */
export function isSuspendedOn(s: Suspension, onISO: string): boolean {
  if (s.status !== "active") return false;
  const on = dayOnly(onISO);
  return s.startDate <= on && on <= s.endDate;
}

/** La suspension active qui couvre `onISO`, ou `null`. */
export function activeSuspensionOn(list: Suspension[], onISO: string): Suspension | null {
  return list.find((s) => isSuspendedOn(s, onISO)) ?? null;
}

/** Un membre est-il suspendu aujourd'hui ? (liste de SES suspensions). */
export function isCurrentlySuspended(list: Suspension[], todayISO: string): boolean {
  return activeSuspensionOn(list, todayISO) !== null;
}

/** Les demandes en attente d'une décision de l'admin. */
export function pendingRequests(list: Suspension[]): Suspension[] {
  return list.filter((s) => s.status === "pending");
}

/** `29/07` à partir de `2026-07-29`. */
function ddmm(iso: string): string {
  const d = dayOnly(iso);
  return `${d.slice(8, 10)}/${d.slice(5, 7)}`;
}

/** « du 29/07 au 03/08 » (format court, pour une pastille). */
export function suspensionShortRange(startISO: string, endISO: string): string {
  return `du ${ddmm(startISO)} au ${ddmm(endISO)}`;
}

/** « 29 juillet 2026 → 3 août 2026 » (format long, pour un détail). */
export function suspensionFullRange(startISO: string, endISO: string): string {
  return `${formatDbDate(startISO)} → ${formatDbDate(endISO)}`;
}

/** Libellé de statut pour une pastille. */
export function suspensionStatusLabel(status: SuspensionStatus): string {
  switch (status) {
    case "pending":
      return "En attente";
    case "active":
      return "Suspendu";
    case "rejected":
      return "Refusée";
    case "cancelled":
      return "Levée";
  }
}

export type SuspensionFormInput = {
  startISO: string;
  endISO: string;
  reason: string;
};

/**
 * Valide une DEMANDE de suspension (côté joueur). Renvoie un message d'erreur en
 * français, ou `null` si tout est bon. Le motif est OBLIGATOIRE côté demande
 * (miroir du garde `REASON_REQUIRED` de `request_suspension`).
 */
export function suspensionRequestError(input: SuspensionFormInput): string | null {
  if (!input.startISO || !input.endISO) return "Choisis une date de début et de fin.";
  if (dayOnly(input.endISO) < dayOnly(input.startISO))
    return "La date de fin doit être après le début.";
  if (!input.reason.trim()) return "Explique le motif de ta demande.";
  return null;
}

const SUSPENSION_ERROR_MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: "Tu dois être connecté.",
  NOT_ADMIN: "Seul l'admin peut faire ça.",
  NOT_MEMBER: "Ce joueur n'est pas membre du groupe.",
  DATES_REQUIRED: "Choisis une date de début et de fin.",
  BAD_DATE_RANGE: "La date de fin doit être après le début.",
  REASON_REQUIRED: "Explique le motif de ta demande.",
  SUSPENSION_NOT_FOUND: "Suspension introuvable.",
  NOT_PENDING: "Cette demande a déjà été traitée.",
  NOT_ALLOWED: "Action non autorisée.",
};

/** Traduit un code d'erreur des RPC de suspension en message lisible. */
export function mapSuspensionError(code: string): string {
  return SUSPENSION_ERROR_MESSAGES[code] ?? code;
}
