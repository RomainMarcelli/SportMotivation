import { mapRequestError } from "../requests";

describe("mapRequestError", () => {
  it("traduit les erreurs métier connues", () => {
    expect(mapRequestError("NOT_MEMBER")).toMatch(/membre/i);
    expect(mapRequestError("NOT_ADMIN")).toMatch(/admin/i);
    expect(mapRequestError("ACTIVITY_REQUIRED")).toMatch(/sport/i);
    expect(mapRequestError("UNKNOWN_RULE")).toMatch(/règle/i);
    expect(mapRequestError("GROUP_NOT_FOUND")).toMatch(/introuvable/i);
  });

  it("traduit les erreurs de vote / d'ajout de sport", () => {
    expect(mapRequestError("ALREADY_ADDED")).toMatch(/déjà partie/i);
    expect(mapRequestError("VOTE_ALREADY_OPEN")).toMatch(/vote/i);
    expect(mapRequestError("PROPOSAL_NOT_FOUND")).toMatch(/n'existe plus/i);
  });

  it("laisse passer un message inconnu tel quel", () => {
    expect(mapRequestError("Erreur réseau")).toBe("Erreur réseau");
  });
});
