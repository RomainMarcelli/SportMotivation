import { mapInviteError } from "../invitations";

describe("mapInviteError", () => {
  // Inviter par pseudo est ouvert à tout membre (cf. SQL 040) : NOT_MEMBER remplace
  // NOT_ADMIN pour l'invitation. NOT_ADMIN ne concerne plus que la gestion des invitations.
  it("traduit NOT_MEMBER", () => {
    expect(mapInviteError("NOT_MEMBER")).toBe("Tu dois faire partie du défi pour inviter.");
  });
  it("traduit NOT_ADMIN (gestion des invitations)", () => {
    expect(mapInviteError("NOT_ADMIN")).toBe("Seul un admin peut gérer les invitations.");
  });
  it("traduit ALREADY_MEMBER", () => {
    expect(mapInviteError("ALREADY_MEMBER")).toBe("Ce joueur fait déjà partie du groupe.");
  });
  it("traduit GROUP_FULL", () => {
    expect(mapInviteError("GROUP_FULL")).toBe("Le groupe est complet.");
  });
  it("traduit INVITATION_RESOLVED", () => {
    expect(mapInviteError("INVITATION_RESOLVED")).toBe("Cette invitation a déjà été traitée.");
  });
  it("retourne le message brut sinon", () => {
    expect(mapInviteError("autre")).toBe("autre");
  });
});
