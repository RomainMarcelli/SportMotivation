import {
  Beer,
  Bike,
  Clapperboard,
  Coffee,
  Dumbbell,
  Landmark,
  Music,
  Mountain,
  Puzzle,
  Sparkles,
  Target,
  Trees,
  Utensils,
  Waves,
  type LucideIcon,
} from "lucide-react-native";

/**
 * Catalogue des centres d'intérêt proposés pour les suggestions d'activités de
 * fin de défi (Phase 7). Chaque intérêt porte sa config de recherche Google Places
 * (`search`) : requête texte + éventuels types officiels (Places API New).
 *
 * ⚠ Les `key` sont STABLES : elles sont stockées dans `groups.interests` (SQL 070)
 * et envoyées à l'Edge Function `places-search`. Ne pas les renommer à la légère.
 * Un intérêt libre (saisi par l'utilisateur) devient une clé « slug » sans config
 * dédiée : il retombe sur une simple recherche texte (voir `interestSearchConfig`).
 */
export type PlacesSearch = {
  /** Requête texte envoyée à Places `searchText` (langue FR). */
  textQuery: string;
  /** Types officiels Places (New) pour resserrer, si pertinents. */
  includedTypes?: string[];
};

export type InterestDef = {
  key: string;
  label: string;
  icon: LucideIcon;
  search: PlacesSearch;
};

export const INTERESTS: readonly InterestDef[] = [
  { key: "restaurant", label: "Restaurant", icon: Utensils, search: { textQuery: "restaurant", includedTypes: ["restaurant"] } },
  { key: "bar",        label: "Bar",        icon: Beer,     search: { textQuery: "bar", includedTypes: ["bar"] } },
  { key: "cafe",       label: "Café",       icon: Coffee,   search: { textQuery: "café", includedTypes: ["cafe", "coffee_shop"] } },
  { key: "cinema",     label: "Cinéma",     icon: Clapperboard, search: { textQuery: "cinéma", includedTypes: ["movie_theater"] } },
  { key: "bowling",    label: "Bowling",    icon: Target,    search: { textQuery: "bowling", includedTypes: ["bowling_alley"] } },
  { key: "escape_game", label: "Escape game", icon: Puzzle,  search: { textQuery: "escape game" } },
  { key: "museum",     label: "Musée",      icon: Landmark,  search: { textQuery: "musée", includedTypes: ["museum"] } },
  { key: "park",       label: "Parc",       icon: Trees,     search: { textQuery: "parc", includedTypes: ["park"] } },
  { key: "hiking",     label: "Randonnée",  icon: Mountain,  search: { textQuery: "sentier de randonnée" } },
  { key: "climbing",   label: "Escalade",   icon: Mountain,  search: { textQuery: "salle d'escalade" } },
  { key: "spa",        label: "Spa",        icon: Sparkles,  search: { textQuery: "spa", includedTypes: ["spa"] } },
  { key: "gym",        label: "Salle de sport", icon: Dumbbell, search: { textQuery: "salle de sport", includedTypes: ["gym", "fitness_center"] } },
  { key: "pool",       label: "Piscine",    icon: Waves,     search: { textQuery: "piscine", includedTypes: ["swimming_pool"] } },
  { key: "karting",    label: "Karting",    icon: Bike,      search: { textQuery: "karting" } },
  { key: "nightclub",  label: "Club",       icon: Music,     search: { textQuery: "boîte de nuit", includedTypes: ["night_club"] } },
] as const;

/** Sélection par défaut quand un groupe n'a rien choisi (mix convivial). */
export const DEFAULT_INTERESTS: readonly string[] = ["restaurant", "bar", "bowling", "cinema"];

const BY_KEY: Record<string, InterestDef> = Object.fromEntries(
  INTERESTS.map((i) => [i.key, i])
);

/** Slug ASCII d'un intérêt libre → sert de clé stable (minuscule, sans accents). */
export function slugInterest(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // enlève les accents (diacritiques combinants)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Libellé lisible d'une clé d'intérêt (catalogue, sinon humanisation du slug). */
export function interestLabel(key: string): string {
  const def = BY_KEY[key];
  if (def) return def.label;
  const words = key.replace(/_/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : key;
}

/** Icône d'une clé d'intérêt (catalogue, sinon `null` → pastille générique). */
export function interestIcon(key: string): LucideIcon | null {
  return BY_KEY[key]?.icon ?? null;
}

/**
 * Config de recherche Places pour une clé d'intérêt. Une clé hors catalogue (intérêt
 * libre) retombe sur une simple recherche texte à partir de son libellé.
 */
export function interestSearchConfig(key: string): PlacesSearch {
  const def = BY_KEY[key];
  if (def) return def.search;
  return { textQuery: interestLabel(key) };
}
