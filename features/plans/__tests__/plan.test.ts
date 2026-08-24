import {
  WEEKDAY_LABELS,
  normalizePlannedDays,
  todayWeekdayIndex,
  togglePlannedDay,
} from "@/features/plans/plan";

describe("plan helpers", () => {
  it("WEEKDAY_LABELS commence lundi et finit dimanche", () => {
    expect(WEEKDAY_LABELS).toEqual(["L", "M", "M", "J", "V", "S", "D"]);
  });

  it("todayWeekdayIndex: lundi → 0, dimanche → 6", () => {
    expect(todayWeekdayIndex(new Date(2026, 5, 15))).toBe(0); // 15 juin 2026 = lundi
    expect(todayWeekdayIndex(new Date(2026, 5, 21))).toBe(6); // 21 juin 2026 = dimanche
  });

  it("togglePlannedDay ajoute un jour absent (trié) et n'altère pas l'entrée", () => {
    const input = [0, 2];
    const out = togglePlannedDay(input, 1);
    expect(out).toEqual([0, 1, 2]);
    expect(input).toEqual([0, 2]);
  });

  it("togglePlannedDay retire un jour présent", () => {
    expect(togglePlannedDay([0, 1, 2], 1)).toEqual([0, 2]);
  });

  it("normalizePlannedDays nettoie null, doublons et hors-borne", () => {
    expect(normalizePlannedDays(null)).toEqual([]);
    expect(normalizePlannedDays([2, 2, 0, 9, -1, "3"])).toEqual([0, 2, 3]);
  });
});
