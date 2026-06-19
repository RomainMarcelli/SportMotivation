/**
 * Stats hebdomadaires d'un groupe, calculées **côté client** depuis le fil des séances
 * (`useGroupSessions`) + la liste des membres (`useGroupMembers`). Pas d'import RN → testable.
 * Semaine = lundi→dimanche (cf. `lib/date`). « Fait » = séance **validée**.
 */
import { startOfWeekMonday, toDateOnly } from "@/lib/date";

export type StatSession = { author: { id: string }; status: string; performed_at: string };

/** `performed_at` (date ou timestamp) tombe-t-il dans la semaine ISO de `now` ? */
export function isPerformedThisWeek(performedAt: string, now: Date): boolean {
  const ws = startOfWeekMonday(now);
  const weEnd = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 6);
  const day = performedAt.slice(0, 10); // "YYYY-MM-DD"
  return day >= toDateOnly(ws) && day <= toDateOnly(weEnd);
}

/** Nombre de séances **validées** d'un membre cette semaine. */
export function validatedThisWeek(
  sessions: readonly StatSession[],
  userId: string,
  now: Date
): number {
  return sessions.filter(
    (s) =>
      s.author.id === userId && s.status === "validated" && isPerformedThisWeek(s.performed_at, now)
  ).length;
}

export type MemberStat<M> = { member: M; done: number; target: number; ratio: number };

/** Progression hebdo (fait/objectif) de chaque membre. */
export function memberStats<M extends { user: { id: string }; weeklyTarget: number }>(
  members: readonly M[],
  sessions: readonly StatSession[],
  now: Date
): MemberStat<M>[] {
  return members.map((member) => {
    const done = validatedThisWeek(sessions, member.user.id, now);
    const target = member.weeklyTarget;
    return { member, done, target, ratio: target > 0 ? Math.min(1, done / target) : 0 };
  });
}

/** Membres classés par séances faites (puis par ratio) décroissant — classement de la semaine. */
export function rankedMemberStats<M extends { user: { id: string }; weeklyTarget: number }>(
  members: readonly M[],
  sessions: readonly StatSession[],
  now: Date
): MemberStat<M>[] {
  return [...memberStats(members, sessions, now)].sort(
    (a, b) => b.done - a.done || b.ratio - a.ratio
  );
}

/** Progression cumulée du groupe cette semaine (somme des faits / somme des objectifs). */
export function groupWeeklyProgress<M extends { user: { id: string }; weeklyTarget: number }>(
  members: readonly M[],
  sessions: readonly StatSession[],
  now: Date
): { done: number; target: number } {
  const stats = memberStats(members, sessions, now);
  return {
    done: stats.reduce((sum, s) => sum + s.done, 0),
    target: stats.reduce((sum, s) => sum + s.target, 0),
  };
}
