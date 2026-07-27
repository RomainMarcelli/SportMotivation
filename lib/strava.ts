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
    setTimeout(() => reject(new Error("Strava ne répond pas. Réessaie dans un instant.")), 15_000)
  );
  const { data, error } = await Promise.race([call, timeout]);
  if (error) throw error;
  return (data ?? {}) as TokenResponse;
}

function toSession(
  data: TokenResponse,
  previous?: StravaSession | null,
  grantedScope?: string | null
): StravaSession | null {
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
    // Le scope n'est PAS dans la réponse de token Strava : il n'arrive que sur le
    // retour d'autorisation (`result.params.scope`). On le passe donc explicitement
    // à la connexion ; au rafraîchissement il est conservé (le scope ne change pas).
    scope: grantedScope ?? previous?.scope ?? null,
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
      // `force` (et NON `auto`) : si le compte a déjà autorisé l'app une fois —
      // même avec un scope réduit — `auto` fait sauter à Strava l'écran de
      // consentement et renvoie un jeton gardant l'ANCIEN scope. Symptôme vécu :
      // connexion OK (le nom s'affiche) mais 403 sur les activités, car
      // `activity:read_all` n'avait jamais été accordé, et reconnecter n'y
      // changeait rien. `force` réaffiche le consentement → le scope activités est
      // bien (re)demandé à chaque connexion.
      extraParams: { approval_prompt: "force" },
    },
    discovery
  );

  /**
   * Lance l'autorisation puis échange le code contre un jeton.
   *
   * Renvoie `{ token, error }` — et NON plus un simple `token` — car l'appelant
   * DOIT pouvoir afficher l'erreur : c'était le bug « ça s'est fermé comme si ça
   * marchait puis on me redemande de me connecter ». En réalité l'échange
   * échouait (Edge Function `strava-token` non déployée / secrets manquants),
   * `connect` renvoyait `null`, et l'écran l'ignorait en silence → aucune session
   * enregistrée, donc reconnexion redemandée. On remonte désormais la raison.
   */
  const connect = async (): Promise<{ token: string | null; error: string | null }> => {
    setState((s) => ({ ...s, isPending: true, error: null }));
    try {
      const result = await promptAsync();
      if (result.type !== "success" || !result.params.code) {
        // Fenêtre fermée, refus, ou bloqueur de pop-up : on le dit, plutôt que
        // de laisser croire à un chargement sans fin. Une annulation volontaire
        // n'est pas une erreur (error: null).
        const error =
          result.type === "dismiss" || result.type === "cancel"
            ? null
            : "Autorisation Strava interrompue. Vérifie que les fenêtres surgissantes sont autorisées.";
        setState({ isPending: false, error, accessToken: null });
        return { token: null, error };
      }
      const data = await invokeStravaToken({ action: "exchange", code: result.params.code });

      // Scope RÉELLEMENT accordé (« read,activity:read_all » si la case activités a
      // été cochée). C'est la source de vérité pour savoir pourquoi les activités
      // renvoient 403 : si `activity:read` n'y est pas, le jeton n'y a pas droit.
      const grantedScope =
        typeof result.params.scope === "string" ? result.params.scope : null;
      const session = toSession(data, null, grantedScope);
      if (session) {
        // Mémorisée : avant, il fallait reconnecter Strava à chaque séance.
        await saveStravaSession(session);
        queryClient.invalidateQueries({ queryKey: STRAVA_QUERY_KEY });
      }
      const error = session
        ? null
        : "Strava a répondu sans jeton. Vérifie que la fonction serveur « strava-token » est déployée.";
      setState({ isPending: false, error, accessToken: session?.accessToken ?? null });
      return { token: session?.accessToken ?? null, error };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Erreur Strava.";
      setState({ isPending: false, error, accessToken: null });
      return { token: null, error };
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

/**
 * Extrait le VRAI message d'une erreur `functions.invoke`.
 *
 * En cas de statut non-2xx, le SDK Supabase renvoie une erreur générique
 * (« Edge Function returned a non-2xx status code ») et cache le corps réel dans
 * `error.context` (une `Response`). Sans ça, impossible de savoir si la fonction
 * a répondu « action invalide » (ancien code non redéployé), « access_token
 * manquant », une erreur Strava, etc. On lit donc ce corps pour le remonter.
 */
async function readInvokeError(error: unknown): Promise<string> {
  const ctx = (error as { context?: unknown }).context;
  if (ctx && typeof (ctx as Response).json === "function") {
    try {
      const b = (await (ctx as Response).json()) as { error?: string; message?: string };
      if (typeof b?.error === "string") return b.error;
      if (typeof b?.message === "string") return b.message;
    } catch {
      // corps non-JSON : on retombe sur le message générique ci-dessous
    }
  }
  return error instanceof Error ? error.message : "Erreur Strava inconnue";
}

/**
 * Activités récentes du membre.
 *
 * On passe par l'Edge Function `strava-token` (action `activities`) au lieu
 * d'appeler l'API Strava en direct : Strava n'envoie AUCUN en-tête CORS, donc un
 * `fetch` depuis un navigateur (app web) est bloqué (« Impossible de charger tes
 * activités »). Le proxy serveur règle ça pour web / iOS / Android d'un coup.
 */
export async function fetchRecentStravaActivities(
  accessToken: string,
  perPage = 15
): Promise<StravaActivity[]> {
  const { data, error } = await supabase.functions.invoke("strava-token", {
    body: { action: "activities", access_token: accessToken, per_page: perPage },
  });
  if (error) throw new Error(await readInvokeError(error));

  const payload = data as
    | { ok: true; activities: StravaActivity[] }
    | { ok: false; status: number; message: string };

  if (!payload?.ok) {
    // On propage le statut (ex. « Strava 401 ») pour que l'écran distingue un
    // token révoqué d'une panne générique.
    return Promise.reject(
      new Error(`Strava ${payload?.status ?? ""}: ${payload?.message ?? "erreur"}`.trim())
    );
  }
  return payload.activities ?? [];
}
