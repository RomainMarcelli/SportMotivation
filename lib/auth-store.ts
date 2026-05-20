import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";

import { supabase } from "./supabase";

type AuthState = {
  session: Session | null;
  user: User | null;
  initialized: boolean;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  initialized: false,
  signOut: async () => {
    await supabase.auth.signOut();
  },
}));

// Bootstrap : récupère la session existante au démarrage de l'app
supabase.auth.getSession().then(({ data: { session } }) => {
  useAuthStore.setState({
    session,
    user: session?.user ?? null,
    initialized: true,
  });
});

// S'abonne aux changements de session (sign-in, sign-out, refresh token)
supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.setState({
    session,
    user: session?.user ?? null,
  });
});

export const useIsAuthenticated = () => useAuthStore((s) => !!s.session);
export const useAuthInitialized = () => useAuthStore((s) => s.initialized);
export const useCurrentUser = () => useAuthStore((s) => s.user);
