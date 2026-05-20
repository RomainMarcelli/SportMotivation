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
    email: "romain@exemple.com",
    password: "motdepasse",
    confirmPassword: "motdepasse",
  };

  it("accepte une inscription valide", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it("rejette si les mots de passe diffèrent", () => {
    const result = signUpSchema.safeParse({ ...valid, confirmPassword: "different" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues.find((i) => i.path.includes("confirmPassword"))?.message;
      expect(msg).toBe("Les mots de passe ne correspondent pas");
    }
  });

  it("rejette un mot de passe de plus de 72 caractères", () => {
    const long = "a".repeat(73);
    const result = signUpSchema.safeParse({
      email: "a@b.com",
      password: long,
      confirmPassword: long,
    });
    expect(result.success).toBe(false);
  });
});
