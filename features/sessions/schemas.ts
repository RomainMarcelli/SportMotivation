import { z } from "zod";

import { isDeclarableDate, isSameLocalDay } from "./dates";

export const PROOF_TYPE_VALUES = ["photo", "strava", "external_link"] as const;
export type ProofType = (typeof PROOF_TYPE_VALUES)[number];

export type DeclareSessionSchemaOptions = {
  /** Durée minimale autorisée par le groupe (min). */
  minDuration: number;
  /** Liste des activités acceptées (sert au warning côté écran, plus à bloquer la validation). */
  acceptedActivities: string[];
};

/**
 * Construit le schéma de déclaration d'une séance. La durée mini dépend de la config du
 * groupe, d'où la fabrique. L'activité « hors liste » n'est PLUS bloquante ici (l'écran
 * affiche un avertissement avec choix de continuer) ; la validation finale (membre actif,
 * fenêtre de publication) reste faite côté serveur par `declare_session`.
 */
export function buildDeclareSessionSchema({ minDuration }: DeclareSessionSchemaOptions) {
  return z
    .object({
      activityType: z.string().min(1, "Choisis une activité"),
      durationMin: z
        .number({ message: "Durée requise" })
        .int("Nombre entier")
        .min(minDuration, `Au moins ${minDuration} minutes`)
        .max(600, "600 minutes max"),
      performedAt: z.date({ message: "Date requise" }),
      comment: z.string().max(500, "500 caractères max").optional(),
      proofType: z.enum(PROOF_TYPE_VALUES),
      // Preuve photo : chemin local du fichier capturé (uploadé ensuite vers Storage)
      photoUri: z.string().optional(),
      /** Date EXIF d'une photo issue de la galerie (anti-fraude ; absente pour une capture caméra). */
      photoTakenAt: z.date().nullable().optional(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
      // Preuve lien externe
      externalUrl: z.string().optional(),
      externalDescription: z.string().max(500, "500 caractères max").optional(),
      // Preuve Strava
      stravaActivityId: z.string().optional(),
      stravaData: z.unknown().optional(),
      /** Date de l'activité Strava sélectionnée (anti-fraude). */
      stravaActivityDate: z.date().nullable().optional(),
    })
    .superRefine((data, ctx) => {
      // Date : semaine en cours (lundi→dimanche), jamais dans le futur.
      if (!isDeclarableDate(data.performedAt, new Date())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Choisis une date de cette semaine (sans aller dans le futur)",
          path: ["performedAt"],
        });
      }

      if (data.proofType === "photo") {
        if (!data.photoUri) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Ajoute une photo (caméra ou galerie)",
            path: ["photoUri"],
          });
        }
        // Photo de galerie : sa date doit correspondre au jour déclaré.
        if (data.photoTakenAt && !isSameLocalDay(data.photoTakenAt, data.performedAt)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "La photo ne date pas du jour déclaré",
            path: ["photoUri"],
          });
        }
      }

      if (data.proofType === "external_link") {
        if (!isValidUrl(data.externalUrl)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Lien invalide",
            path: ["externalUrl"],
          });
        }
        if (!data.photoUri) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Une capture d'écran est obligatoire",
            path: ["photoUri"],
          });
        }
        if (!data.externalDescription || data.externalDescription.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Une description est obligatoire",
            path: ["externalDescription"],
          });
        }
      }

      if (data.proofType === "strava") {
        if (!data.stravaActivityId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Sélectionne une activité Strava",
            path: ["stravaActivityId"],
          });
        }
        // L'activité Strava doit correspondre au jour déclaré.
        if (data.stravaActivityDate && !isSameLocalDay(data.stravaActivityDate, data.performedAt)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Cette activité Strava ne date pas du jour déclaré",
            path: ["stravaActivityId"],
          });
        }
      }
    });
}

export type DeclareSessionInput = z.infer<ReturnType<typeof buildDeclareSessionSchema>>;

export function isValidUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
