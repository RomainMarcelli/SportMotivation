import {
  isStravaSessionExpired,
  parseStravaSession,
  stravaAthleteLabel,
  stravaScopeHasActivityRead,
  type StravaSession,
} from "../strava-session";

const NOW = new Date(2026, 6, 22, 14, 0, 0).getTime();
const NOW_S = Math.floor(NOW / 1000);

function session(over: Partial<StravaSession> = {}): StravaSession {
  return {
    accessToken: "token",
    refreshToken: "refresh",
    expiresAt: NOW_S + 3600,
    athlete: { id: 1, firstname: "Romain", lastname: "Marcelli" },
    scope: "read,activity:read_all",
    ...over,
  };
}

describe("parseStravaSession", () => {
  it("lit une session complète", () => {
    const parsed = parseStravaSession({
      accessToken: "abc",
      refreshToken: "def",
      expiresAt: 1234,
      athlete: { id: 7, firstname: "Léa", lastname: "Dupont" },
    });
    expect(parsed?.accessToken).toBe("abc");
    expect(parsed?.athlete?.id).toBe(7);
  });

  // Un stockage corrompu ne doit pas planter l'app au démarrage.
  it("refuse ce qui n'a pas de jeton", () => {
    expect(parseStravaSession(null)).toBeNull();
    expect(parseStravaSession("boom")).toBeNull();
    expect(parseStravaSession({})).toBeNull();
    expect(parseStravaSession({ accessToken: 42 })).toBeNull();
  });

  it("accepte une session sans athlète ni expiration", () => {
    const parsed = parseStravaSession({ accessToken: "abc" });
    expect(parsed).toEqual({
      accessToken: "abc",
      refreshToken: null,
      expiresAt: null,
      athlete: null,
      scope: null,
    });
  });

  it("lit le scope quand il est présent, null sinon", () => {
    expect(parseStravaSession({ accessToken: "a", scope: "read,activity:read_all" })?.scope).toBe(
      "read,activity:read_all"
    );
    expect(parseStravaSession({ accessToken: "a" })?.scope).toBeNull();
    expect(parseStravaSession({ accessToken: "a", scope: 42 })?.scope).toBeNull();
  });

  it("ignore un athlète mal formé", () => {
    expect(parseStravaSession({ accessToken: "a", athlete: { firstname: "X" } })?.athlete).toBeNull();
  });
});

describe("isStravaSessionExpired", () => {
  it("accepte un jeton encore valable", () => {
    expect(isStravaSessionExpired(session(), NOW)).toBe(false);
  });

  it("détecte un jeton périmé", () => {
    expect(isStravaSessionExpired(session({ expiresAt: NOW_S - 10 }), NOW)).toBe(true);
  });

  // Marge de sécurité : un jeton qui expire dans 30 s ne survivra pas à l'appel.
  it("périme d'avance ce qui expire dans quelques secondes", () => {
    expect(isStravaSessionExpired(session({ expiresAt: NOW_S + 30 }), NOW)).toBe(true);
  });

  // Sans date connue, mieux vaut un rafraîchissement inutile qu'un appel raté.
  it("considère périmé ce dont on ignore l'expiration", () => {
    expect(isStravaSessionExpired(session({ expiresAt: null }), NOW)).toBe(true);
  });
});

describe("stravaScopeHasActivityRead", () => {
  it("vrai si le scope autorise la lecture des activités", () => {
    expect(stravaScopeHasActivityRead("read,activity:read_all")).toBe(true);
    expect(stravaScopeHasActivityRead("read,activity:read")).toBe(true);
    expect(stravaScopeHasActivityRead("activity:read_all")).toBe(true);
  });

  it("faux si le scope se limite au profil (cause du 403)", () => {
    expect(stravaScopeHasActivityRead("read")).toBe(false);
    expect(stravaScopeHasActivityRead("read_all")).toBe(false); // profil, pas activités
    expect(stravaScopeHasActivityRead(null)).toBe(false);
    expect(stravaScopeHasActivityRead("")).toBe(false);
  });
});

describe("stravaAthleteLabel", () => {
  it("abrège le nom de famille", () => {
    expect(stravaAthleteLabel(session())).toBe("Romain M.");
  });

  it("se contente du prénom", () => {
    expect(stravaAthleteLabel(session({ athlete: { id: 1, firstname: "Romain", lastname: null } })))
      .toBe("Romain");
  });

  it("ne renvoie rien sans athlète", () => {
    expect(stravaAthleteLabel(null)).toBeNull();
    expect(stravaAthleteLabel(session({ athlete: null }))).toBeNull();
    expect(
      stravaAthleteLabel(session({ athlete: { id: 1, firstname: null, lastname: null } }))
    ).toBeNull();
  });
});
