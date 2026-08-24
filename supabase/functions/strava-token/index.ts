// Edge Function : échange / rafraîchit un token Strava, ET relaie la liste des
// activités (proxy).
//
// Le client_secret Strava n'est JAMAIS exposé au client : il vit dans les secrets
// de la fonction (STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET).
//
// ⚠ Pourquoi le proxy d'activités passe AUSSI par ici : l'API Strava n'envoie pas
// d'en-têtes CORS, donc un `fetch` direct depuis un NAVIGATEUR (app web) est
// bloqué. En passant par la fonction (serveur → Strava), plus de CORS, et ça
// marche identiquement sur web / iOS / Android.
//
// Déploiement : voir docs/guides/STRAVA_SETUP.md (déployable depuis le Dashboard
// Supabase, pas besoin du CLI). À REDÉPLOYER après cette mise à jour.
//
// Body attendu :
//   { action: "exchange",   code: string }                  → échange un code d'autorisation
//   { action: "refresh",    refresh_token: string }          → rafraîchit un token expiré
//   { action: "activities", access_token: string, per_page?: number } → activités récentes

const STRAVA_CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID");
const STRAVA_CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body?.action;

    // --- Proxy activités : ne nécessite que le token d'accès (pas le secret) ---
    if (action === "activities") {
      const accessToken = body?.access_token;
      if (!accessToken) return json({ error: "access_token manquant" }, 400);
      const perPage = Number(body?.per_page) || 15;

      const res = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await res.json();

      // On répond TOUJOURS en 200 et on encode l'issue dans le corps : ça permet
      // au client de lire le vrai statut Strava (ex. 401 = token révoqué) plutôt
      // qu'un « non-2xx » opaque renvoyé par le SDK functions.invoke.
      if (!res.ok) {
        // On joint le DÉTAIL Strava (tableau `errors`) au message : il précise la
        // cause exacte — champ « activity:read_permission:missing » (scope) vs
        // « rate limit:exceeded » (limite d'API). Un simple « Forbidden » ne dit rien.
        const errors = Array.isArray(data?.errors) ? data.errors : [];
        const detail = errors
          .map((e: { field?: string; code?: string }) => `${e?.field ?? "?"}:${e?.code ?? "?"}`)
          .join(", ");
        const message = (data?.message ?? "Erreur Strava") + (detail ? ` (${detail})` : "");
        return json({ ok: false, status: res.status, message });
      }
      return json({ ok: true, activities: data });
    }

    // --- Actions token (exchange / refresh) : nécessitent le client_secret ---
    if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
      return json({ error: "Strava non configuré côté serveur." }, 500);
    }

    const params = new URLSearchParams({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
    });

    if (action === "exchange") {
      if (!body?.code) return json({ error: "code manquant" }, 400);
      params.set("code", body.code);
      params.set("grant_type", "authorization_code");
    } else if (action === "refresh") {
      if (!body?.refresh_token) return json({ error: "refresh_token manquant" }, 400);
      params.set("refresh_token", body.refresh_token);
      params.set("grant_type", "refresh_token");
    } else {
      return json({ error: "action invalide" }, 400);
    }

    const res = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = await res.json();
    if (!res.ok) return json({ error: data?.message ?? "Erreur Strava" }, res.status);

    // On ne renvoie que ce dont le client a besoin.
    return json({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      athlete: data.athlete ?? null,
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Erreur inconnue" }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
