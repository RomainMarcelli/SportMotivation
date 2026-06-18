/**
 * Source unique des règles de robustesse du mot de passe.
 * Réutilisée par `components/auth/PasswordStrength.tsx` ET `features/auth/schemas.ts`
 * → UI et validation toujours synchrones.
 */

export type PasswordCheckKey = "minLength" | "uppercase" | "digit" | "special";

/** Critères affichés (ordre = ordre d'affichage). */
export const PASSWORD_CRITERIA: { key: PasswordCheckKey; label: string }[] = [
  { key: "minLength", label: "8 caractères min" },
  { key: "uppercase", label: "Une majuscule" },
  { key: "digit", label: "Un chiffre" },
  { key: "special", label: "Un caractère spécial" },
];

export type PasswordLevelLabel = "" | "Faible" | "Moyen" | "Bon" | "Fort";

export type PasswordChecks = {
  checks: Record<PasswordCheckKey, boolean>;
  /** Nombre de critères remplis (0–4). */
  satisfied: number;
  /** Niveau = nombre de critères (0–4). */
  level: 0 | 1 | 2 | 3 | 4;
  label: PasswordLevelLabel;
};

const LABELS: PasswordLevelLabel[] = ["", "Faible", "Moyen", "Bon", "Fort"];

export function getPasswordChecks(password: string): PasswordChecks {
  const checks: Record<PasswordCheckKey, boolean> = {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    digit: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const satisfied = Object.values(checks).filter(Boolean).length;
  const level = satisfied as 0 | 1 | 2 | 3 | 4;
  return { checks, satisfied, level, label: LABELS[satisfied] };
}

/** Vrai quand les 4 critères sont remplis. */
export function isPasswordStrong(password: string): boolean {
  return getPasswordChecks(password).satisfied === 4;
}
