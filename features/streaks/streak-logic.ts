/**
 * Logique de SÉRIE (streak) — pure et testable, MIROIR de la définition SQL.
 *
 * Une série est liée à un GROUPE (pas au compte). Définition UNIQUE d'une
 * « semaine réussie », partagée avec la clôture hebdo (`061_closure_writes_outcomes`)
 * et la RPC `get_group_streak` (`060_streak_tables`) :
 *
 *   neutral = suspension OU excuse majeure OU manque résiduel couvert par joker OU
 *             hors période de défi  → n'incrémente NI ne casse la série.
 *   success = validées >= objectif effectif (objectif − excuses standard), SANS joker.
 *   fail    = objectif effectif non atteint et pénalité « séance manquée » générée.
 *
 * Règle de la semaine EN COURS (affichage) : elle ne compte +1 que si l'objectif
 * EFFECTIF est réellement atteint SANS joker. Un joker éventuel n'est pris en compte
 * qu'à la clôture (il neutralise alors la semaine, il ne la fait jamais « réussir »).
 */

export type WeekStatus = "success" | "fail" | "neutral";

/** Entrées pour classer UNE semaine (membre × groupe × semaine). */
export type WeekOutcomeInput = {
  /** Objectif de base du membre (`group_members.weekly_target`). */
  initialTarget: number;
  /** Nombre d'excuses STANDARD acceptées cette semaine. */
  standardExcuses?: number;
  /** Une excuse MAJEURE acceptée cette semaine ? */
  majorExcuse?: boolean;
  /** Le membre est-il suspendu sur tout ou partie de la semaine ? */
  suspended?: boolean;
  /** Séances `validated` de la semaine. */
  validated: number;
  /**
   * Un joker mensuel non consommé est-il disponible pour neutraliser la semaine ?
   * Pertinent UNIQUEMENT à la clôture — laisser `false` pour la semaine en cours.
   */
  jokerAvailable?: boolean;
  /** La semaine tombe-t-elle dans la période du défi ? (défaut : oui) */
  inPeriod?: boolean;
};

export type WeekOutcome = {
  status: WeekStatus;
  /** Objectif effectif = max(0, objectif − excuses standard). */
  effectiveTarget: number;
  /** Renseigné quand `status === "neutral"`. */
  neutralReason?: "major_excuse" | "joker" | "suspension" | "out_of_period";
  /** Un joker a-t-il été utilisé pour neutraliser la semaine ? */
  jokerUsed: boolean;
};

/** Objectif effectif : l'objectif de base moins les excuses standard (plancher 0). */
export function effectiveTarget(initialTarget: number, standardExcuses = 0): number {
  return Math.max(0, initialTarget - standardExcuses);
}

/**
 * Classe une semaine en success / fail / neutral, selon la définition métier unique.
 * Le joker (si disponible) annule EXACTEMENT une séance manquée : il ne peut donc
 * neutraliser que si le manque résiduel vaut 1.
 */
export function weekOutcome(input: WeekOutcomeInput): WeekOutcome {
  const {
    initialTarget,
    standardExcuses = 0,
    majorExcuse = false,
    suspended = false,
    validated,
    jokerAvailable = false,
    inPeriod = true,
  } = input;

  const eff = effectiveTarget(initialTarget, standardExcuses);

  if (!inPeriod) return { status: "neutral", effectiveTarget: eff, neutralReason: "out_of_period", jokerUsed: false };
  if (suspended) return { status: "neutral", effectiveTarget: eff, neutralReason: "suspension", jokerUsed: false };
  if (majorExcuse) return { status: "neutral", effectiveTarget: eff, neutralReason: "major_excuse", jokerUsed: false };

  const miss = Math.max(0, eff - validated);
  if (miss === 0) return { status: "success", effectiveTarget: eff, jokerUsed: false };

  // Le joker annule 1 séance manquée : il ne neutralise que si le manque vaut 1.
  if (jokerAvailable && miss === 1) {
    return { status: "neutral", effectiveTarget: eff, neutralReason: "joker", jokerUsed: true };
  }
  return { status: "fail", effectiveTarget: eff, jokerUsed: false };
}

/** Une entrée d'historique (semaine clôturée). */
export type WeeklyOutcomeRow = { weekStart: string; status: WeekStatus };

export type StreakState = {
  /** Série à travers les semaines CLÔTURÉES fournies. */
  currentStreak: number;
  /** Record atteint sur l'historique fourni. */
  bestStreak: number;
  /** Dernière semaine `success` (ISO "YYYY-MM-DD") ou null. */
  lastSuccessWeek: string | null;
};

/**
 * Calcule la série depuis l'historique des semaines clôturées.
 * success → +1 (et record), fail → 0, neutral → inchangé.
 */
export function computeStreak(rows: WeeklyOutcomeRow[]): StreakState {
  const sorted = [...rows].sort((a, b) => (a.weekStart < b.weekStart ? -1 : a.weekStart > b.weekStart ? 1 : 0));
  let run = 0;
  let best = 0;
  let last: string | null = null;
  for (const r of sorted) {
    if (r.status === "success") {
      run += 1;
      best = Math.max(best, run);
      last = r.weekStart;
    } else if (r.status === "fail") {
      run = 0;
    }
    // "neutral" : série inchangée
  }
  return { currentStreak: run, bestStreak: best, lastSuccessWeek: last };
}

export type GroupStreak = {
  /** Série affichée = série clôturée (+1 si la semaine en cours est déjà réussie). */
  currentStreak: number;
  bestStreak: number;
  /** L'objectif effectif de la semaine en cours est-il atteint (sans joker) ? */
  currentWeekCompleted: boolean;
  /** Séances restantes pour valider la semaine en cours. */
  remainingSessions: number;
};

/**
 * Série AFFICHÉE : combine l'historique clôturé et la semaine en cours (live).
 * La semaine en cours n'ajoute +1 que si son objectif effectif est atteint SANS
 * joker (`jokerAvailable` est ignoré ici, on force `false`) — cf. règle métier.
 */
export function buildGroupStreak(params: {
  closedOutcomes: WeeklyOutcomeRow[];
  currentWeek: WeekOutcomeInput;
}): GroupStreak {
  const { currentStreak: base, bestStreak } = computeStreak(params.closedOutcomes);
  const live = weekOutcome({ ...params.currentWeek, jokerAvailable: false });
  const completed = live.status === "success";
  const currentStreak = base + (completed ? 1 : 0);
  return {
    currentStreak,
    bestStreak: Math.max(bestStreak, currentStreak),
    currentWeekCompleted: completed,
    remainingSessions: Math.max(0, live.effectiveTarget - params.currentWeek.validated),
  };
}
