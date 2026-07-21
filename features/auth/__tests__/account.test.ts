import { mapDeleteAccountError } from "../account";

describe("mapDeleteAccountError", () => {
  it("explique qu'il faut déployer l'Edge Function", () => {
    const msg = mapDeleteAccountError("Failed to send a request to the Edge Function");
    expect(msg).toContain("delete-account");
    expect(msg).toContain("pas déployée");
  });

  it("couvre les autres erreurs réseau du navigateur", () => {
    expect(mapDeleteAccountError("Failed to fetch")).toContain("pas déployée");
    expect(mapDeleteAccountError("NetworkError when attempting to fetch")).toContain(
      "pas déployée"
    );
  });

  it("traduit une session invalide", () => {
    expect(mapDeleteAccountError("Session invalide")).toBe(
      "Session expirée — reconnecte-toi puis réessaie."
    );
  });

  it("laisse passer un message inconnu tel quel", () => {
    expect(mapDeleteAccountError("boom")).toBe("boom");
  });
});
