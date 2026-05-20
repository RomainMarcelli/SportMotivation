/**
 * Génère un code d'invitation à 6 chiffres (100000-999999).
 * L'unicité est garantie côté DB par une contrainte UNIQUE sur `groups.invite_code` :
 * en cas de collision (rare), l'insert échoue et on régénère.
 */
export function generateInviteCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Valide qu'une chaîne est un code d'invitation bien formé (exactement 6 chiffres). */
export function isValidInviteCode(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}

/** Normalise un code saisi par l'utilisateur (retire espaces et caractères non numériques). */
export function normalizeInviteCode(input: string): string {
  return input.replace(/\D/g, "").slice(0, 6);
}
