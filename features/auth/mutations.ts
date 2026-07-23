import { useMutation } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import type { SignInInput, SignUpInput } from "./schemas";

export function useSignIn() {
  return useMutation({
    mutationFn: async (input: SignInInput) => {
      const { data, error } = await supabase.auth.signInWithPassword(input);
      if (error) throw error;
      return data;
    },
  });
}

/** Sentinelle « cet e-mail a déjà un compte » (cf. `isEmailTakenError`). */
export const EMAIL_ALREADY_REGISTERED = "EMAIL_ALREADY_REGISTERED";

export function useSignUp() {
  return useMutation({
    mutationFn: async (input: SignUpInput) => {
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        // Prénom + pseudo en métadonnées : capturés indépendamment de la session
        // (compatibles quand la confirmation d'e-mail sera activée plus tard).
        options: {
          data: {
            first_name: input.firstName,
            username: input.username,
          },
        },
      });
      if (error) throw error;

      // Quand la confirmation d'e-mail est activée, Supabase REFUSE de dire que
      // l'adresse est déjà prise (protection contre l'énumération de comptes) :
      // il renvoie un utilisateur factice, sans identité, et sans erreur. Sans
      // ce test, l'écran renvoyait silencieusement vers la connexion — le
      // joueur n'avait aucune idée de ce qui s'était passé.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new Error(EMAIL_ALREADY_REGISTERED);
      }

      return data;
    },
  });
}

export function useSignOut() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  });
}
