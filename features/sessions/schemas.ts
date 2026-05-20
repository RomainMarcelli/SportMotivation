import { z } from "zod";

export const PROOF_TYPE_VALUES = ["photo", "strava", "external_link"] as const;
export type ProofType = (typeof PROOF_TYPE_VALUES)[number];

export type DeclareSessionSchemaOptions = {
  /** Durée minimale autorisée par le groupe (min). */
  minDuration: number;
  /** Liste des activités acceptées par le groupe. */
  acceptedActivities: string[];
};

/**
 * Construit le schéma de déclaration d'une séance. Les bornes (durée mini, activités
 * autorisées) dépendent de la config du groupe, d'où la fabrique. La validation finale
 * (membre actif, fenêtre de publication) reste faite côté serveur par `declare_session`.
 */
export function buildDeclareSessionSchema({
  minDuration,
  acceptedActivities,
}: DeclareSessionSchemaOptions) {
  return z
    .object({
      activityType: z
        .string()
        .min(1, "Choisis une activité")
        .refine((v) => acceptedActivities.includes(v), "Activité non autorisée par le groupe"),
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
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
      // Preuve lien externe
      externalUrl: z.string().optional(),
      externalDescription: z.string().max(500, "500 caractères max").optional(),
      // Preuve Strava
      stravaActivityId: z.string().optional(),
      stravaData: z.unknown().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.performedAt > endOfToday()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La date ne peut pas être dans le futur",
          path: ["performedAt"],
        });
      }
      if (data.proofType === "photo" && !data.photoUri) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Prends une photo via la caméra",
          path: ["photoUri"],
        });
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
      if (data.proofType === "strava" && !data.stravaActivityId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Sélectionne une activité Strava",
          path: ["stravaActivityId"],
        });
      }
    });
}

export type DeclareSessionInput = z.infer<ReturnType<typeof buildDeclareSessionSchema>>;

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export function isValidUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
