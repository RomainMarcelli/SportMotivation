import { mapInviteError } from "../invitations";

describe("mapInviteError", () => {
  it("traduit NOT_ADMIN", () => {
    expect(mapInviteError("NOT_ADMIN")).toBe("Seul un admin peut inviter.");
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
