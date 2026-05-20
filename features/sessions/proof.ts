import type { ProofType } from "./schemas";

export const PROOF_TYPE_LABELS: Record<ProofType, string> = {
  photo: "Photo (caméra)",
  strava: "Strava",
  external_link: "Lien externe",
};

export function getProofTypeLabel(type: ProofType): string {
  return PROOF_TYPE_LABELS[type] ?? type;
}

const SESSION_ERROR_MESSAGES: Record<string, string> = {
  NOT_MEMBER: "Tu n'es pas membre de ce groupe.",
  GROUP_NOT_FOUND: "Groupe introuvable.",
  GROUP_NOT_ACTIVE: "Le défi de ce groupe n'est pas en cours.",
  ACTIVITY_NOT_ALLOWED: "Cette activité n'est pas autorisée par le groupe.",
  DURATION_TOO_SHORT: "La durée est inférieure au minimum du groupe.",
  DATE_IN_FUTURE: "La séance ne peut pas être dans le futur.",
  PUBLICATION_TOO_LATE: "Ce groupe n'accepte les séances que le jour même.",
};

/** Traduit un code d'erreur de `declare_session` en message lisible (sinon renvoie le brut). */
export function mapSessionError(code: string): string {
  return SESSION_ERROR_MESSAGES[code] ?? code;
}
