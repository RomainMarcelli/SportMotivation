import { getProofTypeLabel, isDailyLimitError, mapSessionError, PROOF_TYPE_LABELS } from "../proof";

describe("mapSessionError", () => {
  it("traduit les codes connus", () => {
    expect(mapSessionError("ACTIVITY_NOT_ALLOWED")).toBe(
      "Cette activité n'est pas autorisée par le groupe."
    );
    expect(mapSessionError("DURATION_TOO_SHORT")).toBe(
      "La durée est inférieure au minimum du groupe."
    );
    expect(mapSessionError("PUBLICATION_TOO_LATE")).toBe(
      "Ce groupe n'accepte les séances que le jour même."
    );
  });
  it("traduit la limite de séances du jour", () => {
    expect(mapSessionError("DAILY_LIMIT_REACHED")).toBe(
      "Tu as atteint la limite de séances pour ce jour."
    );
  });
  it("renvoie le message brut pour un code inconnu", () => {
    expect(mapSessionError("BOOM")).toBe("BOOM");
  });
});

describe("isDailyLimitError", () => {
  it("reconnaît la limite du jour (même dans un message enrobé)", () => {
    expect(isDailyLimitError("DAILY_LIMIT_REACHED")).toBe(true);
    expect(isDailyLimitError('new row ... "DAILY_LIMIT_REACHED"')).toBe(true);
  });
  it("ignore les autres erreurs", () => {
    expect(isDailyLimitError("PUBLICATION_TOO_LATE")).toBe(false);
  });
});

describe("getProofTypeLabel", () => {
  it("renvoie le libellé pour chaque type de preuve", () => {
    expect(getProofTypeLabel("photo")).toBe(PROOF_TYPE_LABELS.photo);
    expect(getProofTypeLabel("strava")).toBe("Strava");
    expect(getProofTypeLabel("external_link")).toBe("Lien externe");
  });
});
