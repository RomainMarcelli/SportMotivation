import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Platform } from "react-native";

import {
  isStravaSessionExpired,
  parseStravaSession,
  type StravaSession,
} from "@/features/settings/strava-session";
import { supabase } from "@/lib/supabase";
import type { StravaActivity } from "@/features/sessions/strava";

WebBrowser.maybeCompleteAuthSession();

const CLIENT_ID = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID;

/** Strava est configuré si le client ID public est présent (le secret vit dans l'Edge Function). */
export const isStravaConfigured = !!CLIENT_ID;

const STORAGE_KEY = "strava-session";
export const STRAVA_QUERY_KEY = ["strava-session"];

const discovery: AuthSession.DiscoveryDocument = {
  // `/oauth/mobile/authorize` est réservé aux applications natives : ouvert dans
  // un onglet de navigateur il tente de rebondir vers l'app Strava installée et
  // reste bloqué sur une page blanche. Sur le web, c'est le point d'entrée
  // classique qu'il faut.
  authorizationEndpoint:
    Platform.OS === "web"
      ? "https://www.strava.com/oauth/authorize"
      : "https://www.strava.com/oauth/mobile/authorize",
  tokenEndpoint: "https://www.strava.com/oauth/token",
};

// Sur le web, l'URI de retour doit être une vraie URL du site (le schéma
// `sportmotiv://` n'existe pas pour un navigateur, la fenêtre ne revient jamais).
const redirectUri =
  Platform.OS === "web"
    ? AuthSession.makeRedirectUri({ path: "strava" })
    : AuthSession.makeRedirectUri({ scheme: "sportmotiv", path: "strava" });

/* ------------------------------------------------------------------ stockage */

/**
 * La connexion Strava est conservée d'un lancement à l'autre.
 *
 * ⚠ Stockage en clair (AsyncStorage), pas dans le trousseau : ce jeton n'ouvre
 * qu'un accès **en lecture** aux activités Strava et il expire en quelques
 * heures. Le jour où on y met autre chose, passer à `expo-secure-store` — qui
 * n'existe pas sur le web, il faudra donc un repli.
 */
export async function loadStravaSession(): Promise<StravaSession | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? parseStravaSession(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

async function saveStravaSession(session: StravaSession): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Un stockage indisponible ne doit pas faire échouer la connexion en cours :
    // elle reste valable pour cette session, simplement pas mémorisée.
  }
}

export async function clearStravaSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Rien à faire : au pire la session reste, elle expirera d'elle-même.
  }
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  athlete?: unknown;
};

/**
 * L'Edge Function `strava-token` peut ne jamais répondre : non déployée, secrets
 * manquants, réseau coupé. Sans borne, l'écran tourne indéfiniment sans rien
 * dire — mieux vaut une erreur au bout de 15 s.
 */
async function invokeStravaToken(body: Record<string, unknown>): Promise<TokenResponse> {
  const call = supabase.functions.invoke("strava-token", { body });
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error("Strava ne répond pas. Réessaie dans un instant.")),
      15_000
    )
  );
  const { data, error } = await Promise.race([call, timeout]);
  if (error) throw error;
  return (data ?? {}) as TokenResponse;
}

function toSession(data: TokenResponse, previous?: StravaSession | null): StravaSession | null {
  if (!data.access_token) return null;
  const parsed = parseStravaSession({
    accessToken: data.access_token,
    athlete: data.athlete,
  });
  return {
    accessToken: data.access_token,
    // Strava ne renvoie pas l'athlète au rafraîchissement : on garde celui qu'on
    // connaissait plutôt que de perdre le nom affiché dans les Paramètres.
    refreshToken: data.refresh_token ?? previous?.refreshToken ?? null,
    expiresAt: data.expires_at ?? null,
    athlete: parsed?.athlete ?? previous?.athlete ?? null,
  };
}

/** Rafraîchit un jeton expiré via l'Edge Function (le secret Strava reste côté serveur). */
async function refreshStravaSession(session: StravaSession): Promise<StravaSession | null> {
  if (!session.refreshToken) return null;
  try {
    const data = await invokeStravaToken({
      action: "refresh",
      refresh_token: session.refreshToken,
    });
    const next = toSession(data, session);
    if (next) await saveStravaSession(next);
    return next;
  } catch {
    return null;
  }
}

/**
 * Jeton d'accès utilisable, rafraîchi si nécessaire.
 * `null` = il faut (re)connecter Strava.
 */
export async function getValidStravaToken(): Promise<string | null> {
  const session = await loadStravaSession();
  if (!session) return null;
  if (!isStravaSessionExpired(session, Date.now())) return session.accessToken;
  const refreshed = await refreshStravaSession(session);
  return refreshed?.accessToken ?? null;
}

/* --------------------------------------------------------------- connexion */

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
  const queryClient = useQueryClient();
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
        // Fenêtre fermée, refus, ou bloqueur de pop-up : on le dit, plutôt que
        // de laisser croire à un chargement sans fin.
        setState({
          isPending: false,
          error:
            result.type === "dismiss" || result.type === "cancel"
              ? null
              : "Autorisation Strava interrompue. Vérifie que les fenêtres surgissantes sont autorisées.",
          accessToken: null,
        });
        return null;
      }
      const data = await invokeStravaToken({ action: "exchange", code: result.params.code });

      const session = toSession(data);
      if (session) {
        // Mémorisée : avant, il fallait reconnecter Strava à chaque séance.
        await saveStravaSession(session);
        queryClient.invalidateQueries({ queryKey: STRAVA_QUERY_KEY });
      }
      setState({
        isPending: false,
        error: session ? null : "Échec de l'échange Strava.",
        accessToken: session?.accessToken ?? null,
      });
      return session?.accessToken ?? null;
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

/** État de la connexion Strava conservée (écran Paramètres, sélecteur de preuve). */
export function useStravaSession() {
  return useQuery({
    queryKey: STRAVA_QUERY_KEY,
    enabled: isStravaConfigured,
    staleTime: 60_000,
    queryFn: loadStravaSession,
  });
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
