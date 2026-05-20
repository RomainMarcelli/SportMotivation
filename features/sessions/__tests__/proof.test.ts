import { getProofTypeLabel, mapSessionError, PROOF_TYPE_LABELS } from "../proof";

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
  it("renvoie le message brut pour un code inconnu", () => {
    expect(mapSessionError("BOOM")).toBe("BOOM");
  });
});

describe("getProofTypeLabel", () => {
  it("renvoie le libellé pour chaque type de preuve", () => {
    expect(getProofTypeLabel("photo")).toBe(PROOF_TYPE_LABELS.photo);
    expect(getProofTypeLabel("strava")).toBe("Strava");
    expect(getProofTypeLabel("external_link")).toBe("Lien externe");
  });
});
