import {
  bestWeeklyStreak,
  challengeRangeLabel,
  challengeWeekCount,
  contributedByMember,
  contributionBreakdown,
  contributionSubLabel,
  finalRanking,
  myBilan,
  outcomeSuccessRate,
  reportName,
  successRate,
  totalValidated,
  validatedCount,
  type ReportMember,
  type ReportOutcome,
  type ReportPenalty,
  type ReportSession,
} from "../report";

/* ------------------------------------------------------------------ fixtures */

// Défi de 4 semaines : lundis 04, 11, 18, 25 mai 2026 (le 31 est un dimanche).
const START = "2026-05-04";
const END = "2026-05-31";
const WEEKS = ["2026-05-04", "2026-05-11", "2026-05-18", "2026-05-25"];

function member(userId: string, weeklyTarget: number, firstName: string | null): ReportMember {
  return {
    userId,
    firstName,
    lastName: null,
    username: userId,
    avatarUrl: null,
    avatarColor: null,
    avatarIcon: null,
    weeklyTarget,
    role: userId === "me" ? "admin" : "member",
  };
}

// Fabrique `n` séances validées d'un membre sur une semaine donnée.
function done(userId: string, weekStart: string, n: number): ReportSession[] {
  return Array.from({ length: n }, () => ({ userId, status: "validated", weekStart }));
}

const alice = member("alice", 3, "Alice");
const bob = member("bob", 2, "Bob");
const me = member("me", 4, "Moi");
const MEMBERS = [alice, bob, me];

// alice : 3/3 chaque semaine (série 4, 12 validées, 100%)
// me    : 4,4,2,4 (série 2, 14 validées, 88%)
// bob   : 2,0,2,2 (série 2, 6 validées, 75%)
const SESSIONS: ReportSession[] = [
  ...WEEKS.flatMap((w) => done("alice", w, 3)),
  ...done("me", WEEKS[0], 4),
  ...done("me", WEEKS[1], 4),
  ...done("me", WEEKS[2], 2),
  ...done("me", WEEKS[3], 4),
  ...done("bob", WEEKS[0], 2),
  ...done("bob", WEEKS[2], 2),
  ...done("bob", WEEKS[3], 2),
  // Bruit : une refusée et une en attente ne comptent jamais comme réussies.
  { userId: "me", status: "rejected", weekStart: WEEKS[2] },
  { userId: "alice", status: "pending_vote", weekStart: WEEKS[3] },
];

const PENALTIES: ReportPenalty[] = [
  { userId: "me", penaltyType: "missed_session", amount: 5 },
  { userId: "me", penaltyType: "missed_session", amount: 5 },
  { userId: "me", penaltyType: "blame_threshold", amount: 5 },
  { userId: "bob", penaltyType: "missed_session", amount: 10 },
  { userId: "bob", penaltyType: "missed_session", amount: 10 },
  { userId: "bob", penaltyType: "missed_session", amount: 10 },
];

const OUTCOMES: ReportOutcome[] = [
  ...WEEKS.map((weekStart) => ({ userId: "alice", weekStart, status: "success" as const })),
  { userId: "me", weekStart: WEEKS[0], status: "success" },
  { userId: "me", weekStart: WEEKS[1], status: "success" },
  { userId: "me", weekStart: WEEKS[2], status: "fail" },
  { userId: "me", weekStart: WEEKS[3], status: "success" },
  { userId: "bob", weekStart: WEEKS[0], status: "success" },
  // Joker / excuse majeure / suspension : la semaine ne casse pas la série et
  // n'entre pas dans le taux d'objectifs atteints.
  { userId: "bob", weekStart: WEEKS[1], status: "neutral" },
  { userId: "bob", weekStart: WEEKS[2], status: "success" },
  { userId: "bob", weekStart: WEEKS[3], status: "success" },
];

/* -------------------------------------------------------------- semaines */

describe("challengeWeekCount", () => {
  it("compte les lundis couverts, bornes incluses", () => {
    expect(challengeWeekCount(START, END)).toBe(4);
  });
  it("un défi qui tient sur une seule semaine vaut 1", () => {
    expect(challengeWeekCount("2026-05-04", "2026-05-06")).toBe(1);
  });
  it("ne descend jamais sous 1, même si fin avant début", () => {
    expect(challengeWeekCount("2026-05-31", "2026-05-04")).toBeGreaterThanOrEqual(1);
  });
  it("gère les timestamps (tronque à la date)", () => {
    expect(challengeWeekCount("2026-05-04T10:00:00Z", "2026-05-31T23:59:59Z")).toBe(4);
  });
});

/* -------------------------------------------------------------- compteurs */

describe("validatedCount / totalValidated", () => {
  it("ne compte que les séances validées d'un membre", () => {
    expect(validatedCount(SESSIONS, "me")).toBe(14);
    expect(validatedCount(SESSIONS, "alice")).toBe(12);
    expect(validatedCount(SESSIONS, "bob")).toBe(6);
  });
  it("totalValidated = somme des validées du groupe", () => {
    expect(totalValidated(SESSIONS)).toBe(32);
  });
});

describe("successRate", () => {
  it("borne à 100 et arrondit", () => {
    expect(successRate(14, 4, 4)).toBe(88); // 14/16 = 87.5 → 88
    expect(successRate(12, 3, 4)).toBe(100);
    expect(successRate(20, 4, 4)).toBe(100); // dépassement borné
  });
  it("0 si objectif ou semaines nuls (pas de NaN)", () => {
    expect(successRate(5, 0, 4)).toBe(0);
    expect(successRate(5, 3, 0)).toBe(0);
  });
});

