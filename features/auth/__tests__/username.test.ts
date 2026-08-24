import { isEmailTakenError, isUsernameTakenError } from "../username";

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
