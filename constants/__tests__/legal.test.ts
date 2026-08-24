import { getLegalDoc, LEGAL_DOCS, readingMinutes } from "../legal";

describe("getLegalDoc", () => {
  it("trouve les trois documents", () => {
    expect(getLegalDoc("help")?.title).toBe("Centre d'aide");
    expect(getLegalDoc("terms")?.layout).toBe("article");
    expect(getLegalDoc("privacy")?.draft).toBe(true);
  });

  // L'URL vient d'un paramètre de route : elle peut contenir n'importe quoi.
  it("renvoie undefined sur un identifiant inconnu", () => {
    expect(getLegalDoc("mentions")).toBeUndefined();
    expect(getLegalDoc(undefined)).toBeUndefined();
    expect(getLegalDoc("")).toBeUndefined();
  });
});

describe("contenu des documents", () => {
  it("l'aide n'est pas un texte provisoire", () => {
    expect(LEGAL_DOCS.help.draft).toBe(false);
  });

  // Le bandeau « à faire relire » doit rester tant que les textes ne le sont pas.
  it("les textes juridiques sont marqués provisoires", () => {
    expect(LEGAL_DOCS.terms.draft).toBe(true);
    expect(LEGAL_DOCS.privacy.draft).toBe(true);
  });

  it("chaque section a un titre, un corps et une icône", () => {
    for (const doc of Object.values(LEGAL_DOCS)) {
      expect(doc.sections.length).toBeGreaterThan(0);
      for (const section of doc.sections) {
        expect(section.heading.length).toBeGreaterThan(0);
        expect(section.body.length).toBeGreaterThan(20);
        expect(section.icon).toBeDefined();
      }
    }
  });

  // Le point qui engage le plus l'éditeur : l'app ne touche pas à l'argent.
  it("les CGU disent que l'app ne manipule pas d'argent", () => {
    const body = LEGAL_DOCS.terms.sections.map((s) => s.body).join(" ");
    expect(body).toContain("n'encaisse");
  });
});

describe("readingMinutes", () => {
  it("annonce au moins une minute", () => {
    expect(readingMinutes(LEGAL_DOCS.terms)).toBeGreaterThanOrEqual(1);
  });

  it("reste un ordre de grandeur crédible", () => {
    expect(readingMinutes(LEGAL_DOCS.help)).toBeLessThanOrEqual(5);
  });
});
