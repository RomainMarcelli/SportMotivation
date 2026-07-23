import { addDuration, endFromPreset, formatDuration } from "@/lib/duration";

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

describe("formatDuration", () => {
  it("reste en minutes sous l'heure", () => {
    expect(formatDuration(0)).toBe("0 min");
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(59)).toBe("59 min");
  });

  it("passe en heures dès 60 min", () => {
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(70)).toBe("1h10");
    expect(formatDuration(90)).toBe("1h30");
    expect(formatDuration(120)).toBe("2h");
    expect(formatDuration(195)).toBe("3h15");
  });

  // « 2h5 » se lit « deux heures cinquante » au premier coup d'œil.
  it("met les minutes sur deux chiffres", () => {
    expect(formatDuration(65)).toBe("1h05");
    expect(formatDuration(121)).toBe("2h01");
  });

  it("tolère une valeur absente, négative ou décimale", () => {
    expect(formatDuration(null)).toBe("0 min");
    expect(formatDuration(undefined)).toBe("0 min");
    expect(formatDuration(-30)).toBe("0 min");
    expect(formatDuration(45.6)).toBe("46 min");
    expect(formatDuration(Number.NaN)).toBe("0 min");
  });
});
