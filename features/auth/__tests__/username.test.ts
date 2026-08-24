import {
  buildUsernameCandidates,
  isEmailTakenError,
  isUsernameTakenError,
  sanitizeUsernameBase,
} from "../username";

describe("isUsernameTakenError", () => {
  it("reconnaît une violation de contrainte unique PostgreSQL", () => {
    expect(
      isUsernameTakenError({
        code: "23505",
        message: 'duplicate key value violates unique constraint "users_username_key"',
      })
    ).toBe(true);
  });

  it("reconnaît le message sans code", () => {
    expect(isUsernameTakenError({ message: "username already exists" })).toBe(true);
  });

  it("lit aussi le champ details", () => {
    expect(
      isUsernameTakenError({
        code: "23505",
        message: "duplicate key",
        details: "Key (username)=(romz) already exists.",
      })
    ).toBe(true);
  });

  // Une contrainte unique sur l'e-mail ne doit pas accuser le pseudo.
  it("ne confond pas avec une collision d'e-mail", () => {
    expect(
      isUsernameTakenError({ code: "23505", message: "duplicate key on users_email_key" })
    ).toBe(false);
  });

  it("ignore une erreur quelconque", () => {
    expect(isUsernameTakenError({ message: "network error" })).toBe(false);
    expect(isUsernameTakenError({})).toBe(false);
  });
});

describe("isEmailTakenError", () => {
  it("reconnaît le message de Supabase", () => {
    expect(isEmailTakenError({ message: "User already registered" })).toBe(true);
  });

  it("reconnaît le code d'erreur récent", () => {
    expect(isEmailTakenError({ code: "user_already_exists", message: "" })).toBe(true);
  });

  // Confirmation d'e-mail activée : Supabase ne renvoie AUCUNE erreur, on la
  // fabrique nous-mêmes (cf. `useSignUp`).
  it("reconnaît la sentinelle du compte factice", () => {
    expect(isEmailTakenError({ message: "EMAIL_ALREADY_REGISTERED" })).toBe(true);
  });

  // Un pseudo pris contient lui aussi « already » : l'annoncer comme un
  // problème d'e-mail envoyait corriger le mauvais champ.
  it("ne confond pas avec un pseudo déjà pris", () => {
    expect(isEmailTakenError({ message: "username already exists" })).toBe(false);
    expect(
      isEmailTakenError({
        code: "23505",
        message: 'duplicate key value violates unique constraint "users_username_key"',
      })
    ).toBe(false);
  });

  it("ignore le reste", () => {
    expect(isEmailTakenError({ message: "boom" })).toBe(false);
    expect(isEmailTakenError({})).toBe(false);
  });
});

describe("sanitizeUsernameBase", () => {
  it("retire les caractères interdits", () => {
    expect(sanitizeUsernameBase("romain!!")).toBe("romain");
    expect(sanitizeUsernameBase("ro m@in")).toBe("romin");
  });

  it("conserve les caractères autorisés et enlève les espaces autour", () => {
    expect(sanitizeUsernameBase("  rom_z.a-b  ")).toBe("rom_z.a-b");
  });

  it("borne la longueur à 26 caractères", () => {
    expect(sanitizeUsernameBase("a".repeat(40))).toHaveLength(26);
  });
});

describe("buildUsernameCandidates", () => {
  it("propose la base suivie de numéros, dans l'ordre", () => {
    const out = buildUsernameCandidates("romain");
    expect(out[0]).toBe("romain1");
    expect(out[1]).toBe("romain2");
    expect(out.length).toBeGreaterThanOrEqual(3);
  });

  it("ne génère que des candidats valides (≤ 30 car., jeu de caractères du schéma)", () => {
    for (const cand of buildUsernameCandidates("a".repeat(40))) {
      expect(cand.length).toBeLessThanOrEqual(30);
      expect(cand).toMatch(/^[a-zA-Z0-9_.-]+$/);
    }
  });

  it("nettoie la base avant de suffixer", () => {
    expect(buildUsernameCandidates("rom@in")[0]).toBe("romin1");
  });

  it("ne renvoie rien pour une base trop courte / vide", () => {
    expect(buildUsernameCandidates("!")).toEqual([]);
    expect(buildUsernameCandidates("  ")).toEqual([]);
  });

  it("ne contient pas de doublon", () => {
    const out = buildUsernameCandidates("romain");
    expect(new Set(out).size).toBe(out.length);
  });
});
