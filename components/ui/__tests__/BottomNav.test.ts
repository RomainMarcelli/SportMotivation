import { activeFromPath } from "../BottomNav";

describe("activeFromPath", () => {
  it("accueil sur la racine", () => {
    expect(activeFromPath("/")).toBe("index");
  });

  it("liste des groupes ET détail d'un groupe → onglet Groupes", () => {
    expect(activeFromPath("/groups")).toBe("groups");
    expect(activeFromPath("/group/abc-123")).toBe("groups");
    expect(activeFromPath("/group/abc-123/vote")).toBe("groups");
    expect(activeFromPath("/group/abc-123/excuse")).toBe("groups");
  });

  it("profil et réglages → onglet Profil", () => {
    expect(activeFromPath("/profile")).toBe("profile");
    expect(activeFromPath("/settings")).toBe("profile");
  });

  // Sécurité du compte et textes légaux : on n'y arrive que par les Paramètres.
  it("écrans ouverts depuis les réglages → onglet Profil", () => {
    expect(activeFromPath("/account/password")).toBe("profile");
    expect(activeFromPath("/account/email")).toBe("profile");
    expect(activeFromPath("/legal/terms")).toBe("profile");
    expect(activeFromPath("/legal/privacy")).toBe("profile");
  });

  it("aucun onglet actif sur les écrans hors footer", () => {
    // Régression : arriver sur le groupe DEPUIS les notifications ne doit pas
    // laisser un onglet fantôme actif.
    expect(activeFromPath("/notifications")).toBeNull();
    expect(activeFromPath("/inconnu")).toBeNull();
  });
});
