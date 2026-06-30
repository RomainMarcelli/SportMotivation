import {
  EXCUSE_MOTIFS,
  EXCUSE_TYPES,
  excuseThreshold,
  isExcuseReasonValid,
  resolveExcuse,
} from "../excuse-logic";

describe("excuse-logic", () => {
  describe("EXCUSE_TYPES / EXCUSE_MOTIFS", () => {
    it("expose standard puis major avec leurs motifs", () => {
      expect(EXCUSE_TYPES.map((t) => t.value)).toEqual(["standard", "major"]);
      expect(EXCUSE_MOTIFS.standard).toContain("Gastro");
      expect(EXCUSE_MOTIFS.major).toContain("Hospitalisation");
    });
  });

  describe("excuseThreshold", () => {
    it("majorité simple des autres membres", () => {
      expect(excuseThreshold(0)).toBe(1);
      expect(excuseThreshold(1)).toBe(1);
      expect(excuseThreshold(2)).toBe(2);
      expect(excuseThreshold(3)).toBe(2);
      expect(excuseThreshold(4)).toBe(3);
      expect(excuseThreshold(5)).toBe(3);
    });
  });

  describe("resolveExcuse", () => {
    it("accepte au seuil de oui", () => {
      expect(resolveExcuse({ yes: 2, no: 0, otherMembers: 3 })).toBe("accepted");
    });
    it("refuse au seuil de non", () => {
      expect(resolveExcuse({ yes: 0, no: 2, otherMembers: 3 })).toBe("rejected");
    });
    it("reste en attente tant que le seuil n'est pas atteint", () => {
      expect(resolveExcuse({ yes: 1, no: 0, otherMembers: 4 })).toBe("pending_vote");
    });
    it("égalité quand tout le monde a voté = acceptée (bénéfice du doute)", () => {
      expect(resolveExcuse({ yes: 1, no: 1, otherMembers: 2 })).toBe("accepted");
    });
    it("majorité simple quand tout le monde a voté", () => {
      expect(resolveExcuse({ yes: 1, no: 2, otherMembers: 3 })).toBe("rejected");
    });
  });

  describe("isExcuseReasonValid", () => {
    it("exige un motif non vide", () => {
      expect(isExcuseReasonValid("")).toBe(false);
      expect(isExcuseReasonValid("   ")).toBe(false);
      expect(isExcuseReasonValid("Gastro")).toBe(true);
    });
  });
});
