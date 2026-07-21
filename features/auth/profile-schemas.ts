import { z } from "zod";

export const completeProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, "Prénom requis")
    .max(50, "50 caractères max")
    .trim(),
  // Optionnel : le nom n'est JAMAIS demandé à l'inscription (hors maquette). L'exiger ici
  // bloquait l'écran Profil sur une information que l'utilisateur n'a jamais saisie.
  lastName: z.string().max(50, "50 caractères max").trim().optional(),
  username: z
    .string()
    .min(3, "3 caractères minimum")
    .max(30, "30 caractères max")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Lettres, chiffres, _ . - uniquement")
    .trim(),
});

export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
