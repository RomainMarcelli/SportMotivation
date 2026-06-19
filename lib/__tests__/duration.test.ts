import { addDuration, endFromPreset } from "@/lib/duration";

describe("addDuration", () => {
  const start = new Date(2026, 5, 19); // 19 juin 2026

  it("ajoute des jours", () => {
    expect(addDuration(start, 10, "jours")).toEqual(new Date(2026, 5, 29));
  });

  it("ajoute des mois", () => {
    expect(addDuration(start, 3, "mois")).toEqual(new Date(2026, 8, 19)); // 19 sept.
  });

  it("ajoute des années", () => {
    expect(addDuration(start, 1, "annees")).toEqual(new Date(2027, 5, 19));
  });

  it("normalise l'heure à minuit local", () => {
    const withTime = new Date(2026, 5, 19, 22, 30);
    expect(addDuration(withTime, 1, "jours").getHours()).toBe(0);
  });
});

describe("endFromPreset", () => {
  it("équivaut à addDuration en mois", () => {
    const start = new Date(2026, 5, 19);
    expect(endFromPreset(start, 6)).toEqual(addDuration(start, 6, "mois"));
  });
});
