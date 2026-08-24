import {
  groupWeeklyProgress,
  isPerformedThisWeek,
  rankedMemberStats,
  validatedThisWeek,
} from "@/lib/group-stats";

const now = new Date(2026, 5, 17); // mercredi 17 juin 2026 (semaine 15→21 juin)

const s = (id: string, status: string, day: string) => ({
  author: { id },
  status,
  performed_at: day,
});

const sessions = [
  s("a", "validated", "2026-06-15"), // lundi (cette semaine)
  s("a", "validated", "2026-06-16"), // mardi
  s("a", "pending_vote", "2026-06-16"), // non validée → ignorée
  s("b", "validated", "2026-06-17"),
  s("a", "validated", "2026-06-08"), // semaine passée → ignorée
];

const members = [
  { user: { id: "a" }, weeklyTarget: 4 },
  { user: { id: "b" }, weeklyTarget: 3 },
  { user: { id: "c" }, weeklyTarget: 2 },
];

describe("isPerformedThisWeek", () => {
  it("inclut lundi→dimanche de la semaine courante", () => {
    expect(isPerformedThisWeek("2026-06-15", now)).toBe(true);
    expect(isPerformedThisWeek("2026-06-21", now)).toBe(true);
    expect(isPerformedThisWeek("2026-06-14", now)).toBe(false);
    expect(isPerformedThisWeek("2026-06-22", now)).toBe(false);
  });

  it("tolère un timestamp ISO", () => {
    expect(isPerformedThisWeek("2026-06-16T09:30:00Z", now)).toBe(true);
  });
});

describe("validatedThisWeek", () => {
  it("ne compte que les séances validées de la semaine", () => {
    expect(validatedThisWeek(sessions, "a", now)).toBe(2);
    expect(validatedThisWeek(sessions, "b", now)).toBe(1);
    expect(validatedThisWeek(sessions, "c", now)).toBe(0);
  });
});

describe("rankedMemberStats", () => {
  it("classe par séances faites décroissant", () => {
    const ranked = rankedMemberStats(members, sessions, now);
    expect(ranked.map((r) => r.member.user.id)).toEqual(["a", "b", "c"]);
    expect(ranked[0]).toMatchObject({ done: 2, target: 4 });
  });
});

describe("groupWeeklyProgress", () => {
  it("somme les faits et les objectifs", () => {
    expect(groupWeeklyProgress(members, sessions, now)).toEqual({ done: 3, target: 9 });
  });
});
