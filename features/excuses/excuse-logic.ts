/**
 * Logique d'excuse (pure, testable). Une excuse justifie une semaine où le membre ne tiendra pas
 * son objectif. Elle est **soumise au vote du groupe** (majorité simple, l'auteur ne vote pas).
 * Les CONSÉQUENCES (exemption de pénalité, reset de semaine) = Étape 9 → pas ici.
 *
 * NB : l'enum DB `excuse_type` vaut `standard` | `major` (la maquette parle d'« excuse majeure »).
 */

export type ExcuseType = "standard" | "major";
export type ExcuseOutcome = "pending_vote" | "accepted" | "rejected";

export type ExcuseTypeInfo = {
  value: ExcuseType;
  name: string;
  desc: string;
  /** Effet annoncé (calcul réel = Étape 9). */
  effect: string;
  tone: "warn" | "ok";
};

/** Cartes radio « Type d'excuse » (ordre = maquette). */
export const EXCUSE_TYPES: readonly ExcuseTypeInfo[] = [
  {
    value: "standard",
    name: "Excuse standard",
    desc: "Empêchement ponctuel : gastro, déplacement pro, imprévu perso.",
    effect: "−1 séance cette semaine",
    tone: "warn",
  },
  {
    value: "major",
    name: "Excuse majeure",
    desc: "Cas exceptionnel : hospitalisation, blessure grave, événement familial.",
    effect: "Semaine annulée · 0 pénalité",
    tone: "ok",
  },
] as const;

/** Suggestions de motif par type (chips de la maquette). */
export const EXCUSE_MOTIFS: Record<ExcuseType, readonly string[]> = {
  standard: ["Gastro", "Déplacement pro", "Imprévu perso", "Grosse fatigue"],
  major: ["Hospitalisation", "Blessure", "Événement familial"],
};

/** Seuil de majorité simple des AUTRES membres (l'auteur ne vote pas son excuse). */
export function excuseThreshold(otherMembers: number): number {
  if (otherMembers <= 0) return 1;
  return Math.floor(otherMembers / 2) + 1;
}

/**
 * Résolution d'un scrutin d'excuse (majorité simple) :
 * - oui ≥ seuil → acceptée ; non ≥ seuil → refusée ;
 * - sinon, si tout le monde a voté → majorité simple (égalité = acceptée, bénéfice du doute) ;
 * - sinon → toujours en attente.
 */
export function resolveExcuse(opts: {
  yes: number;
  no: number;
  otherMembers: number;
}): ExcuseOutcome {
  const { yes, no, otherMembers } = opts;
  const threshold = excuseThreshold(otherMembers);
  if (yes >= threshold) return "accepted";
  if (no >= threshold) return "rejected";

  const everyoneVoted = otherMembers > 0 && yes + no >= otherMembers;
  if (everyoneVoted) return yes >= no ? "accepted" : "rejected";
  return "pending_vote";
}

/** Le motif (textarea) est-il valable pour soumettre ? */
export function isExcuseReasonValid(reason: string): boolean {
  return reason.trim().length > 0;
}
