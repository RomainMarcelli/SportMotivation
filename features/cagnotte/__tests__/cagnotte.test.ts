import {
  cagnotteTotals,
  formatEuro,
  groupHistoryByWeek,
  penaltyCountLabel,
  penaltyTypeLabel,
  unpaidMembers,
  weeksBetween,
  type CagnotteMember,
  type PenaltyHistoryItem,
} from "../cagnotte";

function member(over: Partial<CagnotteMember> = {}): CagnotteMember {
  return {
    userId: "u1",
    firstName: "Benjamin",
    lastName: null,
    username: null,
    avatarUrl: null,
    avatarColor: null,
    avatarIcon: null,
    role: "member",
    penaltyCount: 6,
    totalAmount: 30,
    paidAmount: 0,
    isPaid: false,
    ...over,
  };
}

describe("cagnotteTotals", () => {
  it("somme total / réglé / en attente et la part réglée", () => {
    const t = cagnotteTotals([
      member({ userId: "a", totalAmount: 30, paidAmount: 0, isPaid: false }),
      member({ userId: "b", totalAmount: 20, paidAmount: 20, isPaid: true }),
      member({ userId: "c", totalAmount: 10, paidAmount: 10, isPaid: true }),
    ]);
    expect(t.total).toBe(60);
    expect(t.paid).toBe(30);
    expect(t.pending).toBe(30);
    expect(t.paidRatio).toBeCloseTo(0.5, 5);
  });

  it("part réglée = 0 quand la cagnotte est vide (pas de division par zéro)", () => {
    expect(cagnotteTotals([]).paidRatio).toBe(0);
    expect(cagnotteTotals([]).total).toBe(0);
  });

  it("ne rend jamais un « en attente » négatif", () => {
    // Sécurité : si un cumul de flottants dépassait le total, pending reste ≥ 0.
    const t = cagnotteTotals([member({ totalAmount: 10, paidAmount: 10.0000001 })]);
    expect(t.pending).toBe(0);
  });
});

describe("unpaidMembers", () => {
  it("ne garde que les membres non entièrement réglés", () => {
    const list = [
      member({ userId: "a", isPaid: false }),
      member({ userId: "b", isPaid: true }),
      member({ userId: "c", isPaid: false }),
    ];
    expect(unpaidMembers(list).map((m) => m.userId)).toEqual(["a", "c"]);
  });
});

describe("penaltyCountLabel", () => {
  it("accorde le pluriel", () => {
    expect(penaltyCountLabel(1)).toBe("1 pénalité");
    expect(penaltyCountLabel(3)).toBe("3 pénalités");
  });
});

describe("penaltyTypeLabel", () => {
  it("distingue séance manquée et vote manqué (blâme)", () => {
    expect(penaltyTypeLabel("missed_session")).toBe("Séance manquée");
    expect(penaltyTypeLabel("blame_threshold")).toBe("Vote manqué");
  });
});

describe("formatEuro", () => {
  it("entier sans décimales", () => {
    expect(formatEuro(5)).toBe("5 €");
    expect(formatEuro(0)).toBe("0 €");
    expect(formatEuro(30)).toBe("30 €");
  });
  it("décimales à la française (virgule)", () => {
    expect(formatEuro(12.5)).toBe("12,50 €");
    expect(formatEuro(2.4)).toBe("2,40 €");
  });
  it("arrondit les sommes de flottants", () => {
    expect(formatEuro(4.999999999)).toBe("5 €");
  });
});

describe("weeksBetween", () => {
  it("compte les semaines entre deux lundis", () => {
    expect(weeksBetween("2026-07-20", "2026-07-20")).toBe(0);
    expect(weeksBetween("2026-07-13", "2026-07-20")).toBe(1);
    expect(weeksBetween("2026-06-29", "2026-07-20")).toBe(3);
  });
});

describe("groupHistoryByWeek", () => {
  const NOW_WEEK = "2026-07-20"; // lundi courant

  function pen(over: Partial<PenaltyHistoryItem> = {}): PenaltyHistoryItem {
    return {
      id: "p1",
      userId: "u1",
      firstName: "Benjamin",
      username: null,
      penaltyType: "missed_session",
      amount: 5,
      weekStart: NOW_WEEK,
      createdAt: "2026-07-20T10:00:00Z",
      ...over,
    };
  }

  it("regroupe par semaine, de la plus récente à la plus ancienne", () => {
    const groups = groupHistoryByWeek(
      [
        pen({ id: "a", weekStart: "2026-07-06" }),
        pen({ id: "b", weekStart: "2026-07-20" }),
        pen({ id: "c", weekStart: "2026-07-13" }),
        pen({ id: "d", weekStart: "2026-07-20" }),
      ],
      NOW_WEEK
    );
    expect(groups.map((g) => g.weekStart)).toEqual(["2026-07-20", "2026-07-13", "2026-07-06"]);
    // Les deux pénalités de la semaine courante sont bien dans le même groupe.
    expect(groups[0].items.map((i) => i.id)).toEqual(["b", "d"]);
  });

  it("libellés relatifs à la semaine courante", () => {
    const groups = groupHistoryByWeek(
      [
        pen({ weekStart: "2026-07-20" }),
        pen({ weekStart: "2026-07-13" }),
        pen({ weekStart: "2026-06-29" }),
      ],
      NOW_WEEK
    );
    expect(groups.map((g) => g.label)).toEqual([
      "Cette semaine",
      "Semaine dernière",
      "Il y a 3 semaines",
    ]);
  });

  it("liste vide → aucun groupe", () => {
    expect(groupHistoryByWeek([], NOW_WEEK)).toEqual([]);
  });
});
