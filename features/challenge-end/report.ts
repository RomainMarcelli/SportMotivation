/**
 * Fin de défi — logique pure du BILAN (classement final, stats perso, contributions).
 *
 * Tout se calcule côté client à partir de données déjà chargées ailleurs :
 *   • membres            → `useGroupMembers`  (objectif hebdo, profil)
 *   • séances du défi     → `useGroupSessions` (tout l'historique, pas juste la semaine)
 *   • résultats hebdo     → `member_weekly_outcomes` (success/fail/neutral)
 *   • registre pénalités  → `usePotHistory`    (qui a payé quoi, et pourquoi)
 *
 * On ne crée donc AUCUNE RPC de reporting : le backend de l'étape 12 se limite au
 * déblocage de la cagnotte (SQL 049). Les écrans `fin-defi` / `cloture` consomment
 * ces fonctions pures — d'où leur testabilité sans réseau ni React Native.
 *
 * Le taux et la série utilisent la même source de vérité que la clôture, le profil et
 * les badges : `member_weekly_outcomes`. Une semaine neutre (joker, excuse majeure ou
 * suspension) ne compte ni comme réussite ni comme échec et ne casse pas la série.
 */

import { formatDateRange, startOfWeekMonday } from "@/lib/date";

/* ------------------------------------------------------------------ entrées */

/** Un membre du défi (sous-ensemble RN-free de `GroupMemberWithUser`). */
export type ReportMember = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  avatarUrl: string | null;
  avatarColor: string | null;
  avatarIcon: string | null;
  /** Objectif hebdomadaire du membre (réglé par membre, cf. `group_members`). */
  weeklyTarget: number;
  role: string | null;
};

/** Une séance, réduite à ce dont le bilan a besoin. */
export type ReportSession = {
  /** Auteur de la séance. */
  userId: string;
  status: string;
  /** Lundi de la semaine de la séance (YYYY-MM-DD). */
  weekStart: string;
};

/** Résultat figé d'une semaine, écrit par la clôture hebdomadaire. */
export type ReportOutcome = {
  userId: string;
  weekStart: string;
  status: "success" | "fail" | "neutral";
};

/** Une pénalité du registre (séance manquée / blâme atteint). */
export type ReportPenalty = {
  userId: string;
  penaltyType: "missed_session" | "blame_threshold";
  amount: number;
};

/* ------------------------------------------------------- helpers de semaines */

// Parse « YYYY-MM-DD » en date LOCALE (pas UTC) : on compare des lundis, jamais des instants.
function parseYMD(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

/**
 * Nombre de semaines ISO couvertes par le défi, bornes incluses.
 * « 30 mai → 31 août » ⇒ 14 lundis couverts ⇒ 14 (jamais < 1).
 * On raisonne en lundis pour que le compte soit stable quel que soit le jour de début.
 */
export function challengeWeekCount(start: string, end: string): number {
  const s = startOfWeekMonday(parseYMD(start)).getTime();
  const e = startOfWeekMonday(parseYMD(end)).getTime();
  const weeks = Math.round((e - s) / (7 * 86_400_000)) + 1;
  return Math.max(1, weeks);
}

/* ------------------------------------------------------------------ compteurs */

/** Séances **validées** d'un membre sur tout le défi. */
export function validatedCount(sessions: readonly ReportSession[], userId: string): number {
  return sessions.filter((s) => s.userId === userId && s.status === "validated").length;
}

/** Total des séances validées du groupe (trio « séances » de la clôture). */
export function totalValidated(sessions: readonly ReportSession[]): number {
  return sessions.filter((s) => s.status === "validated").length;
}

/**
 * Taux de réussite en % (entier, borné 0→100) : validées / (objectif × semaines).
 * Objectif nul ou pas de semaines ⇒ 0 (pas de division par zéro, pas de NaN affiché).
 */
export function successRate(validated: number, weeklyTarget: number, weeks: number): number {
  const expected = weeklyTarget * weeks;
  if (expected <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((100 * validated) / expected)));
}

/** Taux métier : success / (success + fail), les semaines neutralisées sont exclues. */
export function outcomeSuccessRate(outcomes: readonly ReportOutcome[], userId: string): number {
  const decided = outcomes.filter(
    (o) => o.userId === userId && (o.status === "success" || o.status === "fail")
  );
  if (decided.length === 0) return 0;
  const successes = decided.filter((o) => o.status === "success").length;
  return Math.round((100 * successes) / decided.length);
}

/**
 * Record du défi selon les résultats figés : success → +1, fail → 0, neutral →
 * inchangé. C'est exactement la règle de `rebuild_member_group_progress`.
 */
export function bestWeeklyStreak(
  outcomes: readonly ReportOutcome[],
  userId: string
): number {
  const rows = outcomes
    .filter((o) => o.userId === userId)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  let best = 0;
  let run = 0;
  for (const row of rows) {
    if (row.status === "success") {
      run += 1;
      if (run > best) best = run;
    } else if (row.status === "fail") {
      run = 0;
    }
  }
  return best;
}

/** Total dû/contribué par un membre = somme de ses pénalités (alimente la cagnotte). */
export function contributedByMember(
  penalties: readonly ReportPenalty[],
  userId: string
): number {
  return penalties.reduce((sum, p) => (p.userId === userId ? sum + p.amount : sum), 0);
}

