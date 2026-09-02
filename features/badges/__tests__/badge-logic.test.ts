import { BADGES } from "@/constants/badges";

import { badgeProgress, badgeTally, buildBadgeViews, groupBadgesByCategory } from "../badge-logic";

const sessionsBadge = (t: number) => BADGES.find((b) => b.category === "sessions" && b.threshold === t)!;
const streakBadge = (t: number) => BADGES.find((b) => b.category === "streak" && b.threshold === t)!;
const challengeBadge = BADGES.find((b) => b.category === "challenge")!;

describe("badgeProgress", () => {
  it("séances : compteur = séances validées, borné au seuil", () => {
    expect(badgeProgress(sessionsBadge(10), { validatedSessions: 4, bestStreak: 0 })).toEqual({
      current: 4,
      target: 10,
      ratio: 0.4,
    });
    // Dépasser le seuil borne current au seuil (ratio 1).
    expect(badgeProgress(sessionsBadge(10), { validatedSessions: 50, bestStreak: 0 })).toEqual({
      current: 10,
      target: 10,
      ratio: 1,
    });
  });

  it("série : compteur = meilleur record", () => {
    expect(badgeProgress(streakBadge(12), { validatedSessions: 0, bestStreak: 8 })).toEqual({
      current: 8,
      target: 12,
      ratio: 8 / 12,
    });
  });

  it("badge de défi : pas de jauge numérique", () => {
    expect(badgeProgress(challengeBadge, { validatedSessions: 999, bestStreak: 999 })).toBeNull();
  });
});

describe("buildBadgeViews", () => {
  it("marque débloqués ceux fournis par le serveur, garde la date", () => {
    const views = buildBadgeViews({ sessions_1: "2026-08-01T10:00:00Z" }, { validatedSessions: 3, bestStreak: 0 });
    const first = views.find((v) => v.key === "sessions_1")!;
    expect(first.unlocked).toBe(true);
    expect(first.unlockedAt).toBe("2026-08-01T10:00:00Z");
    const locked = views.find((v) => v.key === "sessions_50")!;
    expect(locked.unlocked).toBe(false);
    expect(locked.unlockedAt).toBeNull();
  });

  it("couvre tout le catalogue", () => {
    const views = buildBadgeViews({}, { validatedSessions: 0, bestStreak: 0 });
    expect(views).toHaveLength(BADGES.length);
  });
});

describe("groupBadgesByCategory / badgeTally", () => {
  const views = buildBadgeViews(
    { streak_2: "2026-08-01T00:00:00Z", sessions_1: "2026-08-02T00:00:00Z" },
    { validatedSessions: 5, bestStreak: 3 }
  );

  it("regroupe et ordonne les catégories (séries, séances, défis)", () => {
    const groups = groupBadgesByCategory(views);
    expect(groups.map((g) => g.category)).toEqual(["streak", "sessions", "challenge"]);
  });

  it("compte les trophées débloqués sur le total", () => {
    expect(badgeTally(views)).toEqual({ unlocked: 2, total: BADGES.length });
  });
});

describe("catalogue", () => {
  it("les clés sont uniques", () => {
    const keys = BADGES.map((b) => b.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
