import {
  groupByDay,
  invitationOutcome,
  isVoteDone,
  relativeTime,
  unreadLabel,
  voteTargetId,
} from "../format";

const NOW = new Date(2026, 6, 22, 14, 0, 0); // mercredi 22 juillet 2026, 14 h

function at(y: number, m: number, d: number, h = 12, min = 0): string {
  return new Date(y, m, d, h, min).toISOString();
}

describe("relativeTime", () => {
  it("dit « à l'instant » sous la minute", () => {
    const thirtySecondsAgo = new Date(NOW.getTime() - 30_000).toISOString();
    expect(relativeTime(thirtySecondsAgo, NOW)).toBe("à l'instant");
  });

  it("compte en minutes puis en heures", () => {
    expect(relativeTime(at(2026, 6, 22, 13, 59), NOW)).toBe("il y a 1 min");
    expect(relativeTime(at(2026, 6, 22, 13, 30), NOW)).toBe("il y a 30 min");
    expect(relativeTime(at(2026, 6, 22, 12, 0), NOW)).toBe("il y a 2 h");
  });

  it("dit « hier »", () => {
    expect(relativeTime(at(2026, 6, 21, 9), NOW)).toBe("hier");
  });

  it("nomme le jour dans la semaine écoulée", () => {
    expect(relativeTime(at(2026, 6, 19, 9), NOW)).toBe("dimanche");
  });

  it("bascule sur une date au-delà d'une semaine", () => {
    expect(relativeTime(at(2026, 5, 12, 9), NOW)).toBe("12.06");
  });

  it("ne casse pas sur une date invalide", () => {
    expect(relativeTime("nope", NOW)).toBe("");
  });
});

describe("groupByDay", () => {
  const items = [
    { id: "a", created_at: at(2026, 6, 22, 10) },
    { id: "b", created_at: at(2026, 6, 22, 8) },
    { id: "c", created_at: at(2026, 6, 21, 8) },
    { id: "d", created_at: at(2026, 6, 10, 8) },
  ];

  it("répartit dans Aujourd'hui / Hier / Plus tôt", () => {
    const sections = groupByDay(items, NOW);
    expect(sections.map((s) => s.title)).toEqual(["Aujourd'hui", "Hier", "Plus tôt"]);
    expect(sections[0].data).toHaveLength(2);
    expect(sections[1].data.map((i) => i.id)).toEqual(["c"]);
    expect(sections[2].data.map((i) => i.id)).toEqual(["d"]);
  });

  // Un titre de section sans contenu est du bruit visuel.
  it("omet les sections vides", () => {
    const sections = groupByDay([items[0]], NOW);
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe("Aujourd'hui");
  });

  it("renvoie une liste vide sans notification", () => {
    expect(groupByDay([], NOW)).toEqual([]);
  });

  it("range une date illisible dans « Plus tôt » plutôt que de la perdre", () => {
    const sections = groupByDay([{ id: "x", created_at: "boom" }], NOW);
    expect(sections[0].title).toBe("Plus tôt");
    expect(sections[0].data).toHaveLength(1);
  });

  it("conserve l'ordre d'origine dans chaque section", () => {
    const sections = groupByDay(items, NOW);
    expect(sections[0].data.map((i) => i.id)).toEqual(["a", "b"]);
  });
});

describe("unreadLabel", () => {
  it("accorde le pluriel", () => {
    expect(unreadLabel(1)).toBe("1 nouvelle");
    expect(unreadLabel(4)).toBe("4 nouvelles");
  });

  it("n'affiche rien à zéro", () => {
    expect(unreadLabel(0)).toBeNull();
    expect(unreadLabel(-1)).toBeNull();
  });
});

describe("voteTargetId", () => {
  it("lit l'excuse d'une demande de vote d'excuse", () => {
    expect(
      voteTargetId({ type: "vote_pending_excuse", data: { group_id: "g", excuse_id: "e1" } })
    ).toBe("e1");
  });

  it("lit la séance d'une demande de vote de séance", () => {
    expect(
      voteTargetId({ type: "vote_pending_session", data: { group_id: "g", session_id: "s1" } })
    ).toBe("s1");
  });

  // Les anciennes notifications ne portaient pas l'identifiant de la cible.
  it("renvoie null sans identifiant exploitable", () => {
    expect(voteTargetId({ type: "vote_pending_excuse", data: { group_id: "g" } })).toBeNull();
    expect(voteTargetId({ type: "vote_pending_excuse" })).toBeNull();
    expect(voteTargetId({ type: "vote_pending_excuse", data: { excuse_id: 42 } })).toBeNull();
  });

  it("ignore les notifications qui n'appellent pas de vote", () => {
    expect(voteTargetId({ type: "member_joined", data: { session_id: "s1" } })).toBeNull();
  });
});

describe("isVoteDone", () => {
  const notif = { type: "vote_pending_excuse", data: { excuse_id: "e1" } };

  it("détecte un vote déjà donné", () => {
    expect(isVoteDone(notif, new Set(["e1"]))).toBe(true);
  });

  it("laisse le bouton quand le vote reste à donner", () => {
    expect(isVoteDone(notif, new Set(["autre"]))).toBe(false);
  });

  // Mieux vaut un bouton en trop qu'un « déjà voté » mensonger : tant que la
  // liste des votes n'est pas chargée, on ne prétend rien.
  it("ne prétend rien sans la liste des votes", () => {
    expect(isVoteDone(notif, undefined)).toBe(false);
  });

  it("ne s'applique pas aux notifications sans vote", () => {
    expect(isVoteDone({ type: "member_joined" }, new Set(["e1"]))).toBe(false);
  });
});

/**
 * `invitationOutcome` détermine si une invitation reçue a déjà été acceptée /
 * refusée, pour remplacer les boutons « Rejoindre / Refuser » par un statut.
 * Le point délicat : sans la table des statuts (pas encore chargée) ou tant que
 * l'invitation est « en attente », on NE tranche PAS (null) — sinon on cacherait
 * les boutons d'une invitation encore à traiter.
 */
describe("invitationOutcome", () => {
  const invit = { type: "group_invitation", data: { invitation_id: "inv-1" } };

  it("renvoie le statut d'une invitation déjà traitée", () => {
    expect(invitationOutcome(invit, { "inv-1": "accepted" })).toBe("accepted");
    expect(invitationOutcome(invit, { "inv-1": "refused" })).toBe("refused");
  });

  // En attente ou absente de la table → on garde les boutons (null).
  it("renvoie null tant que l'invitation n'est pas tranchée", () => {
    expect(invitationOutcome(invit, { "inv-1": "pending" })).toBeNull();
    expect(invitationOutcome(invit, {})).toBeNull();
  });

  it("renvoie null sans table de statuts", () => {
    expect(invitationOutcome(invit, undefined)).toBeNull();
  });

  it("ignore les notifications qui ne sont pas des invitations", () => {
    expect(
      invitationOutcome(
        { type: "member_joined", data: { invitation_id: "inv-1" } },
        { "inv-1": "accepted" }
      )
    ).toBeNull();
  });

  it("renvoie null sans identifiant d'invitation exploitable", () => {
    expect(invitationOutcome({ type: "group_invitation", data: {} }, { "inv-1": "accepted" })).toBeNull();
    expect(
      invitationOutcome({ type: "group_invitation", data: { invitation_id: 42 } }, {})
    ).toBeNull();
  });
});
