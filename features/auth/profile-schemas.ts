import { z } from "zod";

export const completeProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, "Prénom requis")
    .max(50, "50 caractères max")
    .trim(),
  lastName: z
    .string()
    .min(1, "Nom requis")
    .max(50, "50 caractères max")
    .trim(),
  username: z
    .string()
    .min(3, "3 caractères minimum")
    .max(30, "30 caractères max")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Lettres, chiffres, _ . - uniquement")
    .trim(),
});

export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
