import { isJokerUsed, monthLabel, monthStartString } from "../joker";

describe("joker", () => {
  describe("monthStartString", () => {
    it("renvoie le 1er du mois local", () => {
      expect(monthStartString(new Date(2026, 5, 20))).toBe("2026-06-01");
      expect(monthStartString(new Date(2026, 0, 1))).toBe("2026-01-01");
      expect(monthStartString(new Date(2026, 11, 31))).toBe("2026-12-01");
    });
  });

  describe("monthLabel", () => {
    it("nomme le mois en français", () => {
      expect(monthLabel(new Date(2026, 5, 20))).toBe("juin");
    });
  });

  describe("isJokerUsed", () => {
    const now = new Date(2026, 5, 20);
    it("faux si aucun joker", () => {
      expect(isJokerUsed(null, now)).toBe(false);
      expect(isJokerUsed(undefined, now)).toBe(false);
    });
    it("vrai si le joker date du mois en cours", () => {
      expect(isJokerUsed("2026-06-01", now)).toBe(true);
    });
    it("faux si le joker date d'un autre mois", () => {
      expect(isJokerUsed("2026-05-01", now)).toBe(false);
    });
  });
});
