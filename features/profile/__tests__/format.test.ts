import { challengeCount, euros, groupTile, handle, memberSince } from "../format";

describe("memberSince", () => {
  it("formate le mois en français", () => {
    expect(memberSince("2026-03-14T10:00:00Z")).toBe("Membre depuis mars 2026");
  });

  it("gère décembre (dernier index du tableau)", () => {
    expect(memberSince("2025-12-01T00:00:00Z")).toBe("Membre depuis décembre 2025");
  });

  it("renvoie null si la date est absente ou invalide", () => {
    expect(memberSince(null)).toBeNull();
    expect(memberSince(undefined)).toBeNull();
    expect(memberSince("pas-une-date")).toBeNull();
  });
});

describe("handle", () => {
  it("préfixe le pseudo", () => {
    expect(handle("romz")).toBe("@romz");
  });

  // Un « @ » tout seul sous le nom fait bugué : mieux vaut ne rien afficher.
  it("renvoie null plutôt qu'un @ orphelin", () => {
    expect(handle(null)).toBeNull();
    expect(handle("")).toBeNull();
    expect(handle("   ")).toBeNull();
  });
});

describe("euros", () => {
  it("n'ajoute pas de décimales inutiles", () => {
    expect(euros(5)).toBe("5 €");
    expect(euros(0)).toBe("0 €");
  });

  it("utilise la virgule pour les centimes", () => {
    expect(euros(5.5)).toBe("5,50 €");
  });

  it("tolère null / undefined / NaN", () => {
    expect(euros(null)).toBe("0 €");
    expect(euros(undefined)).toBe("0 €");
    expect(euros(Number.NaN)).toBe("0 €");
  });
});

describe("challengeCount", () => {
  it("accorde le pluriel", () => {
    expect(challengeCount(0)).toBe("0 défi");
    expect(challengeCount(1)).toBe("1 défi");
    expect(challengeCount(2)).toBe("2 défis");
  });
});

describe("groupTile", () => {
  it("prend la première lettre en majuscule", () => {
    expect(groupTile("défi de l'été")).toBe("D");
  });

  it("ignore les espaces de tête", () => {
    expect(groupTile("  Marathon")).toBe("M");
  });

  it("ne renvoie jamais une tuile vide", () => {
    expect(groupTile("   ")).toBe("?");
  });
});
