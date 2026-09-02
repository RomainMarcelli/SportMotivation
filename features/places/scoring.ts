// Classement & enrichissement des suggestions d'activités (PUR, testé).
//
// Le tri privilégie les lieux bien notés ET proches, sans jamais inventer
// d'information : un prix absent reste « Prix à consulter » (règle produit).

import type { GeoPoint, RankedPlace, RawPlace } from "./types";

/**
 * Label de prix affichable à partir du niveau BRUT de Places (New).
 * On NE DEVINE JAMAIS un prix : tout ce qui n'est pas un palier connu et > 0 devient
 * « Prix à consulter » (y compris FREE, UNSPECIFIED, null, valeur inattendue).
 */
export function priceLabel(priceLevel: string | null | undefined): string {
  switch (priceLevel) {
    case "PRICE_LEVEL_INEXPENSIVE":
      return "€";
    case "PRICE_LEVEL_MODERATE":
      return "€€";
    case "PRICE_LEVEL_EXPENSIVE":
      return "€€€";
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return "€€€€";
    default:
      // PRICE_LEVEL_FREE, PRICE_LEVEL_UNSPECIFIED, null, undefined, inconnu…
      return "Prix à consulter";
  }
}

/** Distance à vol d'oiseau (km) entre deux points — formule de Haversine. */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371; // rayon terrestre moyen (km)
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Score d'un lieu (plus grand = mieux). Combine :
 *   • la note (0–5), pondérée par la confiance (nombre d'avis, atténué en log) ;
 *   • une pénalité de distance douce (les lieux lointains descendent).
 * Un lieu sans note part d'une base neutre (3/5) pour ne pas être injustement exclu.
 */
export function scorePlace(place: RawPlace, center: GeoPoint | null): number {
  const rating = place.rating ?? 3;
  const reviews = place.userRatingCount ?? 0;
  // Confiance : 0 avis → 0, sature vite (log). ~100 avis ≈ 1.0.
  const confidence = Math.min(1, Math.log10(reviews + 1) / 2);
  const quality = rating * (0.6 + 0.4 * confidence);

  let distancePenalty = 0;
  if (center) {
    const km = haversineKm(center, { lat: place.lat, lng: place.lng });
    distancePenalty = km * 0.15; // ~0.15 pt par km
  }
  return quality - distancePenalty;
}

/**
 * Enrichit + classe une liste de lieux bruts : dédoublonne par `id`, calcule
 * distance/label prix/score, trie du meilleur au moins bon, et tronque à `limit`.
 */
export function rankPlaces(
  places: readonly RawPlace[],
  center: GeoPoint | null,
  limit = 30
): RankedPlace[] {
  const seen = new Set<string>();
  const ranked: RankedPlace[] = [];

  for (const p of places) {
    if (!p.id || seen.has(p.id)) continue;
    seen.add(p.id);
    ranked.push({
      ...p,
      distanceKm: center ? haversineKm(center, { lat: p.lat, lng: p.lng }) : null,
      priceLabel: priceLabel(p.priceLevel),
      score: scorePlace(p, center),
    });
  }

  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, limit);
}
