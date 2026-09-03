import {
  pickObjectiveCelebration,
  pickObjectiveCelebrations,
  type CelebrationNotif,
} from "../celebration";

/** Fabrique une notification `objective_reached` (surchargée au besoin). */
function objectiveNotif(over: Partial<CelebrationNotif> = {}): CelebrationNotif {
  return {
    id: "n1",
    type: "objective_reached",
    body: "Objectif validé dans « Team » — ta série passe à 3 semaines. Continue ! 🔥",
    data: { group_id: "g1", week_start: "2026-08-17", streak: 3 },
    read: false,
    ...over,
  };
}

describe("pickObjectiveCelebration", () => {
  it("renvoie null quand la liste est vide", () => {
    expect(pickObjectiveCelebration([])).toBeNull();
  });

  it("ignore les autres types de notification", () => {
    const list: CelebrationNotif[] = [
      { id: "a", type: "session_validated", body: "x", data: {}, read: false },
      { id: "b", type: "badge_unlocked", body: "y", data: {}, read: false },
    ];
    expect(pickObjectiveCelebration(list)).toBeNull();
  });

  it("sélectionne l'objective_reached non lu et parse streak + groupe", () => {
    const res = pickObjectiveCelebration([objectiveNotif()]);
    expect(res).toEqual({
      notificationId: "n1",
      groupId: "g1",
      streak: 3,
      body: expect.stringContaining("ta série passe à 3 semaines"),
    });
  });

  it("saute une notification déjà lue", () => {
    expect(pickObjectiveCelebration([objectiveNotif({ read: true })])).toBeNull();
  });

  it("saute une notification déjà acquittée dans la session", () => {
    const dispatched = new Set(["n1"]);
    expect(pickObjectiveCelebration([objectiveNotif()], dispatched)).toBeNull();
  });

  it("prend la plus récente (première de la liste triée) quand plusieurs sont non lues", () => {
    const list = [
      objectiveNotif({ id: "recent", data: { group_id: "g2", streak: 5 } }),
      objectiveNotif({ id: "older", data: { group_id: "g1", streak: 2 } }),
    ];
    const res = pickObjectiveCelebration(list);
    expect(res?.notificationId).toBe("recent");
    expect(res?.groupId).toBe("g2");
    expect(res?.streak).toBe(5);
  });

  it("regroupe plusieurs objectifs simultanés dans l'ordre reçu", () => {
    const list = [
      objectiveNotif({ id: "g2", data: { group_id: "g2", streak: 5 } }),
      objectiveNotif({ id: "g1", data: { group_id: "g1", streak: 2 } }),
    ];
    expect(pickObjectiveCelebrations(list).map((item) => item.notificationId)).toEqual(["g2", "g1"]);
  });

  it("streak = 0 par défaut si la donnée est absente ou invalide", () => {
    expect(pickObjectiveCelebration([objectiveNotif({ data: {} })])?.streak).toBe(0);
    expect(
      pickObjectiveCelebration([objectiveNotif({ data: { streak: "oops" } })])?.streak
    ).toBe(0);
  });

  it("tolère un streak fourni en chaîne de caractères", () => {
    const res = pickObjectiveCelebration([objectiveNotif({ data: { group_id: "g1", streak: "4" } })]);
    expect(res?.streak).toBe(4);
  });

  it("groupId = null si data.group_id est absent", () => {
    expect(pickObjectiveCelebration([objectiveNotif({ data: { streak: 1 } })])?.groupId).toBeNull();
  });
});
