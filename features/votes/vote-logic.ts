/**
 * Logique de vote (pure, testable). Le scrutin valide/refuse une séance déclarée par un autre
 * membre. La résolution autoritaire est faite côté serveur (`cast_vote`) ; ces helpers servent
 * à l'affichage (compteur, délai) et reflètent la MÊME règle pour rester cohérents.
 */

import { endOfDay } from "@/features/sessions/dates";

export type VoteDeadlineType = "same_day" | "end_of_week";
export type VoteOutcome = "pending_vote" | "validated" | "rejected" | "expired";

/**
 * Échéance EFFECTIVE de vote (miroir de `session_effective_deadline`, SQL 054) :
 * `max(échéance nominale du groupe, publication + 24 h)`.
 * - nominale `same_day` : fin de la journée de publication ;
 * - nominale `end_of_week` : fin du dimanche de la semaine de la séance ;
 * - le filet +24 h garantit qu'une séance publiée tard laisse quand même 24 h
 *   pour voter (et, en `same_day`, revient à « au moins 24 h »).
 */
export function voteDeadline(
  publishedAt: Date,
  weekStartISO: string,
  type: VoteDeadlineType
): Date {
  let nominal: Date;
  if (type === "end_of_week") {
    const [y, m, d] = weekStartISO.split("-").map(Number);
    const sunday = new Date(y, m - 1, d + 6); // lundi + 6 = dimanche
    nominal = endOfDay(sunday);
  } else {
    nominal = endOfDay(publishedAt);
  }
  const floor = new Date(publishedAt.getTime() + 24 * 60 * 60 * 1000);
  return nominal.getTime() >= floor.getTime() ? nominal : floor;
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
 * Résolution d'un scrutin (miroir de `resolve_session`, SQL 054) :
 * - si TOUT LE MONDE a voté → on tranche à la majorité simple (égalité = validée) ;
 * - sinon, si l'échéance est atteinte → refus majoritaire → refusée, sinon
 *   VALIDÉE PAR DÉFAUT (plus de statut « expired ») ;
 * - sinon → en attente (on n'anticipe plus sur simple majorité : les non-votants
 *   doivent rester blâmables jusqu'à l'échéance).
 */
export function resolveVote(opts: {
  yes: number;
  no: number;
  otherMembers: number;
  expired: boolean;
}): VoteOutcome {
  const { yes, no, otherMembers, expired } = opts;
  const everyoneVoted = otherMembers > 0 && yes + no >= otherMembers;
  if (everyoneVoted) return yes >= no ? "validated" : "rejected";
  if (expired) return no >= voteThreshold(otherMembers) ? "rejected" : "validated";
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
