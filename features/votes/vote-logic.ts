/**
 * Logique de vote (pure, testable). Le scrutin valide/refuse une séance déclarée par un autre
 * membre. La résolution autoritaire est faite côté serveur (`cast_vote`) ; ces helpers servent
 * à l'affichage (compteur, délai) et reflètent la MÊME règle pour rester cohérents.
 */

import { endOfDay } from "@/features/sessions/dates";

export type VoteDeadlineType = "same_day" | "end_of_week";
export type VoteOutcome = "pending_vote" | "validated" | "rejected" | "expired";

/**
 * Date limite de vote selon la règle du groupe :
 * - `same_day` : fin de la journée de publication ;
 * - `end_of_week` : fin du dimanche de la semaine de la séance.
 */
export function voteDeadline(
  publishedAt: Date,
  weekStartISO: string,
  type: VoteDeadlineType
): Date {
  if (type === "end_of_week") {
    const [y, m, d] = weekStartISO.split("-").map(Number);
    const sunday = new Date(y, m - 1, d + 6); // lundi + 6 = dimanche
    return endOfDay(sunday);
  }
  return endOfDay(publishedAt);
}

/** Le délai de vote est-il écoulé ? */
export function isVoteExpired(deadline: Date, now: Date): boolean {
  return now.getTime() > deadline.getTime();
}

/** Seuil = majorité stricte des AUTRES membres (l'auteur ne vote pas sa séance). */
export function voteThreshold(otherMembers: number): number {
  if (otherMembers <= 0) return 1;
  return Math.floor(otherMembers / 2) + 1;
}

/**
 * Résolution basique d'un scrutin :
 * - oui ≥ seuil → validée ; non ≥ seuil → refusée ;
 * - sinon, si tout le monde a voté OU délai écoulé → majorité simple (0 vote → expirée) ;
 * - sinon → toujours en attente.
 */
export function resolveVote(opts: {
  yes: number;
  no: number;
  otherMembers: number;
  expired: boolean;
}): VoteOutcome {
  const { yes, no, otherMembers, expired } = opts;
  const threshold = voteThreshold(otherMembers);
  if (yes >= threshold) return "validated";
  if (no >= threshold) return "rejected";

  const everyoneVoted = otherMembers > 0 && yes + no >= otherMembers;
  if (everyoneVoted || expired) {
    if (yes === 0 && no === 0) return "expired";
    return yes >= no ? "validated" : "rejected";
  }
  return "pending_vote";
}

/** Libellé court du temps restant : "2 j", "5 h", "45 min", ou "Expiré". */
export function formatTimeRemaining(deadline: Date, now: Date): string {
  const ms = deadline.getTime() - now.getTime();
  if (ms <= 0) return "Expiré";
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor(totalMin / 60);
  if (days >= 1) return `${days} j`;
  if (hours >= 1) return `${hours} h`;
  return `${Math.max(1, totalMin)} min`;
}
