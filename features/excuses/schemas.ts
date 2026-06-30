import { z } from "zod";

/** Formulaire « Déclarer une excuse » (maquette) : type + motif obligatoire. */
export const excuseFormSchema = z.object({
  excuseType: z.enum(["standard", "major"]),
  reason: z.string().trim().min(1, "Le motif est obligatoire").max(500, "500 caractères max"),
});

export type ExcuseFormInput = z.infer<typeof excuseFormSchema>;
