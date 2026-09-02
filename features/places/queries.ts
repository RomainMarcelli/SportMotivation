import { useQuery } from "@tanstack/react-query";

import { interestSearchConfig } from "@/constants/interests";
import { supabase } from "@/lib/supabase";

import { mockPlaces } from "./mock";
import { rankPlaces } from "./scoring";
import type { GeoPoint, PlacesResponse, RankedPlace } from "./types";

export type GroupPlacesPrefs = {
  interests: string[];
  locationLabel: string | null;
  center: GeoPoint | null;
};

/**
 * Préférences « lieux » du groupe (SQL 070) : centres d'intérêt + localisation.
 * Lecture directe (RLS membre) ; en cas d'accès refusé/erreur on renvoie des valeurs
 * neutres pour ne jamais casser l'écran (l'appelant retombe sur ses défauts).
 */
export function useGroupPlacesPrefs(groupId?: string) {
  return useQuery<GroupPlacesPrefs>({
    queryKey: ["group-places-prefs", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<GroupPlacesPrefs> => {
      const empty: GroupPlacesPrefs = { interests: [], locationLabel: null, center: null };
      const { data, error } = await supabase
        .from("groups")
        .select("interests, location_label, location_lat, location_lng")
        .eq("id", groupId!)
        .single();
      if (error || !data) return empty;

      const interests = Array.isArray(data.interests)
        ? (data.interests as unknown[]).filter((x): x is string => typeof x === "string")
        : [];
      const center =
        typeof data.location_lat === "number" && typeof data.location_lng === "number"
          ? { lat: data.location_lat, lng: data.location_lng }
          : null;
      return { interests, locationLabel: data.location_label ?? null, center };
    },
  });
}

/** Centre par défaut quand le groupe n'a pas de localisation (Paris centre). */
export const DEFAULT_CENTER: GeoPoint = { lat: 48.8566, lng: 2.3522 };

/** Rayon de recherche par défaut (m). */
const DEFAULT_RADIUS_M = 8000;

export type PlaceSuggestions = {
  places: RankedPlace[];
  /** `true` = données de démo (Edge Function absente / clé non branchée). */
  isMock: boolean;
};

type Params = {
  interests: string[];
  /** Point de recherche ; `null` → centre par défaut. */
  center?: GeoPoint | null;
  enabled?: boolean;
};

/**
 * Suggestions d'activités classées pour un ensemble d'intérêts autour d'un point.
 *
 * Chemin nominal : appelle l'Edge Function `places-search` (clé Google gardée côté
 * serveur). Chemin de repli (mock-first) : si la fonction n'existe pas encore, n'est
 * pas configurée, échoue ou renvoie `mock`, on génère des suggestions de démonstration
 * localement — l'écran reste pleinement utilisable AVANT tout branchement de clé.
 * Dans les deux cas, le classement (note + distance) se fait ici (`rankPlaces`).
 */
export function usePlaceSuggestions({ interests, center, enabled = true }: Params) {
  const point = center ?? DEFAULT_CENTER;
  const keys = [...interests].sort();

  return useQuery<PlaceSuggestions>({
    queryKey: ["place-suggestions", keys, point.lat, point.lng],
    enabled: enabled && keys.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<PlaceSuggestions> => {
      const queries = keys.map((key) => ({ key, ...interestSearchConfig(key) }));

      // 1) On tente l'Edge Function. Toute anomalie (fonction absente, non
      //    configurée, erreur réseau) bascule sur le mock, sans casser l'écran.
      try {
        const { data, error } = await supabase.functions.invoke<PlacesResponse>("places-search", {
          body: { lat: point.lat, lng: point.lng, radius: DEFAULT_RADIUS_M, queries },
        });
        if (!error && data?.ok && data.places && data.places.length > 0 && !data.mock) {
          return { places: rankPlaces(data.places, point), isMock: false };
        }
      } catch {
        // on tombe dans le repli mock ci-dessous
      }

      // 2) Repli démonstration (déterministe).
      return { places: rankPlaces(mockPlaces(keys, point), point), isMock: true };
    },
  });
}
