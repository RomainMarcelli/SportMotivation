import type { ProofType } from "./schemas";

export const PROOF_TYPE_LABELS: Record<ProofType, string> = {
  photo: "Photo (caméra)",
  strava: "Strava",
  external_link: "Lien externe",
};

export function getProofTypeLabel(type: ProofType): string {
  return PROOF_TYPE_LABELS[type] ?? type;
}

export type ProofPresentation = {
  dataSource: "Saisie manuelle" | "Strava";
  proofType: "Photo" | "Strava" | "Lien externe" | "Non renseignée";
};

/**
 * La source est dérivée de la preuve : aucune colonne redondante dans `sessions`.
 * Une séance historique sans preuve reste une saisie manuelle non renseignée.
 */
export function proofPresentation(type: ProofType | null | undefined): ProofPresentation {
  if (type === "strava") return { dataSource: "Strava", proofType: "Strava" };
  if (type === "photo") return { dataSource: "Saisie manuelle", proofType: "Photo" };
  if (type === "external_link") {
    return { dataSource: "Saisie manuelle", proofType: "Lien externe" };
  }
  return { dataSource: "Saisie manuelle", proofType: "Non renseignée" };
}

const SESSION_ERROR_MESSAGES: Record<string, string> = {
  NOT_MEMBER: "Tu n'es pas membre de ce groupe.",
  GROUP_NOT_FOUND: "Groupe introuvable.",
  GROUP_NOT_ACTIVE: "Le défi de ce groupe n'est pas en cours.",
  ACTIVITY_NOT_ALLOWED: "Cette activité n'est pas autorisée par le groupe.",
  ACTIVITY_REQUIRED: "Précise l'activité de ta séance.",
  DURATION_TOO_SHORT: "La durée est inférieure au minimum du groupe.",
  DURATION_TOO_LONG: "La durée ne peut pas dépasser 1440 minutes.",
  DISTANCE_INVALID: "La distance doit être supérieure à 0 et ne pas dépasser 5000 km.",
  DATE_REQUIRED: "Choisis la date de ta séance.",
  DATE_IN_FUTURE: "La séance ne peut pas être dans le futur.",
  PUBLICATION_TOO_LATE: "Ce groupe n'accepte les séances que le jour même.",
  DAILY_LIMIT_REACHED: "Tu as atteint la limite de séances pour ce jour.",
};

/** Le serveur a refusé la déclaration parce que la limite du jour est atteinte. */
export function isDailyLimitError(message: string): boolean {
  return message.includes("DAILY_LIMIT_REACHED");
}

/** Traduit un code d'erreur de `declare_session` en message lisible (sinon renvoie le brut). */
export function mapSessionError(code: string): string {
  return SESSION_ERROR_MESSAGES[code] ?? code;
}
