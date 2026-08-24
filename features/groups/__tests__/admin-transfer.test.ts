import {
  canTransferAdmin,
  eligibleNewAdmins,
  mapTransferAdminError,
} from "../admin-transfer";

const member = (userId: string, joinedAt: string) => ({
  id: `gm-${userId}`,
  joinedAt,
  user: { id: userId },
});

describe("admin-transfer", () => {
  describe("eligibleNewAdmins", () => {
    it("exclut le membre courant", () => {
      const members = [member("me", "2026-01-01"), member("a", "2026-02-01")];
      expect(eligibleNewAdmins(members, "me").map((m) => m.user.id)).toEqual(["a"]);
    });

    it("trie du plus ancien au plus récent", () => {
      const members = [
        member("c", "2026-03-01"),
        member("a", "2026-01-01"),
        member("b", "2026-02-01"),
      ];
      expect(eligibleNewAdmins(members, "me").map((m) => m.user.id)).toEqual(["a", "b", "c"]);
    });

    it("ne modifie pas le tableau d'origine", () => {
      const members = [member("c", "2026-03-01"), member("a", "2026-01-01")];
      eligibleNewAdmins(members, "me");
      expect(members.map((m) => m.user.id)).toEqual(["c", "a"]);
    });

    it("renvoie une liste vide si je suis seul", () => {
      expect(eligibleNewAdmins([member("me", "2026-01-01")], "me")).toEqual([]);
    });

    it("sans meId, personne n'est exclu", () => {
      const members = [member("a", "2026-01-01"), member("b", "2026-02-01")];
      expect(eligibleNewAdmins(members, undefined)).toHaveLength(2);
    });
  });

  describe("canTransferAdmin", () => {
    it("vrai seulement si admin ET au moins un candidat", () => {
      expect(canTransferAdmin(2, true)).toBe(true);
      expect(canTransferAdmin(0, true)).toBe(false);
      expect(canTransferAdmin(2, false)).toBe(false);
      expect(canTransferAdmin(0, false)).toBe(false);
    });
  });

  describe("mapTransferAdminError", () => {
    it("traduit les codes serveur connus", () => {
      expect(mapTransferAdminError("NOT_ADMIN")).toBe(
        "Seul l'admin peut transférer l'administration."
      );
      expect(mapTransferAdminError("TARGET_NOT_MEMBER")).toBe(
        "Ce membre ne fait plus partie du groupe."
      );
    });

    it("reconnaît le code même noyé dans un message Postgres", () => {
      expect(mapTransferAdminError('erreur: NOT_ADMIN (SQLSTATE P0001)')).toBe(
        "Seul l'admin peut transférer l'administration."
      );
    });

    it("renvoie le message brut si inconnu", () => {
      expect(mapTransferAdminError("boom")).toBe("boom");
    });
  });
});
