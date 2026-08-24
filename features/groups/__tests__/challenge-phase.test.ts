import {
  challengePhase,
  challengePhaseLabel,
  challengeTiming,
} from "../challenge-phase";

// « Maintenant » figé au 15 juillet 2026 pour des assertions déterministes.
const NOW = new Date(2026, 6, 15);

describe("challengePhase", () => {
  it("À venir quand le début est dans le futur", () => {
    expect(challengePhase("active", "2026-07-20", "2026-08-31", NOW)).toBe("upcoming");
  });

  it("En cours quand aujourd'hui est dans la période", () => {
    expect(challengePhase("active", "2026-07-01", "2026-08-31", NOW)).toBe("active");
  });

  it("commence le jour même = En cours (pas À venir)", () => {
    // La demande produit : « si je choisis la date du jour, il commence tout de suite ».
    expect(challengePhase("active", "2026-07-15", "2026-08-31", NOW)).toBe("active");
  });

  it("dernier jour (fin = aujourd'hui) = encore En cours", () => {
    expect(challengePhase("active", "2026-07-01", "2026-07-15", NOW)).toBe("active");
  });

  it("Terminé quand la fin est passée", () => {
    expect(challengePhase("active", "2026-06-01", "2026-07-10", NOW)).toBe("ended");
  });

  it("un ancien statut `setup` suit aussi les dates", () => {
    expect(challengePhase("setup", "2026-07-01", "2026-08-31", NOW)).toBe("active");
    expect(challengePhase("setup", "2026-07-20", "2026-08-31", NOW)).toBe("upcoming");
  });

  it("`completed` prime sur les dates (déblocage serveur)", () => {
    expect(challengePhase("completed", "2026-07-01", "2026-08-31", NOW)).toBe("ended");
  });

  it("`cancelled` prime sur tout", () => {
    expect(challengePhase("cancelled", "2026-07-01", "2026-08-31", NOW)).toBe("cancelled");
  });
});

describe("challengePhaseLabel", () => {
  it("libellés lisibles par phase", () => {
    expect(challengePhaseLabel("upcoming")).toBe("À venir");
    expect(challengePhaseLabel("active")).toBe("En cours");
    expect(challengePhaseLabel("ended")).toBe("Terminé");
    expect(challengePhaseLabel("cancelled")).toBe("Annulé");
  });
});

describe("challengeTiming", () => {
  it("à venir → compte à rebours avant le début", () => {
    expect(challengeTiming("active", "2026-07-20", "2026-08-31", NOW)).toBe(
      "J-5 · début le 20 juillet 2026"
    );
  });

  it("en cours → compte à rebours avant la fin", () => {
    expect(challengeTiming("active", "2026-07-01", "2026-08-31", NOW)).toBe(
      "J-47 · fin le 31 août 2026"
    );
  });

  it("dernier jour", () => {
    expect(challengeTiming("active", "2026-07-01", "2026-07-15", NOW)).toBe(
      "Dernier jour · 15 juillet 2026"
    );
  });

  it("terminé", () => {
    expect(challengeTiming("active", "2026-06-01", "2026-07-10", NOW)).toBe(
      "Terminé le 10 juillet 2026"
    );
  });

  it("annulé → plage de dates", () => {
    expect(challengeTiming("cancelled", "2026-06-01", "2026-08-31", NOW)).toBe(
      "1 juin 2026 → 31 août 2026"
    );
  });
});
