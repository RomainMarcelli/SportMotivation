import { invitationOutcome } from "../format";

const NOTIF = {
  type: "group_invitation",
  data: { invitation_id: "inv-1", group_id: "g-1" },
};

describe("invitationOutcome", () => {
  it("reconnaît une invitation acceptée ou refusée", () => {
    expect(invitationOutcome(NOTIF, { "inv-1": "accepted" })).toBe("accepted");
    expect(invitationOutcome(NOTIF, { "inv-1": "refused" })).toBe("refused");
  });

  it("laisse le bouton tant qu'elle est en attente", () => {
    expect(invitationOutcome(NOTIF, { "inv-1": "pending" })).toBeNull();
  });

  // Sans les statuts (chargement, RLS), on n'invente rien : le bouton reste.
  it("ne prétend rien sans les statuts", () => {
    expect(invitationOutcome(NOTIF, undefined)).toBeNull();
    expect(invitationOutcome(NOTIF, {})).toBeNull();
  });

  it("ignore les notifications qui ne sont pas des invitations", () => {
    expect(
      invitationOutcome({ type: "member_joined", data: { invitation_id: "inv-1" } }, {
        "inv-1": "accepted",
      })
    ).toBeNull();
  });

  // Anciennes notifications : le payload ne portait pas l'identifiant.
  it("tolère un payload incomplet", () => {
    expect(invitationOutcome({ type: "group_invitation" }, { "inv-1": "accepted" })).toBeNull();
    expect(
      invitationOutcome({ type: "group_invitation", data: { invitation_id: 12 } }, {
        "inv-1": "accepted",
      })
    ).toBeNull();
  });
});
