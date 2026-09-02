// Edge Function : suggestions d'activités via Google Places API (New).
//
// La clé Google (GOOGLE_PLACES_KEY) vit UNIQUEMENT dans les secrets de la fonction —
// JAMAIS exposée au client (surtout pas en EXPO_PUBLIC_*). Le client envoie des
// requêtes texte déjà résolues (par intérêt) ; on relaie vers Places `searchText`
// avec un Field Mask serré (on ne demande que ce qu'on affiche) et on normalise.
//
// Body attendu :
//   {
//     lat: number, lng: number, radius?: number,
//     queries: [{ key: string, textQuery: string, includedTypes?: string[] }]
//   }
//
// Réponse : { ok: true, places: RawPlace[] } | { ok: false, error: string }
// Si la clé n'est pas configurée → { ok:false, error:"places_not_configured" } : le
// client bascule alors sur ses données de démonstration (mock-first).
//
// Déploiement : Dashboard Supabase (comme strava-token). Secret à définir :
//   GOOGLE_PLACES_KEY = <clé API Places New restreinte à l'API Places>

const GOOGLE_PLACES_KEY = Deno.env.get("GOOGLE_PLACES_KEY");

const PLACES_ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
// On ne demande QUE les champs affichés (facturation Places = par champ demandé).
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.location",
  "places.googleMapsUri",
  "places.types",
].join(",");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Query = { key: string; textQuery: string; includedTypes?: string[] };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!GOOGLE_PLACES_KEY) {
      // Clé non branchée : le client fera son mock. On répond 200 (issue dans le corps).
      return json({ ok: false, error: "places_not_configured" });
    }

    const body = await req.json();
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    const radius = Math.min(Math.max(Number(body?.radius) || 8000, 500), 50000);
    const queries: Query[] = Array.isArray(body?.queries) ? body.queries : [];

    if (!isFinite(lat) || !isFinite(lng) || queries.length === 0) {
      return json({ ok: false, error: "invalid_request" }, 400);
    }

    // Une requête Places par intérêt ; on limite le nombre d'intérêts traités.
    const capped = queries.slice(0, 8);
    const results = await Promise.all(
      capped.map((q) => searchOne(q, lat, lng, radius))
    );

    const places = results.flat();
    return json({ ok: true, places });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : "unknown" }, 500);
  }
});

/** Une recherche Places pour un intérêt donné → lieux normalisés (RawPlace). */
async function searchOne(q: Query, lat: number, lng: number, radius: number) {
  const payload: Record<string, unknown> = {
    textQuery: q.textQuery,
    languageCode: "fr",
    regionCode: "FR",
    maxResultCount: 8,
    locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius } },
  };
  if (q.includedTypes && q.includedTypes.length > 0) {
    payload.includedType = q.includedTypes[0]; // searchText n'accepte qu'un type
  }

  const res = await fetch(PLACES_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_KEY!,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) return []; // un intérêt qui échoue ne casse pas les autres
  const data = await res.json();
  const places = Array.isArray(data?.places) ? data.places : [];

  return places.map((p: Record<string, any>) => ({
    id: String(p.id ?? ""),
    name: p.displayName?.text ?? "Lieu",
    interestKey: q.key,
    address: p.formattedAddress ?? null,
    rating: typeof p.rating === "number" ? p.rating : null,
    userRatingCount: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
    priceLevel: typeof p.priceLevel === "string" ? p.priceLevel : null,
    lat: p.location?.latitude ?? lat,
    lng: p.location?.longitude ?? lng,
    googleMapsUri: p.googleMapsUri ?? null,
    types: Array.isArray(p.types) ? p.types : [],
  }));
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
