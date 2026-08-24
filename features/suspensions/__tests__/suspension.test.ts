import {
  activeSuspensionOn,
  isCurrentlySuspended,
  isSuspendedOn,
  mapSuspension,
  mapSuspensionError,
  pendingRequests,
  suspensionFullRange,
  suspensionRequestError,
  suspensionShortRange,
  suspensionStatusLabel,
  type Suspension,
  type SuspensionRow,
} from "../suspension";

function make(overrides: Partial<Suspension> = {}): Suspension {
  return {
    id: "s1",
    groupId: "g1",
    userId: "u1",
    startDate: "2026-07-29",
    endDate: "2026-08-03",
    reason: "Vacances",
    status: "active",
    origin: "admin",
    requestedBy: null,
    decidedBy: "admin1",
    decidedAt: "2026-07-28T10:00:00Z",
    decisionComment: null,
    createdAt: "2026-07-28T10:00:00Z",
    ...overrides,
  };
}

describe("mapSuspension", () => {
  it("mappe la ligne brute snake_case en camelCase", () => {
    const row: SuspensionRow = {
      id: "s1",
      group_id: "g1",
      user_id: "u1",
      start_date: "2026-07-29",
      end_date: "2026-08-03",
      reason: "Blessure",
      status: "pending",
      origin: "request",
      requested_by: "u1",
      decided_by: null,
      decided_at: null,
      decision_comment: null,
      created_at: "2026-07-28T10:00:00Z",
    };
    const s = mapSuspension(row);
    expect(s.groupId).toBe("g1");
    expect(s.startDate).toBe("2026-07-29");
    expect(s.origin).toBe("request");
    expect(s.requestedBy).toBe("u1");
  });
});

describe("isSuspendedOn (bornes incluses, statut actif)", () => {
  it("vrai dans la plage, y compris aux bornes", () => {
    const s = make();
    expect(isSuspendedOn(s, "2026-07-29")).toBe(true); // borne début
    expect(isSuspendedOn(s, "2026-08-01")).toBe(true);
    expect(isSuspendedOn(s, "2026-08-03")).toBe(true); // borne fin
  });
  it("faux hors plage", () => {
    const s = make();
    expect(isSuspendedOn(s, "2026-07-28")).toBe(false);
    expect(isSuspendedOn(s, "2026-08-04")).toBe(false);
  });
  it("faux si la suspension n'est pas active", () => {
    expect(isSuspendedOn(make({ status: "pending" }), "2026-08-01")).toBe(false);
    expect(isSuspendedOn(make({ status: "rejected" }), "2026-08-01")).toBe(false);
    expect(isSuspendedOn(make({ status: "cancelled" }), "2026-08-01")).toBe(false);
  });
  it("tolère une date horodatée", () => {
    expect(isSuspendedOn(make(), "2026-08-01T14:30:00Z")).toBe(true);
  });
});

describe("activeSuspensionOn / isCurrentlySuspended", () => {
  it("trouve la suspension active couvrant la date", () => {
    const list = [make({ id: "a", status: "cancelled" }), make({ id: "b" })];
    expect(activeSuspensionOn(list, "2026-08-01")?.id).toBe("b");
    expect(isCurrentlySuspended(list, "2026-08-01")).toBe(true);
    expect(isCurrentlySuspended(list, "2026-09-01")).toBe(false);
  });
  it("null si aucune ne couvre", () => {
    expect(activeSuspensionOn([make()], "2027-01-01")).toBeNull();
  });
});

describe("pendingRequests", () => {
  it("ne garde que les demandes en attente", () => {
    const list = [make({ status: "pending" }), make({ status: "active" }), make({ status: "pending" })];
    expect(pendingRequests(list)).toHaveLength(2);
  });
});

describe("libellés", () => {
  it("plage courte du .. au ..", () => {
    expect(suspensionShortRange("2026-07-29", "2026-08-03")).toBe("du 29/07 au 03/08");
  });
  it("plage longue avec flèche", () => {
    expect(suspensionFullRange("2026-07-29", "2026-08-03")).toBe("29 juillet 2026 → 3 août 2026");
  });
  it("statut", () => {
    expect(suspensionStatusLabel("pending")).toBe("En attente");
    expect(suspensionStatusLabel("active")).toBe("Suspendu");
    expect(suspensionStatusLabel("rejected")).toBe("Refusée");
    expect(suspensionStatusLabel("cancelled")).toBe("Levée");
  });
});

describe("suspensionRequestError (validation formulaire)", () => {
  it("null quand tout est bon", () => {
    expect(
      suspensionRequestError({ startISO: "2026-07-29", endISO: "2026-08-03", reason: "Blessure" })
    ).toBeNull();
  });
  it("exige les deux dates", () => {
    expect(suspensionRequestError({ startISO: "", endISO: "2026-08-03", reason: "x" })).toMatch(
      /date de début/
    );
  });
  it("refuse une fin avant le début", () => {
    expect(
      suspensionRequestError({ startISO: "2026-08-03", endISO: "2026-07-29", reason: "x" })
    ).toMatch(/après le début/);
  });
  it("exige un motif", () => {
    expect(
      suspensionRequestError({ startISO: "2026-07-29", endISO: "2026-08-03", reason: "  " })
    ).toMatch(/motif/);
  });
});

describe("mapSuspensionError", () => {
  it("traduit les codes connus", () => {
    expect(mapSuspensionError("NOT_ADMIN")).toBe("Seul l'admin peut faire ça.");
    expect(mapSuspensionError("REASON_REQUIRED")).toBe("Explique le motif de ta demande.");
  });
  it("renvoie le code brut si inconnu", () => {
    expect(mapSuspensionError("WAT")).toBe("WAT");
  });
});
