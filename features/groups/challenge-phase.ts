/**
 * Phase d'un défi — **dérivée des dates**, pas du seul statut.
 *
 * Décision produit : un défi est `active` dès sa création (plus de phase « à venir » à lancer
 * à la main). Ce sont `challenge_start` / `challenge_end` qui disent où on en est :
 *   • aujourd'hui < début   → « À venir »   (le défi existe, on peut déjà rejoindre)
 *   • début ≤ aujourd'hui ≤ fin → « En cours »
 *   • aujourd'hui > fin      → « Terminé »
 *
 * Les pénalités suivent déjà cette logique côté serveur : la clôture hebdo (047) ne traite
 * que les semaines comprises dans [début, fin], donc rien ne « compte » avant la date de début,
 * même si le défi est actif. `completed`/`cancelled` (états serveur) priment sur les dates.
 *
 * Module pur (import `lib/date` uniquement) → testable, et source unique pour tous les écrans
 * qui affichent l'état d'un défi (accueil, aperçu d'adhésion, dashboard).
 */

import { daysUntil, formatDbDate } from "@/lib/date";

export type ChallengePhase = "upcoming" | "active" | "ended" | "cancelled";

export function challengePhase(
  status: string,
  challengeStart: string,
  challengeEnd: string,
  now: Date
): ChallengePhase {
  if (status === "cancelled") return "cancelled";
  // Clôturé côté serveur (déblocage cagnotte) → terminé, quelles que soient les dates.
  if (status === "completed") return "ended";
  // `setup` (ancien) comme `active` : la phase ne dépend que des dates.
  if (daysUntil(challengeEnd, now) < 0) return "ended";
  if (daysUntil(challengeStart, now) > 0) return "upcoming";
  return "active";
}

const PHASE_LABEL: Record<ChallengePhase, string> = {
  upcoming: "À venir",
  active: "En cours",
  ended: "Terminé",
  cancelled: "Annulé",
};

/** Libellé de badge pour une phase (« À venir » / « En cours » / « Terminé » / « Annulé »). */
export function challengePhaseLabel(phase: ChallengePhase): string {
  return PHASE_LABEL[phase];
}

/**
 * Sous-titre temporel d'une carte de défi (une ligne) :
 *   • à venir → « J-3 · début le 20 juillet 2026 »
 *   • en cours → « J-47 · fin le 31 août 2026 » (ou « Dernier jour · … »)
 *   • terminé → « Terminé le 31 août 2026 »
 *   • annulé → « 1 juin 2026 → 31 août 2026 »
 */
export function challengeTiming(
  status: string,
  challengeStart: string,
  challengeEnd: string,
  now: Date
): string {
  const phase = challengePhase(status, challengeStart, challengeEnd, now);
  if (phase === "upcoming") {
    return `J-${daysUntil(challengeStart, now)} · début le ${formatDbDate(challengeStart)}`;
  }
  if (phase === "active") {
    const left = daysUntil(challengeEnd, now);
    return left > 0
      ? `J-${left} · fin le ${formatDbDate(challengeEnd)}`
      : `Dernier jour · ${formatDbDate(challengeEnd)}`;
  }
  if (phase === "ended") return `Terminé le ${formatDbDate(challengeEnd)}`;
  return `${formatDbDate(challengeStart)} → ${formatDbDate(challengeEnd)}`;
}
