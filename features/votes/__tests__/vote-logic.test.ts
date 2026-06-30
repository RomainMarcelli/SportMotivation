import {
  formatTimeRemaining,
  isVoteExpired,
  resolveVote,
  voteDeadline,
  voteThreshold,
} from "../vote-logic";

describe("voteThreshold (majorité stricte des autres membres)", () => {
  it("calcule floor(n/2)+1", () => {
    expect(voteThreshold(1)).toBe(1);
    expect(voteThreshold(2)).toBe(2);
    expect(voteThreshold(3)).toBe(2);
    expect(voteThreshold(4)).toBe(3);
    expect(voteThreshold(5)).toBe(3);
  });
  it("renvoie 1 au minimum", () => {
    expect(voteThreshold(0)).toBe(1);
  });
});

describe("voteDeadline", () => {
  it("same_day = fin de la journée de publication", () => {
    const pub = new Date(2026, 5, 13, 18, 5); // sam. 13 juin 18h05
    const d = voteDeadline(pub, "2026-06-08", "same_day");
    expect(d.getDate()).toBe(13);
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
  });
  it("end_of_week = fin du dimanche de la semaine", () => {
    const pub = new Date(2026, 5, 10, 9, 0);
    const d = voteDeadline(pub, "2026-06-08", "end_of_week"); // lundi 8 → dimanche 14
    expect(d.getDate()).toBe(14);
    expect(d.getHours()).toBe(23);
  });
});

describe("isVoteExpired", () => {
  it("vrai si maintenant dépasse la limite", () => {
    const deadline = new Date(2026, 5, 13, 23, 59);
    expect(isVoteExpired(deadline, new Date(2026, 5, 14, 0, 1))).toBe(true);
    expect(isVoteExpired(deadline, new Date(2026, 5, 13, 12, 0))).toBe(false);
  });
});

describe("resolveVote", () => {
  it("validée quand oui atteint le seuil", () => {
    expect(resolveVote({ yes: 2, no: 0, otherMembers: 3, expired: false })).toBe("validated");
  });
  it("refusée quand non atteint le seuil", () => {
    expect(resolveVote({ yes: 0, no: 2, otherMembers: 3, expired: false })).toBe("rejected");
  });
  it("reste en attente si le seuil n'est pas atteint et que tout le monde n'a pas voté", () => {
    expect(resolveVote({ yes: 1, no: 0, otherMembers: 4, expired: false })).toBe("pending_vote");
  });
  it("tranche à la majorité simple si tout le monde a voté", () => {
    expect(resolveVote({ yes: 2, no: 2, otherMembers: 4, expired: false })).toBe("validated");
    expect(resolveVote({ yes: 1, no: 3, otherMembers: 4, expired: false })).toBe("rejected");
  });
  it("tranche à la majorité simple si le délai est écoulé", () => {
    expect(resolveVote({ yes: 1, no: 0, otherMembers: 4, expired: true })).toBe("validated");
  });
  it("expirée si délai écoulé sans aucun vote", () => {
    expect(resolveVote({ yes: 0, no: 0, otherMembers: 4, expired: true })).toBe("expired");
  });
});

describe("formatTimeRemaining", () => {
  const now = new Date(2026, 5, 13, 12, 0);
  it("jours / heures / minutes", () => {
    expect(formatTimeRemaining(new Date(2026, 5, 15, 12, 0), now)).toBe("2 j");
    expect(formatTimeRemaining(new Date(2026, 5, 13, 17, 0), now)).toBe("5 h");
    expect(formatTimeRemaining(new Date(2026, 5, 13, 12, 45), now)).toBe("45 min");
  });
  it("Expiré si la limite est passée", () => {
    expect(formatTimeRemaining(new Date(2026, 5, 13, 11, 0), now)).toBe("Expiré");
  });
});
