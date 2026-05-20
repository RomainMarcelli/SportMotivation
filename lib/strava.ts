import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";

import { supabase } from "@/lib/supabase";
import type { StravaActivity } from "@/features/sessions/strava";

WebBrowser.maybeCompleteAuthSession();

const CLIENT_ID = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID;

/** Strava est configuré si le client ID public est présent (le secret vit dans l'Edge Function). */
export const isStravaConfigured = !!CLIENT_ID;

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: "https://www.strava.com/oauth/mobile/authorize",
  tokenEndpoint: "https://www.strava.com/oauth/token",
};

const redirectUri = AuthSession.makeRedirectUri({ scheme: "sportmotiv", path: "strava" });

type StravaState = {
  isPending: boolean;
  error: string | null;
  accessToken: string | null;
};

/**
 * Hook de connexion Strava. NE DOIT être monté que si isStravaConfigured === true.
 * Le code d'autorisation est échangé contre un token via l'Edge Function `strava-token`
 * (qui détient le client_secret côté serveur — jamais exposé au client).
 */
export function useStravaAuth() {
  const [state, setState] = useState<StravaState>({
    isPending: false,
    error: null,
    accessToken: null,
  });

  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID!,
      scopes: ["activity:read_all"],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      extraParams: { approval_prompt: "auto" },
    },
    discovery
  );

  const connect = async (): Promise<string | null> => {
    setState((s) => ({ ...s, isPending: true, error: null }));
    try {
      const result = await promptAsync();
      if (result.type !== "success" || !result.params.code) {
        setState((s) => ({ ...s, isPending: false }));
        return null;
      }
      const { data, error } = await supabase.functions.invoke("strava-token", {
        body: { action: "exchange", code: result.params.code },
      });
      if (error) throw error;
      const token = (data as { access_token?: string })?.access_token ?? null;
      setState({ isPending: false, error: token ? null : "Échec de l'échange Strava.", accessToken: token });
      return token;
    } catch (err) {
      setState({
        isPending: false,
        error: err instanceof Error ? err.message : "Erreur Strava.",
        accessToken: null,
      });
      return null;
    }
  };

  return { isReady: !!request, ...state, connect };
}

/** Récupère les activités récentes du membre (token d'accès Strava requis). */
export async function fetchRecentStravaActivities(
  accessToken: string,
  perPage = 15
): Promise<StravaActivity[]> {
  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Strava ${res.status}`);
  return (await res.json()) as StravaActivity[];
}