describe("outcomeSuccessRate / bestWeeklyStreak", () => {
  it("calcule le taux sur success + fail uniquement", () => {
    expect(outcomeSuccessRate(OUTCOMES, "alice")).toBe(100);
    expect(outcomeSuccessRate(OUTCOMES, "me")).toBe(75);
    expect(outcomeSuccessRate(OUTCOMES, "bob")).toBe(100);
  });
  it("une semaine neutre conserve la série tandis qu'un échec la casse", () => {
    expect(bestWeeklyStreak(OUTCOMES, "alice")).toBe(4);
    expect(bestWeeklyStreak(OUTCOMES, "me")).toBe(2);
    expect(bestWeeklyStreak(OUTCOMES, "bob")).toBe(3);
  });
  it("0 sans semaine décisive", () => {
    expect(outcomeSuccessRate([{ userId: "x", weekStart: WEEKS[0], status: "neutral" }], "x")).toBe(0);
    expect(bestWeeklyStreak([], "x")).toBe(0);
  });
});

describe("contributedByMember", () => {
  it("somme les pénalités du membre", () => {
    expect(contributedByMember(PENALTIES, "me")).toBe(15);
    expect(contributedByMember(PENALTIES, "bob")).toBe(30);
    expect(contributedByMember(PENALTIES, "alice")).toBe(0);
  });
});

/* -------------------------------------------------------- classement final */

describe("finalRanking", () => {
  const ranked = finalRanking(MEMBERS, SESSIONS, PENALTIES, OUTCOMES);

  it("classe par taux décroissant et attribue les rangs 1..N", () => {
    expect(ranked.map((r) => r.member.userId)).toEqual(["alice", "bob", "me"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });
  it("porte les bons chiffres par membre", () => {
    const meRow = ranked.find((r) => r.member.userId === "me")!;
    expect(meRow.validated).toBe(14);
    expect(meRow.rate).toBe(75);
    expect(meRow.contributed).toBe(15);
  });
  it("départage deux taux égaux par le nombre de séances", () => {
    // Deux membres à 100% mais l'un a plus de séances (objectif plus élevé).
    const a = member("a", 2, "A"); // 2/sem → 100%
    const b = member("b", 4, "B"); // 4/sem → 100%
    const s = [...done("a", WEEKS[0], 2), ...done("b", WEEKS[0], 4)];
    const outcomes: ReportOutcome[] = [
      { userId: "a", weekStart: WEEKS[0], status: "success" },
      { userId: "b", weekStart: WEEKS[0], status: "success" },
    ];
    const r = finalRanking([a, b], s, [], outcomes);
    expect(r.map((x) => x.member.userId)).toEqual(["b", "a"]);
  });
});

/* ----------------------------------------------------------------- mon bilan */

describe("myBilan", () => {
  it("agrège validées, meilleure série, taux et euros versés", () => {
    expect(myBilan(me, SESSIONS, PENALTIES, OUTCOMES)).toEqual({
      validated: 14,
      bestStreak: 2,
      rate: 75,
      paid: 15,
    });
  });
});

/* -------------------------------------------------- contributions (clôture) */

describe("contributionBreakdown", () => {
  const rows = contributionBreakdown(MEMBERS, PENALTIES);

  it("ne liste que les contributeurs, du plus gros au plus petit", () => {
    expect(rows.map((r) => r.member.userId)).toEqual(["bob", "me"]);
  });
  it("distingue séances manquées et blâmes", () => {
    const meRow = rows.find((r) => r.member.userId === "me")!;
    expect(meRow).toMatchObject({ missed: 2, blames: 1, total: 15 });
  });
  it("ignore une pénalité dont le membre a quitté le groupe", () => {
    const orphan: ReportPenalty[] = [{ userId: "ghost", penaltyType: "missed_session", amount: 9 }];
    expect(contributionBreakdown(MEMBERS, orphan)).toEqual([]);
  });
});

describe("contributionSubLabel", () => {
  it("séances manquées seules", () => {
    expect(contributionSubLabel(12, 0)).toBe("12 séances manquées");
    expect(contributionSubLabel(1, 0)).toBe("1 séance manquée");
  });
  it("votes manqués seuls", () => {
    expect(contributionSubLabel(0, 2)).toBe("2 votes manqués");
    expect(contributionSubLabel(0, 1)).toBe("1 vote manqué");
  });
  it("mélange → « N pénalités »", () => {
    expect(contributionSubLabel(2, 1)).toBe("3 pénalités");
  });
});

/* ------------------------------------------------------------------ libellés */

describe("reportName", () => {
  it("« Toi » pour soi, sinon prénom/pseudo", () => {
    expect(reportName(me, "me")).toBe("Toi");
    expect(reportName(alice, "me")).toBe("Alice");
    expect(reportName({ ...bob, firstName: null, username: null }, "me")).toBe("Membre");
  });
});

describe("challengeRangeLabel", () => {
  it("plage lisible + nombre de semaines", () => {
    expect(challengeRangeLabel(START, END)).toBe("4 mai → 31 mai 2026 · 4 semaines");
  });
  it("accorde « semaine » au singulier", () => {
    expect(challengeRangeLabel("2026-05-04", "2026-05-06")).toContain("· 1 semaine");
  });
});
