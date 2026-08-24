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

describe("voteDeadline (échéance effective = max(nominale, publication + 24h))", () => {
  it("same_day : le filet +24h prend le dessus sur la fin de journée", () => {
    const pub = new Date(2026, 5, 13, 18, 5); // sam. 13 juin 18h05
    const d = voteDeadline(pub, "2026-06-08", "same_day");
    // max(sam 23h59, dim 18h05) = dim 18h05
    expect(d.getDate()).toBe(14);
    expect(d.getHours()).toBe(18);
    expect(d.getMinutes()).toBe(5);
  });
  it("end_of_week : la fin du dimanche prend le dessus si publication tôt", () => {
    const pub = new Date(2026, 5, 10, 9, 0); // mer. 10 juin
    const d = voteDeadline(pub, "2026-06-08", "end_of_week"); // lundi 8 → dimanche 14
    // max(dim 23h59, jeu 09h00) = dim 23h59
    expect(d.getDate()).toBe(14);
    expect(d.getHours()).toBe(23);
  });
  it("end_of_week : le filet +24h prend le dessus si publication tardive le dimanche", () => {
    const pub = new Date(2026, 5, 14, 20, 0); // dim. 14 juin 20h
    const d = voteDeadline(pub, "2026-06-08", "end_of_week");
    // max(dim 23h59, lun 20h00) = lun 20h00
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(20);
  });
});

describe("isVoteExpired", () => {
  it("vrai si maintenant dépasse la limite", () => {
    const deadline = new Date(2026, 5, 13, 23, 59);
    expect(isVoteExpired(deadline, new Date(2026, 5, 14, 0, 1))).toBe(true);
    expect(isVoteExpired(deadline, new Date(2026, 5, 13, 12, 0))).toBe(false);
  });
});

describe("resolveVote (clôture anticipée seulement si participation complète)", () => {
  it("reste en attente tant que tout le monde n'a pas voté, MÊME à la majorité", () => {
    // Changement de modèle : on n'anticipe plus, pour garder les retardataires blâmables.
    expect(resolveVote({ yes: 2, no: 0, otherMembers: 3, expired: false })).toBe("pending_vote");
    expect(resolveVote({ yes: 0, no: 2, otherMembers: 3, expired: false })).toBe("pending_vote");
    expect(resolveVote({ yes: 1, no: 0, otherMembers: 4, expired: false })).toBe("pending_vote");
  });
  it("tranche dès que tout le monde a voté (égalité = validée)", () => {
    expect(resolveVote({ yes: 2, no: 2, otherMembers: 4, expired: false })).toBe("validated");
    expect(resolveVote({ yes: 3, no: 1, otherMembers: 4, expired: false })).toBe("validated");
    expect(resolveVote({ yes: 1, no: 3, otherMembers: 4, expired: false })).toBe("rejected");
  });
  it("à l'échéance : refus majoritaire → refusée, sinon VALIDÉE par défaut", () => {
    // seuil(4) = 3
    expect(resolveVote({ yes: 0, no: 3, otherMembers: 4, expired: true })).toBe("rejected");
    expect(resolveVote({ yes: 0, no: 2, otherMembers: 4, expired: true })).toBe("validated");
    expect(resolveVote({ yes: 1, no: 0, otherMembers: 4, expired: true })).toBe("validated");
    // Plus de statut « expired » : zéro vote à l'échéance → validée par défaut.
    expect(resolveVote({ yes: 0, no: 0, otherMembers: 4, expired: true })).toBe("validated");
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
