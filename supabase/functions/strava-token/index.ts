// Edge Function : échange / rafraîchit un token Strava.
// Le client_secret Strava n'est JAMAIS exposé au client : il vit dans les secrets
// de la fonction (STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET).
//
// Déploiement : voir docs/guides/STRAVA_SETUP.md (déployable depuis le Dashboard Supabase,
// pas besoin du CLI).
//
// Body attendu :
//   { action: "exchange", code: string }            → échange un code d'autorisation
//   { action: "refresh",  refresh_token: string }    → rafraîchit un token expiré

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
    if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
      return json({ error: "Strava non configuré côté serveur." }, 500);
    }

    const { action, code, refresh_token } = await req.json();

    const params = new URLSearchParams({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
    });

    if (action === "exchange") {
      if (!code) return json({ error: "code manquant" }, 400);
      params.set("code", code);
      params.set("grant_type", "authorization_code");
    } else if (action === "refresh") {
      if (!refresh_token) return json({ error: "refresh_token manquant" }, 400);
      params.set("refresh_token", refresh_token);
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
