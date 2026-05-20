import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS;
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID;
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;

/**
 * Hook pour la connexion Google via Supabase.
 *
 * Configuration requise :
 * 1. Créer des OAuth Client IDs dans Google Cloud Console (iOS, Android, Web)
 * 2. Renseigner les 3 variables dans `.env` :
 *    - EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS
 *    - EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID
 *    - EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB
 * 3. Activer le provider Google dans Supabase Dashboard avec le Web Client ID + secret
 *
 * Si les variables d'env ne sont pas définies, le hook retourne `enabled: false`
 * et le bouton "Continuer avec Google" doit être masqué côté UI.
 *
 * ⚠ Limitation Expo Go : Google OAuth peut avoir des restrictions dans Expo Go.
 * Pour la production, prévoir un development build via EAS.
 */
export function useGoogleAuth() {
  const enabled = !!(IOS_CLIENT_ID && ANDROID_CLIENT_ID && WEB_CLIENT_ID);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest(
    enabled
      ? {
          iosClientId: IOS_CLIENT_ID,
          androidClientId: ANDROID_CLIENT_ID,
          webClientId: WEB_CLIENT_ID,
        }
      : ({} as never)
  );

  useEffect(() => {
    if (!response) return;
    if (response.type !== "success") {
      setIsPending(false);
      return;
    }
    const idToken = response.params.id_token;
    if (!idToken) {
      setError("Réponse Google sans id_token.");
      setIsPending(false);
      return;
    }

    supabase.auth
      .signInWithIdToken({ provider: "google", token: idToken })
      .then(({ error }) => {
        if (error) setError(error.message);
      })
      .finally(() => setIsPending(false));
  }, [response]);

  const signIn = async () => {
    setError(null);
    setIsPending(true);
    try {
      await promptAsync();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur Google OAuth.");
      setIsPending(false);
    }
  };

  return {
    enabled,
    isReady: !!request,
    isPending,
    error,
    signIn,
  };
}
