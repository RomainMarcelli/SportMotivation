// Formes partagées des suggestions d'activités (Google Places, Phase 7).
// Volontairement découplées du SDK Google : l'Edge Function `places-search`
// normalise la réponse Places (New) vers `RawPlace`, et le client la classe/enrichit
// en `RankedPlace` via `features/places/scoring.ts`.

/** Un lieu brut normalisé (renvoyé par l'Edge Function ou le mock). */
export type RawPlace = {
  id: string;
  name: string;
  /** Clé d'intérêt qui a fait remonter ce lieu (restaurant, bowling…). */
  interestKey: string;
  address: string | null;
  rating: number | null;
  userRatingCount: number | null;
  /**
   * Niveau de prix BRUT de Places (New) : "PRICE_LEVEL_INEXPENSIVE"… ou `null`.
   * On ne l'INTERPRÈTE jamais en euros ici — cf. `priceLabel` (jamais inventé).
   */
  priceLevel: string | null;
  lat: number;
  lng: number;
  googleMapsUri: string | null;
  types: string[];
};

/** Un lieu enrichi pour l'affichage (distance + label prix + score de tri). */
export type RankedPlace = RawPlace & {
  /** Distance au point de recherche, en km (null si centre inconnu). */
  distanceKm: number | null;
  /** Label prix prêt à afficher : "€", "€€€"… ou "Prix à consulter". */
  priceLabel: string;
  /** Score de tri (interne). */
  score: number;
};

/** Point géographique de recherche. */
export type GeoPoint = { lat: number; lng: number };

/** Réponse de l'Edge Function `places-search`. */
export type PlacesResponse = {
  ok: boolean;
  /** `true` quand les lieux sont des données de démonstration (clé non branchée). */
  mock?: boolean;
  places?: RawPlace[];
  error?: string;
};
