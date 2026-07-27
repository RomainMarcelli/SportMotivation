import { createGroupFormSchema, createGroupSchema } from "../schemas";

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
    maxSessionsPerDay: 3 as number | null,
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

  it("accepte maxSessionsPerDay null (sans limite)", () => {
    expect(
      createGroupSchema.safeParse({ ...makeValidInput(), maxSessionsPerDay: null }).success
    ).toBe(true);
  });

  it("rejette maxSessionsPerDay à 0 (utiliser null pour illimité)", () => {
    expect(
      createGroupSchema.safeParse({ ...makeValidInput(), maxSessionsPerDay: 0 }).success
    ).toBe(false);
  });
});

// Le schéma du FORMULAIRE ajoute l'objectif hebdo perso de l'admin et
// l'acceptation obligatoire des règles. C'est celui réellement câblé à l'écran
// de création — d'où l'importance de le tester à part du schéma « métier ».
describe("createGroupFormSchema", () => {
  function makeValidForm() {
    return { ...makeValidInput(), weeklyTarget: 4, acceptRules: true };
  }

  it("accepte un formulaire complet et coché", () => {
    expect(createGroupFormSchema.safeParse(makeValidForm()).success).toBe(true);
  });

  // Garde-fou central : impossible de créer un défi sans avoir accepté les règles.
  it("refuse tant que les règles ne sont pas acceptées", () => {
    const result = createGroupFormSchema.safeParse({ ...makeValidForm(), acceptRules: false });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues.find((i) => i.path.includes("acceptRules"))?.message;
      expect(msg).toBe("Tu dois accepter les règles");
    }
  });

  it("borne l'objectif hebdomadaire entre 1 et 14", () => {
    expect(createGroupFormSchema.safeParse({ ...makeValidForm(), weeklyTarget: 0 }).success).toBe(
      false
    );
    expect(createGroupFormSchema.safeParse({ ...makeValidForm(), weeklyTarget: 15 }).success).toBe(
      false
    );
    expect(createGroupFormSchema.safeParse({ ...makeValidForm(), weeklyTarget: 7 }).success).toBe(
      true
    );
  });

  // La contrainte de dates du schéma métier reste active sur le formulaire.
  it("hérite de la règle « fin après début »", () => {
    const result = createGroupFormSchema.safeParse({
      ...makeValidForm(),
      challengeStart: new Date("2026-08-31"),
      challengeEnd: new Date("2026-06-01"),
    });
    expect(result.success).toBe(false);
  });
});
