/**
 * Sécurité du compte : changement de mot de passe et d'adresse e-mail.
 *
 * Les deux passent par `supabase.auth.updateUser` — aucune table applicative
 * n'est concernée, c'est l'authentification elle-même qu'on modifie.
 */

import { useMutation } from "@tanstack/react-query";
import { z } from "zod";

import { isPasswordStrong } from "@/lib/password";
import { supabase } from "@/lib/supabase";

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Mot de passe actuel requis"),
    newPassword: z
      .string()
      .min(1, "Mot de passe requis")
      .max(72, "72 caractères maximum")
      .refine(isPasswordStrong, "8 caractères, 1 majuscule, 1 chiffre et 1 caractère spécial"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "Choisis un mot de passe différent de l'actuel",
    path: ["newPassword"],
  });

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

export const emailChangeSchema = z.object({
  email: z.string().min(1, "Adresse requise").email("Adresse e-mail invalide"),
});

export type EmailChangeInput = z.infer<typeof emailChangeSchema>;

/** Sentinelle : le mot de passe actuel saisi ne correspond pas. */
export const WRONG_CURRENT_PASSWORD = "WRONG_CURRENT_PASSWORD";

const PASSWORD_ERRORS: { test: RegExp; message: string }[] = [
  {
    test: /WRONG_CURRENT_PASSWORD|invalid login credentials/i,
    message: "Mot de passe actuel incorrect.",
  },
  {
    test: /should be different|same.*password/i,
    message: "Le nouveau mot de passe doit être différent de l'ancien.",
  },
  {
    test: /rate limit|too many/i,
    message: "Trop de tentatives. Réessaie dans quelques minutes.",
  },
  {
    test: /weak|password.*short|at least/i,
    message: "Mot de passe trop faible : 8 caractères, 1 majuscule, 1 chiffre, 1 spécial.",
  },
  {
    test: /network|fetch/i,
    message: "Connexion impossible. Vérifie ta connexion internet.",
  },
];

/** Message lisible pour un échec de changement de mot de passe. */
export function mapPasswordError(message: string): string {
  const found = PASSWORD_ERRORS.find((entry) => entry.test.test(message));
  return found ? found.message : message || "Changement impossible. Réessaie.";
}

const EMAIL_ERRORS: { test: RegExp; message: string }[] = [
  {
    test: /already registered|already been registered|email address is already|already exists/i,
    message: "Cette adresse est déjà rattachée à un compte.",
  },
  {
    test: /same.*email|should be different/i,
    message: "C'est déjà ton adresse actuelle.",
  },
  {
    test: /rate limit|too many|security purposes/i,
    message: "Trop de demandes. Réessaie dans quelques minutes.",
  },
  {
    test: /invalid.*email|unable to validate/i,
    message: "Adresse e-mail invalide.",
  },
  {
    test: /reauthentication|session/i,
    message: "Reconnecte-toi puis réessaie : la demande doit être récente.",
  },
  {
    test: /network|fetch/i,
    message: "Connexion impossible. Vérifie ta connexion internet.",
  },
];

/** Message lisible pour un échec de changement d'adresse. */
export function mapEmailChangeError(message: string): string {
  const found = EMAIL_ERRORS.find((entry) => entry.test.test(message));
  return found ? found.message : message || "Changement impossible. Réessaie.";
}

/**
 * Change le mot de passe.
 *
 * Supabase n'exige pas l'ancien mot de passe pour `updateUser` : une session
 * ouverte suffit. On le demande quand même et on le **vérifie** — sinon un
 * téléphone déverrouillé laissé sans surveillance suffit à se faire voler son
 * compte. La vérification passe par une reconnexion, qui rafraîchit la session
 * de l'utilisateur courant sans le déconnecter.
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: {
      email: string;
      currentPassword: string;
      newPassword: string;
    }) => {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.currentPassword,
      });
      if (signInError) throw new Error(WRONG_CURRENT_PASSWORD);

      const { error } = await supabase.auth.updateUser({ password: input.newPassword });
      if (error) throw error;
    },
  });
}

/**
 * Demande le changement d'adresse e-mail.
 *
 * Rien ne change tant que le lien reçu **à la nouvelle adresse** n'est pas
 * cliqué : c'est ce qui garantit qu'on ne rattache pas un compte à une adresse
 * qu'on ne possède pas. L'écran doit donc annoncer une demande envoyée, pas un
 * changement effectué.
 */
export function useChangeEmail() {
  return useMutation({
    mutationFn: async (input: { email: string }) => {
      const { error } = await supabase.auth.updateUser({ email: input.email.trim() });
      if (error) throw error;
    },
  });
}
