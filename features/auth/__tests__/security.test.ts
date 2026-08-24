import {
  emailChangeSchema,
  mapEmailChangeError,
  mapPasswordError,
  passwordChangeSchema,
  WRONG_CURRENT_PASSWORD,
} from "../security";

describe("passwordChangeSchema", () => {
  const valid = {
    currentPassword: "Ancien1!",
    newPassword: "Nouveau1!",
    confirmPassword: "Nouveau1!",
  };

  it("accepte un changement correct", () => {
    expect(passwordChangeSchema.safeParse(valid).success).toBe(true);
  });

  it("exige le mot de passe actuel", () => {
    expect(passwordChangeSchema.safeParse({ ...valid, currentPassword: "" }).success).toBe(false);
  });

  it("refuse une confirmation qui ne correspond pas", () => {
    const result = passwordChangeSchema.safeParse({ ...valid, confirmPassword: "Autre1!" });
    expect(result.success).toBe(false);
  });

  // Changer pour le même mot de passe est un faux positif classique : l'écran
  // dirait « modifié » alors que rien n'a bougé.
  it("refuse le même mot de passe qu'avant", () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: "Nouveau1!",
      newPassword: "Nouveau1!",
      confirmPassword: "Nouveau1!",
    });
    expect(result.success).toBe(false);
  });

  it("refuse un mot de passe faible", () => {
    expect(
      passwordChangeSchema.safeParse({
        currentPassword: "Ancien1!",
        newPassword: "azerty",
        confirmPassword: "azerty",
      }).success
    ).toBe(false);
  });
});

describe("emailChangeSchema", () => {
  it("accepte une adresse valide", () => {
    expect(emailChangeSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
  });

  it("refuse une adresse invalide ou vide", () => {
    expect(emailChangeSchema.safeParse({ email: "pas-une-adresse" }).success).toBe(false);
    expect(emailChangeSchema.safeParse({ email: "" }).success).toBe(false);
  });
});

describe("mapPasswordError", () => {
  it("traduit un mot de passe actuel erroné", () => {
    expect(mapPasswordError(WRONG_CURRENT_PASSWORD)).toBe("Mot de passe actuel incorrect.");
    expect(mapPasswordError("Invalid login credentials")).toBe("Mot de passe actuel incorrect.");
  });

  it("traduit un mot de passe identique", () => {
    expect(mapPasswordError("New password should be different from the old password")).toContain(
      "différent"
    );
  });

  it("traduit une limite de débit", () => {
    expect(mapPasswordError("email rate limit exceeded")).toContain("Réessaie");
  });

  // Un message inconnu vaut mieux qu'un « une erreur est survenue » qui n'aide
  // personne à comprendre.
  it("laisse passer un message inconnu", () => {
    expect(mapPasswordError("boom inattendu")).toBe("boom inattendu");
  });

  it("a un repli si le message est vide", () => {
    expect(mapPasswordError("")).toBe("Changement impossible. Réessaie.");
  });
});

describe("mapEmailChangeError", () => {
  it("traduit une adresse déjà prise", () => {
    expect(mapEmailChangeError("A user with this email address has already been registered")).toBe(
      "Cette adresse est déjà rattachée à un compte."
    );
  });

  it("traduit une limite de débit", () => {
    expect(mapEmailChangeError("For security purposes, you can only request this after 51s")).toContain(
      "Réessaie"
    );
  });

  it("laisse passer un message inconnu", () => {
    expect(mapEmailChangeError("étrange")).toBe("étrange");
  });
});
