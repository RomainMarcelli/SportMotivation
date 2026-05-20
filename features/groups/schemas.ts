import { z } from "zod";

export const DEADLINE_VALUES = ["same_day", "end_of_week"] as const;

const baseShape = {
  name: z.string().min(2, "2 caractères minimum").max(50, "50 caractères max").trim(),
  description: z.string().max(500, "500 caractères max").optional(),
  challengeStart: z.date({ message: "Date de début requise" }),
  challengeEnd: z.date({ message: "Date de fin requise" }),
  penaltyAmount: z
    .number({ message: "Montant requis" })
    .min(0, "Montant positif")
    .max(1000, "1000 € maximum"),
  acceptedActivities: z.array(z.string()).min(1, "Choisis au moins une activité"),
  minDurationMin: z
    .number({ message: "Durée requise" })
    .int("Nombre entier")
    .min(1, "Au moins 1 minute")
    .max(600, "600 minutes max"),
  publicationDeadline: z.enum(DEADLINE_VALUES),
  voteDeadline: z.enum(DEADLINE_VALUES),
  blameThreshold: z
    .number({ message: "Seuil requis" })
    .int("Nombre entier")
    .min(1, "Au moins 1")
    .max(10, "10 maximum"),
  maxExcuses: z.number().int().min(0).nullable(),
};

const datesRefine = (data: { challengeStart: Date; challengeEnd: Date }) =>
  data.challengeEnd > data.challengeStart;
const datesRefineOptions = {
  message: "La date de fin doit être après la date de début",
  path: ["challengeEnd"],
};

export const createGroupSchema = z.object(baseShape).refine(datesRefine, datesRefineOptions);

export type CreateGroupInput = z.infer<typeof createGroupSchema>;

/** Schéma du formulaire : ajoute l'objectif hebdo perso de l'admin + l'acceptation des règles. */
export const createGroupFormSchema = z
  .object({
    ...baseShape,
    weeklyTarget: z
      .number({ message: "Objectif requis" })
      .int("Nombre entier")
      .min(1, "Au moins 1 séance")
      .max(14, "14 séances maximum"),
    acceptRules: z.boolean(),
  })
  .refine(datesRefine, datesRefineOptions)
  .refine((data) => data.acceptRules === true, {
    message: "Tu dois accepter les règles",
    path: ["acceptRules"],
  });

export type CreateGroupFormInput = z.infer<typeof createGroupFormSchema>;

export const createGroupDefaults = {
  name: "",
  description: "",
  penaltyAmount: 5,
  acceptedActivities: [] as string[],
  minDurationMin: 30,
  publicationDeadline: "same_day" as const,
  voteDeadline: "end_of_week" as const,
  blameThreshold: 3,
  maxExcuses: null,
  weeklyTarget: 3,
  acceptRules: false as boolean,
};
