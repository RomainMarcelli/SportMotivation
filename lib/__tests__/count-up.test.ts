import { clamp01, countAt, easeOutCubic } from "@/lib/count-up";

describe("count-up", () => {
  it("clamp01 borne dans [0,1]", () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(3)).toBe(1);
  });

  it("easeOutCubic démarre à 0 et finit à 1", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875, 3);
  });

  it("countAt: 0 au début, cible exacte à la fin", () => {
    expect(countAt(85, 0)).toBe(0);
    expect(countAt(85, 1)).toBe(85);
  });

  it("countAt arrondit aux valeurs intermédiaires (monotone croissant)", () => {
    const mid = countAt(85, 0.5);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(85);
    expect(countAt(85, 0.8)).toBeGreaterThanOrEqual(mid);
  });
});
