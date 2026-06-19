import type { LucideIcon } from "lucide-react-native";
import {
  Activity,
  Bike,
  Dumbbell,
  Footprints,
  Heart,
  Mountain,
  Music,
  PersonStanding,
  Snowflake,
  Swords,
  Waves,
} from "lucide-react-native";

/**
 * Normalise un nom de sport : minuscules, sans accents, espaces compactés. Sert au matching
 * d'icône et à la déduplication.
 */
export function normalizeSport(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // supprime les diacritiques (accents)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Sports proposés par défaut à la création (noms libres stockés tels quels). */
export const DEFAULT_SPORTS = ["Course", "Musculation", "Vélo", "Rando", "Natation"] as const;

// Règles de matching (1re correspondance gagne). `keys` = fragments normalisés cherchés dans le nom.
const ICON_RULES: { keys: string[]; icon: LucideIcon }[] = [
  { keys: ["course", "running", "run", "footing", "jogging", "trail", "marathon", "sprint"], icon: Footprints },
  { keys: ["muscu", "renfo", "fitness", "gym", "poids", "weight", "crossfit", "halter"], icon: Dumbbell },
  { keys: ["velo", "cyclisme", "bike", "cycling", "vtt", "spinning", "rpm"], icon: Bike },
  { keys: ["rando", "marche", "walk", "hiking", "trek", "montagne"], icon: Mountain },
  { keys: ["natation", "nage", "swim", "piscine", "aquagym", "aqua"], icon: Waves },
  { keys: ["yoga", "pilates", "stretching", "etirement", "gym douce", "meditation"], icon: PersonStanding },
  { keys: ["danse", "dance", "zumba", "barre"], icon: Music },
  { keys: ["ski", "snow", "surf", "glisse", "skate", "patin"], icon: Snowflake },
  { keys: ["boxe", "boxing", "mma", "judo", "karate", "combat", "art martiaux", "lutte", "krav"], icon: Swords },
  { keys: ["cardio", "hiit", "fractionne", "endurance", "rameur", "elliptique"], icon: Heart },
];

/**
 * Renvoie la meilleure icône lucide pour un sport (texte libre), avec un fallback générique
 * (`Activity`) pour les sports non reconnus.
 */
export function getSportIcon(name: string): LucideIcon {
  const n = normalizeSport(name);
  for (const rule of ICON_RULES) {
    if (rule.keys.some((k) => n.includes(k))) return rule.icon;
  }
  return Activity;
}
