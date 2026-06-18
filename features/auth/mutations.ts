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
