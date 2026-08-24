import { completeProfileSchema } from "../profile-schemas";

describe("completeProfileSchema", () => {
  const valid = { firstName: "Romain", lastName: "Martin", username: "romz" };

  it("accepte un profil valide", () => {
    expect(completeProfileSchema.safeParse(valid).success).toBe(true);
  });

  it("rejette un prénom vide", () => {
    expect(completeProfileSchema.safeParse({ ...valid, firstName: "" }).success).toBe(false);
  });

  it("rejette un pseudo trop court", () => {
    const result = completeProfileSchema.safeParse({ ...valid, username: "ab" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("3 caractères minimum");
    }
  });

  it("rejette un pseudo avec des caractères interdits", () => {
    const result = completeProfileSchema.safeParse({ ...valid, username: "rom z!" });
    expect(result.success).toBe(false);
  });

  it("accepte un pseudo avec tirets, points et underscores", () => {
    expect(
      completeProfileSchema.safeParse({ ...valid, username: "rom_z.martin-01" }).success
    ).toBe(true);
  });

  it("trim les espaces autour du prénom", () => {
    const result = completeProfileSchema.safeParse({ ...valid, firstName: "  Romain  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).toBe("Romain");
    }
  });

  // Le nom n'est JAMAIS demandé à l'inscription : l'exiger bloquait l'écran Profil
  // sur une information que l'utilisateur n'a jamais saisie.
  describe("nom (optionnel)", () => {
    it("accepte un profil sans nom", () => {
      const { lastName: _omit, ...sansNom } = valid;
      expect(completeProfileSchema.safeParse(sansNom).success).toBe(true);
    });

    it("accepte un nom vide", () => {
      expect(completeProfileSchema.safeParse({ ...valid, lastName: "" }).success).toBe(true);
    });

    it("rejette encore un nom trop long", () => {
      const result = completeProfileSchema.safeParse({ ...valid, lastName: "a".repeat(51) });
      expect(result.success).toBe(false);
    });

    it("conserve le nom quand il est fourni", () => {
      const result = completeProfileSchema.safeParse({ ...valid, lastName: "  Martin  " });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.lastName).toBe("Martin");
    });
  });
});
