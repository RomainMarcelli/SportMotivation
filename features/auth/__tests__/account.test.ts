import { deletionMessage, mapDeleteAccountError } from "../account";

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

/**
 * `deletionMessage` choisit le texte de l'accusé de réception selon ce que le
 * serveur a RÉELLEMENT fait : suppression totale, ou anonymisation (de l'argent
 * est engagé dans une cagnotte, la ligne est conservée sans identité). Les deux
 * cas doivent être clairement distincts — sinon l'utilisateur croit ses données
 * effacées alors qu'un historique anonymisé subsiste.
 */
describe("deletionMessage", () => {
  it("annonce une suppression complète", () => {
    const msg = deletionMessage("deleted");
    expect(msg).toMatch(/supprimé/i);
    expect(msg).not.toMatch(/anonymis/i);
  });

  it("explique l'anonymisation quand une cagnotte est engagée", () => {
    const msg = deletionMessage("anonymized");
    expect(msg).toMatch(/anonymis/i);
    expect(msg).toMatch(/cagnotte/i);
  });

  it("produit deux textes distincts", () => {
    expect(deletionMessage("deleted")).not.toBe(deletionMessage("anonymized"));
  });
});
