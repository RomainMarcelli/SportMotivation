/**
 * Calculs de l'accueil (purs, testables — aucun import React Native).
 *
 * Tout part du même jeu de séances : le hero, la phrase de motivation et
 * l'histogramme doivent raconter exactement la même chose.
 */

import { toDateOnly, startOfWeekMonday } from "@/lib/date";

export type HomeSession = {
  user_id: string;
  week_start: string;
  status: string;
  performed_at: string;
};

export type WeekStats = {
  /** Séances validées cette semaine. */
  done: number;
  /** Séances déclarées mais pas encore tranchées par le groupe. */
  pending: number;
  /** Objectif hebdomadaire du membre. */
  target: number;
  /** Ce qu'il reste à valider (jamais négatif). */
  remaining: number;
  /** 0 → 1, plafonné (une semaine à 150 % ne déborde pas de l'anneau). */
  ratio: number;
};

/** Bilan de MA semaine en cours dans un groupe. */
export function weekStats(
  sessions: HomeSession[],
  userId: string | undefined,
  weekStart: string,
  target: number
): WeekStats {
  const mine = userId
    ? sessions.filter((s) => s.user_id === userId && s.week_start === weekStart)
    : [];
  const done = mine.filter((s) => s.status === "validated").length;
  const pending = mine.filter((s) => s.status === "pending_vote").length;
  const safeTarget = Math.max(0, target);
  return {
    done,
    pending,
    target: safeTarget,
    remaining: Math.max(0, safeTarget - done),
    ratio: safeTarget === 0 ? 0 : Math.min(1, done / safeTarget),
  };
}

/**
 * Phrase sous « Salut X ». Elle doit être juste dans les cas limites : objectif
 * déjà atteint, dernière séance, ou semaine pas commencée.
 */
export function motivationLine(stats: WeekStats): string {
  if (stats.target === 0) return "Aucun objectif fixé cette semaine.";
  if (stats.remaining === 0) return "Objectif de la semaine atteint. Beau boulot !";
  if (stats.remaining === 1) return "Plus qu'une séance pour valider ta semaine.";
  return `Encore ${stats.remaining} séances pour valider ta semaine.`;
}

/** « J-47 » / « Dernier jour » / « Terminé ». */
export function countdownLabel(days: number): string {
  if (days < 0) return "Terminé";
  if (days === 0) return "Dernier jour";
  return `J-${days}`;
}

export type HistoryBar = {
  /** `YYYY-MM-DD` du lundi. */
  weekStart: string;
  /** « 05.05 » ou « cette sem. ». */
  label: string;
  done: number;
  /** Hauteur relative 0 → 1. */
  ratio: number;
  current: boolean;
};

/**
 * Histogramme des N dernières semaines (la semaine en cours en dernier).
 *
 * Les semaines sans séance sont conservées : un trou est une information, le
 * masquer donnerait un graphe faussement régulier.
 */
export function historyBars(
  sessions: HomeSession[],
  userId: string | undefined,
  now: Date,
  target: number,
  weeks = 6
): HistoryBar[] {
  const monday = startOfWeekMonday(now);
  const counts = new Map<string, number>();

  if (userId) {
    for (const session of sessions) {
      if (session.user_id !== userId || session.status !== "validated") continue;
      counts.set(session.week_start, (counts.get(session.week_start) ?? 0) + 1);
    }
  }

  // L'échelle suit le meilleur score affiché, pour qu'une semaine à 6 séances
  // avec un objectif de 4 ne sorte pas du cadre.
  const bars: Omit<HistoryBar, "ratio">[] = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const day = new Date(monday);
    day.setDate(day.getDate() - i * 7);
    const key = toDateOnly(day);
    bars.push({
      weekStart: key,
      label: i === 0 ? "cette sem." : `${pad(day.getDate())}.${pad(day.getMonth() + 1)}`,
      done: counts.get(key) ?? 0,
      current: i === 0,
    });
  }

  const scale = Math.max(target, ...bars.map((b) => b.done), 1);
  return bars.map((b) => ({ ...b, ratio: b.done / scale }));
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** « aujourd'hui », « hier », sinon le jour de la semaine puis la date. */
export function relativeDay(dateStr: string, now: Date): string {
  const performed = new Date(dateStr);
  if (Number.isNaN(performed.getTime())) return "";
  const a = new Date(performed.getFullYear(), performed.getMonth(), performed.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = Math.round((b - a) / 86_400_000);
  if (diff === 0) return "aujourd'hui";
  if (diff === 1) return "hier";
  if (diff > 1 && diff < 7) {
    return ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"][
      performed.getDay()
    ];
  }
  return `${pad(performed.getDate())}.${pad(performed.getMonth() + 1)}`;
}