/* ------------------------------------------------------------ classement final */

export type RankedMember = {
  member: ReportMember;
  /** Rang (1 = meilleur). */
  rank: number;
  validated: number;
  rate: number;
  /** Euros versés à la cagnotte (somme des pénalités). */
  contributed: number;
};

/**
 * Classement final : du plus assidu au moins assidu.
 * Tri par TAUX ↓ (assiduité relative à l'objectif — juste quand les objectifs diffèrent
 * entre membres), puis séances validées ↓, puis nom ↑ (déterministe pour les tests).
 * Le rang est attribué APRÈS tri (1..N), sans gestion d'ex æquo (le podium reste lisible).
 */
export function finalRanking(
  members: readonly ReportMember[],
  sessions: readonly ReportSession[],
  penalties: readonly ReportPenalty[],
  outcomes: readonly ReportOutcome[]
): RankedMember[] {
  const rows = members.map((member) => {
    const validated = validatedCount(sessions, member.userId);
    return {
      member,
      rank: 0,
      validated,
      rate: outcomeSuccessRate(outcomes, member.userId),
      contributed: contributedByMember(penalties, member.userId),
    };
  });
  rows.sort(
    (a, b) =>
      b.rate - a.rate ||
      b.validated - a.validated ||
      displayNameOf(a.member).localeCompare(displayNameOf(b.member), "fr")
  );
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

/* ----------------------------------------------------------------- mon bilan */

export type MyBilan = {
  validated: number;
  bestStreak: number;
  rate: number;
  /** Euros versés à la cagnotte (mes pénalités). */
  paid: number;
};

/** Les 4 stats de « Ton bilan » (fin de défi) pour le membre courant. */
export function myBilan(
  member: ReportMember,
  sessions: readonly ReportSession[],
  penalties: readonly ReportPenalty[],
  outcomes: readonly ReportOutcome[]
): MyBilan {
  const validated = validatedCount(sessions, member.userId);
  return {
    validated,
    bestStreak: bestWeeklyStreak(outcomes, member.userId),
    rate: outcomeSuccessRate(outcomes, member.userId),
    paid: contributedByMember(penalties, member.userId),
  };
}

/* -------------------------------------------------- contributions (clôture) */

export type Contribution = {
  member: ReportMember;
  /** Nombre de séances manquées (pénalités `missed_session`). */
  missed: number;
  /** Nombre de blâmes convertis en pénalité (`blame_threshold`). */
  blames: number;
  /** Euros versés (somme des pénalités du membre). */
  total: number;
};

/**
 * « Qui a rempli la cagnotte » : membres ayant au moins une pénalité, du plus gros
 * contributeur au plus petit. On distingue séances manquées et blâmes pour libeller
 * fidèlement (« 12 séances manquées »), à partir du registre `penalties`.
 */
export function contributionBreakdown(
  members: readonly ReportMember[],
  penalties: readonly ReportPenalty[]
): Contribution[] {
  const byUser = new Map<string, { missed: number; blames: number; total: number }>();
  for (const p of penalties) {
    const acc = byUser.get(p.userId) ?? { missed: 0, blames: 0, total: 0 };
    if (p.penaltyType === "blame_threshold") acc.blames += 1;
    else acc.missed += 1;
    acc.total += p.amount;
    byUser.set(p.userId, acc);
  }
  const byId = new Map(members.map((m) => [m.userId, m]));
  const rows: Contribution[] = [];
  for (const [userId, acc] of byUser) {
    const member = byId.get(userId);
    if (!member) continue; // membre parti : on ne fabrique pas de ligne fantôme
    rows.push({ member, ...acc });
  }
  return rows.sort(
    (a, b) =>
      b.total - a.total ||
      displayNameOf(a.member).localeCompare(displayNameOf(b.member), "fr")
  );
}

/**
 * Sous-titre d'une contribution. Depuis 054, un blâme = un « vote manqué » (ne pas
 * voter une séance à temps) → on l'affiche ainsi plutôt que « blâme atteint ».
 */
export function contributionSubLabel(missed: number, blames: number): string {
  if (missed > 0 && blames === 0) return `${missed} séance${missed > 1 ? "s" : ""} manquée${missed > 1 ? "s" : ""}`;
  if (blames > 0 && missed === 0) return `${blames} vote${blames > 1 ? "s" : ""} manqué${blames > 1 ? "s" : ""}`;
  const n = missed + blames;
  return `${n} pénalité${n > 1 ? "s" : ""}`;
}

/* ------------------------------------------------------------------ libellés */

/** « Toi » pour soi, sinon prénom / pseudo / repli. */
export function reportName(member: ReportMember, meId: string | undefined): string {
  if (member.userId === meId) return "Toi";
  return member.firstName || member.username || "Membre";
}

// Nom neutre (sans « Toi ») pour un tri stable et reproductible dans les tests.
function displayNameOf(member: ReportMember): string {
  return member.firstName || member.username || member.userId;
}

/** En-tête du bilan : « 30 mai → 31 août 2026 · 14 semaines ». */
export function challengeRangeLabel(start: string, end: string): string {
  const range = formatDateRange(parseYMD(start), parseYMD(end));
  const weeks = challengeWeekCount(start, end);
  return `${range} · ${weeks} semaine${weeks > 1 ? "s" : ""}`;
}
