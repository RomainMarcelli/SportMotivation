import {
  countdownLabel,
  historyBars,
  motivationLine,
  relativeDay,
  weekStats,
  type HomeSession,
} from "../home-stats";

const ME = "user-1";
const WEEK = "2026-07-20"; // un lundi

function session(over: Partial<HomeSession> = {}): HomeSession {
  return {
    user_id: ME,
    week_start: WEEK,
    status: "validated",
    performed_at: "2026-07-21T10:00:00Z",
    ...over,
  };
}

describe("weekStats", () => {
  it("ne compte que MES séances validées de LA semaine", () => {
    const stats = weekStats(
      [
        session(),
        session(),
        session({ user_id: "autre" }), // pas moi
        session({ week_start: "2026-07-13" }), // pas cette semaine
        session({ status: "rejected" }), // pas validée
      ],
      ME,
      WEEK,
      4
    );
    expect(stats.done).toBe(2);
    expect(stats.remaining).toBe(2);
  });

  it("compte les séances en attente à part", () => {
    const stats = weekStats([session({ status: "pending_vote" }), session()], ME, WEEK, 3);
    expect(stats.done).toBe(1);
    expect(stats.pending).toBe(1);
  });

  // Dépasser son objectif ne doit pas faire déborder l'anneau.
  it("plafonne le ratio à 1", () => {
    const stats = weekStats([session(), session(), session()], ME, WEEK, 2);
    expect(stats.ratio).toBe(1);
    expect(stats.remaining).toBe(0);
  });

  it("ne divise jamais par zéro", () => {
    const stats = weekStats([session()], ME, WEEK, 0);
    expect(stats.ratio).toBe(0);
    expect(stats.remaining).toBe(0);
  });

  it("renvoie zéro sans utilisateur", () => {
    expect(weekStats([session()], undefined, WEEK, 4).done).toBe(0);
  });
});

describe("motivationLine", () => {
  const base = { done: 0, pending: 0, target: 4, remaining: 4, ratio: 0 };

  it("accorde le singulier sur la dernière séance", () => {
    expect(motivationLine({ ...base, remaining: 1 })).toBe(
      "Plus qu'une séance pour valider ta semaine."
    );
  });

  it("accorde le pluriel au-delà", () => {
    expect(motivationLine({ ...base, remaining: 3 })).toContain("Encore 3 séances");
  });

  it("félicite quand l'objectif est atteint", () => {
    expect(motivationLine({ ...base, remaining: 0, done: 4, ratio: 1 })).toContain("atteint");
  });

  it("gère l'absence d'objectif", () => {
    expect(motivationLine({ ...base, target: 0, remaining: 0 })).toContain("Aucun objectif");
  });
});

describe("countdownLabel", () => {
  it("affiche J-XX", () => {
    expect(countdownLabel(47)).toBe("J-47");
  });

  it("nomme le dernier jour au lieu de « J-0 »", () => {
    expect(countdownLabel(0)).toBe("Dernier jour");
  });

  it("gère un défi terminé", () => {
    expect(countdownLabel(-3)).toBe("Terminé");
  });
});

describe("historyBars", () => {
  const now = new Date(2026, 6, 22); // mercredi 22 juillet 2026

  it("renvoie le nombre de semaines demandé, la plus récente en dernier", () => {
    const bars = historyBars([], ME, now, 4, 6);
    expect(bars).toHaveLength(6);
    expect(bars[5].current).toBe(true);
    expect(bars[5].label).toBe("cette sem.");
    expect(bars[0].current).toBe(false);
  });

  it("compte les séances validées de chaque semaine", () => {
    const bars = historyBars([session(), session(), session({ week_start: "2026-07-13" })], ME, now, 4);
    const current = bars[bars.length - 1];
    expect(current.done).toBe(2);
    expect(bars[bars.length - 2].done).toBe(1);
  });

  // Une semaine vide reste affichée : c'est justement l'information utile.
  it("conserve les semaines à zéro", () => {
    const bars = historyBars([], ME, now, 4);
    expect(bars.every((b) => b.done === 0)).toBe(true);
    expect(bars).toHaveLength(6);
  });

  it("met l'échelle sur le meilleur score quand il dépasse l'objectif", () => {
    const bars = historyBars([session(), session(), session(), session()], ME, now, 2);
    expect(bars[bars.length - 1].ratio).toBe(1); // 4 séances / échelle 4
  });

  it("ignore les séances des autres et les non validées", () => {
    const bars = historyBars(
      [session({ user_id: "autre" }), session({ status: "pending_vote" })],
      ME,
      now,
      4
    );
    expect(bars.every((b) => b.done === 0)).toBe(true);
  });
});

describe("relativeDay", () => {
  const now = new Date(2026, 6, 22, 12, 0, 0);

  it("dit « aujourd'hui »", () => {
    expect(relativeDay(new Date(2026, 6, 22, 8, 0, 0).toISOString(), now)).toBe("aujourd'hui");
  });

  it("dit « hier »", () => {
    expect(relativeDay(new Date(2026, 6, 21, 8, 0, 0).toISOString(), now)).toBe("hier");
  });

  it("nomme le jour dans la semaine écoulée", () => {
    expect(relativeDay(new Date(2026, 6, 19, 8, 0, 0).toISOString(), now)).toBe("dimanche");
  });

  it("bascule sur une date au-delà d'une semaine", () => {
    expect(relativeDay(new Date(2026, 6, 1, 8, 0, 0).toISOString(), now)).toBe("01.07");
  });

  it("ne casse pas sur une date invalide", () => {
    expect(relativeDay("pas-une-date", now)).toBe("");
  });
});
