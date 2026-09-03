import {
  buildGroupStreak,
  computeStreak,
  effectiveTarget,
  weekOutcome,
  type WeeklyOutcomeRow,
} from "../streak-logic";

describe("effectiveTarget", () => {
  it("retire les excuses standard, plancher à 0", () => {
    expect(effectiveTarget(3)).toBe(3);
    expect(effectiveTarget(3, 1)).toBe(2);
    expect(effectiveTarget(3, 5)).toBe(0);
  });
});

describe("weekOutcome — classification métier", () => {
  it("objectif atteint → success", () => {
    expect(weekOutcome({ initialTarget: 3, validated: 3 }).status).toBe("success");
    expect(weekOutcome({ initialTarget: 3, validated: 4 }).status).toBe("success");
  });

  it("objectif non atteint sans joker → fail", () => {
    expect(weekOutcome({ initialTarget: 3, validated: 1 }).status).toBe("fail");
    expect(weekOutcome({ initialTarget: 3, validated: 2 }).status).toBe("fail");
  });

  it("excuse standard réduit l'objectif → 2/2 réussie", () => {
    const r = weekOutcome({ initialTarget: 3, standardExcuses: 1, validated: 2 });
    expect(r.effectiveTarget).toBe(2);
    expect(r.status).toBe("success");
  });

  it("excuse majeure → neutral (jamais fail ni success)", () => {
    const r = weekOutcome({ initialTarget: 3, majorExcuse: true, validated: 0 });
    expect(r.status).toBe("neutral");
    expect(r.neutralReason).toBe("major_excuse");
  });

  it("suspension → neutral", () => {
    const r = weekOutcome({ initialTarget: 3, suspended: true, validated: 0 });
    expect(r.status).toBe("neutral");
    expect(r.neutralReason).toBe("suspension");
  });

  it("hors période → neutral", () => {
    const r = weekOutcome({ initialTarget: 3, validated: 0, inPeriod: false });
    expect(r.status).toBe("neutral");
    expect(r.neutralReason).toBe("out_of_period");
  });

  describe("joker = neutral, jamais success", () => {
    it("manque de 1 couvert par un joker → neutral", () => {
      const r = weekOutcome({ initialTarget: 3, validated: 2, jokerAvailable: true });
      expect(r.status).toBe("neutral");
      expect(r.neutralReason).toBe("joker");
      expect(r.jokerUsed).toBe(true);
    });

    it("manque de 2 → le joker (qui n'annule qu'1) ne suffit pas → fail", () => {
      const r = weekOutcome({ initialTarget: 3, validated: 1, jokerAvailable: true });
      expect(r.status).toBe("fail");
      expect(r.jokerUsed).toBe(true);
    });

    it("sans joker disponible, manque de 1 → fail", () => {
      expect(weekOutcome({ initialTarget: 3, validated: 2, jokerAvailable: false }).status).toBe("fail");
    });

    it("objectif atteint : le joker n'est pas consommé, reste success", () => {
      const r = weekOutcome({ initialTarget: 3, validated: 3, jokerAvailable: true });
      expect(r.status).toBe("success");
      expect(r.jokerUsed).toBe(false);
    });
  });
});

/** Fabrique une ligne d'historique (le weekStart n'a d'importance que pour l'ordre). */
function wk(weekStart: string, status: WeeklyOutcomeRow["status"]): WeeklyOutcomeRow {
  return { weekStart, status };
}

describe("computeStreak — depuis l'historique", () => {
  it("✅ ✅ ✅ = streak 3", () => {
    const r = computeStreak([wk("2026-08-03", "success"), wk("2026-08-10", "success"), wk("2026-08-17", "success")]);
    expect(r.currentStreak).toBe(3);
    expect(r.bestStreak).toBe(3);
    expect(r.lastSuccessWeek).toBe("2026-08-17");
  });

  it("✅ ❌ ✅ = streak 1 (mais record 1)", () => {
    const r = computeStreak([wk("2026-08-03", "success"), wk("2026-08-10", "fail"), wk("2026-08-17", "success")]);
    expect(r.currentStreak).toBe(1);
    expect(r.bestStreak).toBe(1);
  });

  it("✅ neutralisée ✅ = streak 2 (la neutre est ignorée)", () => {
    const r = computeStreak([wk("2026-08-03", "success"), wk("2026-08-10", "neutral"), wk("2026-08-17", "success")]);
    expect(r.currentStreak).toBe(2);
    expect(r.bestStreak).toBe(2);
  });

  it("le record survit à une remise à zéro", () => {
    const r = computeStreak([
      wk("2026-06-01", "success"),
      wk("2026-06-08", "success"),
      wk("2026-06-15", "success"),
      wk("2026-06-22", "fail"),
      wk("2026-06-29", "success"),
    ]);
    expect(r.currentStreak).toBe(1);
    expect(r.bestStreak).toBe(3);
  });

  it("tri indépendant de l'ordre d'entrée", () => {
    const r = computeStreak([wk("2026-08-17", "success"), wk("2026-08-03", "success"), wk("2026-08-10", "success")]);
    expect(r.currentStreak).toBe(3);
  });

  it("historique vide → 0", () => {
    expect(computeStreak([]).currentStreak).toBe(0);
  });
});

describe("buildGroupStreak — semaine en cours", () => {
  const history = [wk("2026-07-13", "success"), wk("2026-07-20", "success"), wk("2026-07-27", "success"), wk("2026-08-03", "success"), wk("2026-08-10", "success")];

  it("historique 5, semaine en cours 1/3 → currentStreak = 5 (pas cassé)", () => {
    const r = buildGroupStreak({ closedOutcomes: history, currentWeek: { initialTarget: 3, validated: 1 } });
    expect(r.currentStreak).toBe(5);
    expect(r.currentWeekCompleted).toBe(false);
    expect(r.remainingSessions).toBe(2);
  });

  it("historique 5, semaine en cours 3/3 → currentStreak = 6 immédiatement", () => {
    const r = buildGroupStreak({ closedOutcomes: history, currentWeek: { initialTarget: 3, validated: 3 } });
    expect(r.currentStreak).toBe(6);
    expect(r.currentWeekCompleted).toBe(true);
    expect(r.remainingSessions).toBe(0);
  });

  it("le joker de la semaine en cours n'ajoute PAS +1 (ignoré en live)", () => {
    const r = buildGroupStreak({
      closedOutcomes: history,
      currentWeek: { initialTarget: 3, validated: 2, jokerAvailable: true },
    });
    expect(r.currentWeekCompleted).toBe(false);
    expect(r.currentStreak).toBe(5);
  });

  it("bestStreak reflète la semaine en cours si elle dépasse le record clôturé", () => {
    const r = buildGroupStreak({ closedOutcomes: history, currentWeek: { initialTarget: 3, validated: 3 } });
    expect(r.bestStreak).toBe(6);
  });

  it("n'incrémente pas deux fois une semaine courante déjà clôturée", () => {
    const currentWeekStart = "2026-08-17";
    const r = buildGroupStreak({
      closedOutcomes: [...history, wk(currentWeekStart, "success")],
      currentWeekStart,
      currentWeek: { initialTarget: 3, validated: 3 },
    });
    expect(r.currentStreak).toBe(6);
  });
});
