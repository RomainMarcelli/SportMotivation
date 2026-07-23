import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";

import { supabase } from "./supabase";

type AuthState = {
  session: Session | null;
  user: User | null;
  initialized: boolean;
  /**
   * Une inscription est en cours d'achèvement : la session existe DÉJÀ mais le
   * profil (prénom, pseudo, avatar) n'est pas encore écrit en base.
   *
   * ⚠ Sans ce drapeau, `onAuthStateChange` faisait basculer la racine sur les
   * onglets à la seconde où le compte était créé → l'écran d'inscription était
   * démonté **au milieu** de l'écriture du profil. L'écriture continuait dans le
   * vide, et surtout : si elle échouait, le message d'erreur était posé sur un
   * composant mort. D'où des avatars/photos « perdus » sans la moindre alerte.
   */
  finishingSignUp: boolean;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>(() => ({
  session: null,
  user: null,
  initialized: false,
  finishingSignUp: false,
  signOut: async () => {
    await supabase.auth.signOut();
  },
}));

/** Encadre la fin d'inscription : la racine reste sur `(auth)` tant que c'est vrai. */
export function setFinishingSignUp(value: boolean) {
  useAuthStore.setState({ finishingSignUp: value });
}

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
  // DEV : mémorise la session pour la bascule rapide entre comptes (no-op en prod).
  if (session) {
    import("@/features/auth/dev-accounts")
      .then((m) => m.rememberDevAccount(session))
      .catch(() => {});
  }
});

export const useIsAuthenticated = () => useAuthStore((s) => !!s.session);
export const useAuthInitialized = () => useAuthStore((s) => s.initialized);
export const useCurrentUser = () => useAuthStore((s) => s.user);
export const useFinishingSignUp = () => useAuthStore((s) => s.finishingSignUp);
