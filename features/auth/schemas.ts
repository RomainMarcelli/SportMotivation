import { z } from "zod";

import { isPasswordStrong } from "@/lib/password";

export const signInSchema = z.object({
  email: z.string().min(1, "Email requis").email("Email invalide"),
  password: z.string().min(8, "8 caractères minimum"),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    email: z.string().min(1, "Email requis").email("Email invalide"),
    password: z
      .string()
      .min(1, "Mot de passe requis")
      .max(72, "72 caractères maximum")
      .refine(isPasswordStrong, "8 caractères, 1 majuscule, 1 chiffre et 1 caractère spécial"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;
