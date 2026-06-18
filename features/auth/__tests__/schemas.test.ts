import { signInSchema, signUpSchema } from "../schemas";

describe("signInSchema", () => {
  it("accepte un email et mot de passe valides", () => {
    const result = signInSchema.safeParse({ email: "romain@exemple.com", password: "motdepasse" });
    expect(result.success).toBe(true);
  });

  it("rejette un email vide", () => {
    const result = signInSchema.safeParse({ email: "", password: "motdepasse" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Email requis");
    }
  });

  it("rejette un email invalide", () => {
    const result = signInSchema.safeParse({ email: "pasunemail", password: "motdepasse" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Email invalide");
    }
  });

  it("rejette un mot de passe trop court", () => {
    const result = signInSchema.safeParse({ email: "a@b.com", password: "court" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("8 caractères minimum");
    }
  });
});

describe("signUpSchema", () => {
  const valid = {
    firstName: "Romain",
    username: "romz",
    email: "romain@exemple.com",
    password: "Motdepasse1!",
    confirmPassword: "Motdepasse1!",
  };

  it("accepte une inscription valide (mot de passe fort)", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it("rejette un prénom vide", () => {
    const result = signUpSchema.safeParse({ ...valid, firstName: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues.find((i) => i.path.includes("firstName"))?.message;
      expect(msg).toBe("Prénom requis");
    }
  });

  it("rejette un pseudo invalide", () => {
    const result = signUpSchema.safeParse({ ...valid, username: "ro mz!" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("username"))).toBe(true);
    }
  });

  it("rejette un mot de passe trop faible", () => {
    const result = signUpSchema.safeParse({
      ...valid,
      password: "motdepasse",
      confirmPassword: "motdepasse",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues.find((i) => i.path.includes("password"))?.message;
      expect(msg).toBe("8 caractères, 1 majuscule, 1 chiffre et 1 caractère spécial");
    }
  });

  it("rejette si les mots de passe diffèrent", () => {
    const result = signUpSchema.safeParse({ ...valid, confirmPassword: "Different1!" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues.find((i) => i.path.includes("confirmPassword"))?.message;
      expect(msg).toBe("Les mots de passe ne correspondent pas");
    }
  });

  it("rejette un mot de passe de plus de 72 caractères", () => {
    const long = "A1!".concat("a".repeat(70)); // 73 caractères, fort mais trop long
    const result = signUpSchema.safeParse({ ...valid, password: long, confirmPassword: long });
    expect(result.success).toBe(false);
  });
});
