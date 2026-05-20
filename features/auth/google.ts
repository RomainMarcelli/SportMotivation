import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS;
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID;
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;

/**
 * Indique si Google OAuth est configuré (3 client IDs présents dans .env).
 * ⚠ Constante simple (pas un hook) : à utiliser pour décider de RENDRE ou non
 * `<GoogleSignInButton />`. Le hook useGoogleAuth() ci-dessous appelle
 * Google.useAuthRequest qui LÈVE une exception si les client IDs manquent —
 * il ne doit donc JAMAIS être monté quand isGoogleConfigured est false.
 */
export const isGoogleConfigured = !!(IOS_CLIENT_ID && ANDROID_CLIENT_ID && WEB_CLIENT_ID);

/**
 * Hook de connexion Google. NE DOIT être appelé que lorsque isGoogleConfigured === true
 * (donc uniquement à l'intérieur de <GoogleSignInButton />, rendu conditionnellement).
 */
export function useGoogleAuth() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: IOS_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
  });

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
      .then(({ error: authError }) => {
        if (authError) setError(authError.message);
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

  return { isReady: !!request, isPending, error, signIn };
}
