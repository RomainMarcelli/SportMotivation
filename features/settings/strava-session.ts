/**
 * Session Strava conservée entre deux lancements (logique pure, testable).
 *
 * Le stockage lui-même vit dans `lib/strava.ts` ; ici on ne fait que valider et
 * interpréter ce qui a été relu.
 */

export type StravaAthlete = {
  id: number;
  firstname: string | null;
  lastname: string | null;
};

export type StravaSession = {
  accessToken: string;
  refreshToken: string | null;
  /** Expiration en **secondes** epoch — c'est le format renvoyé par Strava. */
  expiresAt: number | null;
  athlete: StravaAthlete | null;
};

/** Marge avant expiration : un token qui expire dans 30 s est déjà mort en pratique. */
const EXPIRY_MARGIN_S = 120;

/**
 * Relit ce qui a été stocké sans jamais faire confiance à sa forme : un
 * stockage corrompu ou une version antérieure du format doit donner « pas de
 * session », pas un plantage au démarrage.
 */
export function parseStravaSession(raw: unknown): StravaSession | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;

  const accessToken = typeof data.accessToken === "string" ? data.accessToken : null;
  if (!accessToken) return null;

  return {
    accessToken,
    refreshToken: typeof data.refreshToken === "string" ? data.refreshToken : null,
    expiresAt: typeof data.expiresAt === "number" && data.expiresAt > 0 ? data.expiresAt : null,
    athlete: parseAthlete(data.athlete),
  };
}

function parseAthlete(raw: unknown): StravaAthlete | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (typeof data.id !== "number") return null;
  return {
    id: data.id,
    firstname: typeof data.firstname === "string" ? data.firstname : null,
    lastname: typeof data.lastname === "string" ? data.lastname : null,
  };
}

/**
 * Le jeton est-il périmé ? Sans date d'expiration connue on répond **oui** :
 * mieux vaut un rafraîchissement inutile qu'un appel qui échoue devant
 * l'utilisateur.
 */
export function isStravaSessionExpired(session: StravaSession, nowMs: number): boolean {
  if (session.expiresAt === null) return true;
  return session.expiresAt - EXPIRY_MARGIN_S <= Math.floor(nowMs / 1000);
}

/** « Romain M. » — le nom de l'athlète Strava, quand on le connaît. */
export function stravaAthleteLabel(session: StravaSession | null): string | null {
  if (!session?.athlete) return null;
  const { firstname, lastname } = session.athlete;
  const initial = lastname?.trim()?.[0];
  const parts = [firstname?.trim(), initial ? `${initial.toUpperCase()}.` : null].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}
