// Données de DÉMONSTRATION des suggestions d'activités (Phase 7, mock-first).
//
// Tant que la clé Google Places n'est pas branchée (Edge Function absente / sans
// secret), le client bascule ici : on fabrique des lieux plausibles autour du point
// de recherche, de façon DÉTERMINISTE (aucun Math.random → même rendu à chaque fois,
// testable). Le jour où la vraie clé est en place, l'Edge Function prend le relais et
// ce mock n'est plus sollicité.

import { interestLabel } from "@/constants/interests";

import type { GeoPoint, RawPlace } from "./types";

// Suffixes de noms + niveaux de prix, piochés de façon déterministe par index.
const NAME_SUFFIXES = ["du Centre", "des Halles", "Le Central", "Chez Léo", "du Parc", "Belleville"];
const PRICE_CYCLE = [
  "PRICE_LEVEL_INEXPENSIVE",
  "PRICE_LEVEL_MODERATE",
  null, // volontairement inconnu → « Prix à consulter »
  "PRICE_LEVEL_EXPENSIVE",
];

/** Petit hash déterministe (chaîne → entier positif) pour varier sans aléatoire. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Génère quelques lieux de démo pour un intérêt, autour du centre. */
function mockForInterest(key: string, center: GeoPoint, perInterest: number): RawPlace[] {
  const label = interestLabel(key);
  const base = hash(key);
  const out: RawPlace[] = [];

  for (let i = 0; i < perInterest; i++) {
    const seed = base + i * 97;
    // Décalage géographique déterministe (~ quelques centaines de mètres à ~3 km).
    const dLat = (((seed % 61) - 30) / 30) * 0.02;
    const dLng = ((((seed >> 3) % 61) - 30) / 30) * 0.02;
    const rating = Math.round((37 + (seed % 13)) ) / 10; // 3.7 → 4.9
    const reviews = 20 + (seed % 480);

    out.push({
      id: `mock-${key}-${i}`,
      name: `${label} ${NAME_SUFFIXES[seed % NAME_SUFFIXES.length]}`,
      interestKey: key,
      address: "Quartier du centre",
      rating,
      userRatingCount: reviews,
      priceLevel: PRICE_CYCLE[seed % PRICE_CYCLE.length],
      lat: center.lat + dLat,
      lng: center.lng + dLng,
      googleMapsUri: null,
      types: [key],
    });
  }
  return out;
}

/**
 * Jeu de suggestions de démonstration pour un ensemble d'intérêts autour d'un centre.
 * Déterministe : mêmes entrées → mêmes lieux.
 */
export function mockPlaces(
  interests: readonly string[],
  center: GeoPoint,
  perInterest = 4
): RawPlace[] {
  return interests.flatMap((key) => mockForInterest(key, center, perInterest));
}
