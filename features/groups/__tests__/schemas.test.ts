import { createGroupSchema } from "../schemas";

function makeValidInput() {
  return {
    name: "Les Sportifs",
    description: "Notre défi de l'été",
    challengeStart: new Date("2026-06-01"),
    challengeEnd: new Date("2026-08-31"),
    penaltyAmount: 5,
    acceptedActivities: ["running", "weight_training"],
    minDurationMin: 30,
    publicationDeadline: "same_day" as const,
    voteDeadline: "end_of_week" as const,
    blameThreshold: 3,
    maxExcuses: null,
  };
}

describe("createGroupSchema", () => {
  it("accepte un groupe valide", () => {
    expect(createGroupSchema.safeParse(makeValidInput()).success).toBe(true);
  });

  it("rejette un nom trop court", () => {
    const result = createGroupSchema.safeParse({ ...makeValidInput(), name: "X" });
    expect(result.success).toBe(false);
  });

  it("rejette si aucune activité sélectionnée", () => {
    const result = createGroupSchema.safeParse({ ...makeValidInput(), acceptedActivities: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Choisis au moins une activité");
    }
  });

  it("rejette si la date de fin est avant la date de début", () => {
    const result = createGroupSchema.safeParse({
      ...makeValidInput(),
      challengeStart: new Date("2026-08-31"),
      challengeEnd: new Date("2026-06-01"),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues.find((i) => i.path.includes("challengeEnd"))?.message;
      expect(msg).toBe("La date de fin doit être après la date de début");
    }
  });

  it("rejette un montant de pénalité négatif", () => {
    expect(createGroupSchema.safeParse({ ...makeValidInput(), penaltyAmount: -1 }).success).toBe(
      false
    );
  });

  it("rejette une durée minimum non entière", () => {
    expect(createGroupSchema.safeParse({ ...makeValidInput(), minDurationMin: 30.5 }).success).toBe(
      false
    );
  });

  it("accepte maxExcuses null (illimité)", () => {
    expect(createGroupSchema.safeParse({ ...makeValidInput(), maxExcuses: null }).success).toBe(
      true
    );
  });
});
