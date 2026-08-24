/**
 * Calculs de l'accueil (purs, testables — aucun import React Native).
 *
 * Tout part du même jeu de séances : le hero, la phrase de motivation et
 * l'histogramme doivent raconter exactement la même chose.
 */

import { toDateOnly, startOfWeekMonday, weekStartString } from "@/lib/date";

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

/* ------------------------------------------------------- « Ma semaine » réel */

/** Les trois états d'une séance qu'on veut refléter dans « Ma semaine ». */
export type DayStatus = "validated" | "pending_vote" | "rejected";

// Priorité si plusieurs séances tombent le même jour : une séance validée
// « gagne » sur une en attente, qui gagne sur une refusée.
const DAY_STATUS_RANK: Record<DayStatus, number> = {
  validated: 3,
  pending_vote: 2,
  rejected: 1,
};

/** Date locale → indice de jour 0 = lundi … 6 = dimanche (même repère que `plan.ts`). */
function weekdayIndex(d: Date): number {
  const day = d.getDay(); // 0 = dimanche
  return day === 0 ? 6 : day - 1;
}

/**
 * Statut RÉEL par jour de ma semaine en cours, pour superposer les séances
 * déclarées au planning manuel : une séance validée coche son jour, une séance
 * en attente le teinte, etc.
 *
 * C'est ce qui manquait — « Ma semaine » ne lisait que le planning (`weekly_plans`)
 * et ignorait les séances réellement faites : le jour d'une séance validée restait
 * « vide » comme si rien ne s'était passé.
 */
export function weekSessionStatuses(
  sessions: HomeSession[],
  userId: string | undefined,
  weekStart: string
): Record<number, DayStatus> {
  const out: Record<number, DayStatus> = {};
  if (!userId) return out;

  for (const s of sessions) {
    if (s.user_id !== userId || s.week_start !== weekStart) continue;
    const status = s.status as DayStatus;
    if (!DAY_STATUS_RANK[status]) continue; // ignore les statuts hors des 3 gérés (ex. « expired »)
    const day = new Date(s.performed_at);
    if (Number.isNaN(day.getTime())) continue;

    const idx = weekdayIndex(day);
    const prev = out[idx];
    if (!prev || DAY_STATUS_RANK[status] > DAY_STATUS_RANK[prev]) out[idx] = status;
  }
  return out;
}

/* --------------------------------------------------------------- Historique */

export type HistoryGranularity = "day" | "week" | "month";

export type HistoryBar = {
  /** Clé unique de la période (`YYYY-MM-DD` ou `YYYY-MM`). */
  key: string;
  /** Libellé court affiché sous la barre. */
  label: string;
  done: number;
  /** Hauteur relative 0 → 1. */
  ratio: number;
  /** Période contenant « maintenant » (mise en avant + point de défilement). */
  current: boolean;
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

const MONTH_FMT = new Intl.DateTimeFormat("fr-FR", { month: "short" });

/**
 * Histogramme des séances validées, **borné à la période du défi** et à la
 * granularité choisie (jour / semaine / mois).
 *
 * Pourquoi borné au défi : afficher des semaines antérieures au début du défi
 * (vides par définition) n'apprend rien. On part donc de `from` (début du défi).
 * Les périodes à venir du défi sont conservées (barres vides) pour qu'on puisse
 * défiler en avant ; l'appelant fait défiler jusqu'à la période courante.
 *
 * En mode « jour », on ne remonte pas tout le défi (ça ferait 90 colonnes) : on
 * garde une fenêtre glissante des ~4 dernières semaines jusqu'à aujourd'hui.
 */
export function buildHistory(
  sessions: HomeSession[],
  userId: string | undefined,
  opts: {
    /** Début du défi. */
    from: Date;
    /** Fin du défi. */
    to: Date;
    now: Date;
    granularity: HistoryGranularity;
    /** Objectif hebdo — sert d'échelle en mode « semaine ». */
    target?: number;
  }
): HistoryBar[] {
  const { from, to, now, granularity, target = 0 } = opts;
  const mine = userId
    ? sessions.filter((s) => s.user_id === userId && s.status === "validated")
    : [];

  type Raw = { key: string; label: string; done: number; current: boolean };
  const raw: Raw[] = [];

  if (granularity === "week") {
    const nowKey = weekStartString(now);
    let cursor = startOfWeekMonday(from);
    const last = startOfWeekMonday(to);
    // Garde-fou : un intervalle absurde ne doit pas boucler à l'infini.
    for (let i = 0; i < 260 && cursor.getTime() <= last.getTime(); i += 1) {
      const key = toDateOnly(cursor);
      const current = key === nowKey;
      raw.push({
        key,
        label: current ? "cette sem." : `${pad(cursor.getDate())}.${pad(cursor.getMonth() + 1)}`,
        done: mine.filter((s) => s.week_start === key).length,
        current,
      });
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + 7);
    }
  } else if (granularity === "month") {
    let cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const last = new Date(to.getFullYear(), to.getMonth(), 1);
    for (let i = 0; i < 120 && cursor.getTime() <= last.getTime(); i += 1) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      raw.push({
        key: `${y}-${pad(m + 1)}`,
        label: MONTH_FMT.format(cursor).replace(".", ""),
        done: mine.filter((s) => {
          const d = new Date(s.performed_at);
          return d.getFullYear() === y && d.getMonth() === m;
        }).length,
        current: y === now.getFullYear() && m === now.getMonth(),
      });
      cursor = new Date(y, m + 1, 1);
    }
  } else {
    // Jour : fenêtre des 28 derniers jours jusqu'à aujourd'hui, sans sortir du défi.
    const today = startOfDay(now);
    const windowStart = new Date(today);
    windowStart.setDate(windowStart.getDate() - 27);
    let cursor =
      startOfDay(from).getTime() > windowStart.getTime() ? startOfDay(from) : windowStart;
    const last = startOfDay(to).getTime() < today.getTime() ? startOfDay(to) : today;
    const nowKey = toDateOnly(now);
    for (let i = 0; i < 92 && cursor.getTime() <= last.getTime(); i += 1) {
      const key = toDateOnly(cursor);
      const current = key === nowKey;
      raw.push({
        key,
        label: current ? "auj." : `${pad(cursor.getDate())}.${pad(cursor.getMonth() + 1)}`,
        done: mine.filter((s) => toDateOnly(new Date(s.performed_at)) === key).length,
        current,
      });
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  // Échelle : le meilleur score affiché (et l'objectif hebdo en mode semaine),
  // pour qu'une semaine à 6 séances avec un objectif de 4 ne déborde pas.
  const scaleTarget = granularity === "week" ? target : 0;
  const scale = Math.max(scaleTarget, ...raw.map((b) => b.done), 1);
  return raw.map((b) => ({ ...b, ratio: b.done / scale }));
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
