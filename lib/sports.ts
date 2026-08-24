import type { LucideIcon } from "lucide-react-native";
import {
  Activity,
  Bike,
  Dumbbell,
  Footprints,
  Heart,
  Medal,
  Mountain,
  Music,
  PersonStanding,
  Sailboat,
  Snowflake,
  Swords,
  Volleyball,
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

// Règles de matching (1re correspondance gagne — l'ordre compte). `keys` = fragments
// **déjà normalisés** (minuscules, sans accents) cherchés dans le nom du sport.
// Aucune icône « cheval » n'existe dans lucide → l'équitation retombe sur `Medal`
// (médaille = « c'est un sport »), meilleur proxy disponible.
const ICON_RULES: { keys: string[]; icon: LucideIcon }[] = [
  { keys: ["course", "running", "run", "footing", "jogging", "trail", "marathon", "sprint", "athletisme", "athle"], icon: Footprints },
  { keys: ["muscu", "renfo", "fitness", "poids", "weight", "crossfit", "halter", "bodybuild", "force"], icon: Dumbbell },
  { keys: ["velo", "cyclisme", "bike", "cycling", "vtt", "spinning", "rpm"], icon: Bike },
  { keys: ["rando", "marche", "walk", "hiking", "trek", "montagne", "escalade", "grimpe", "climb", "bloc", "varappe", "alpinisme"], icon: Mountain },
  { keys: ["natation", "nage", "swim", "piscine", "aquagym", "aqua"], icon: Waves },
  { keys: ["voile", "kayak", "canoe", "aviron", "surf", "paddle", "bateau", "nautique", "kite", "planche a voile", "plongee"], icon: Sailboat },
  { keys: ["yoga", "pilates", "stretching", "etirement", "gym douce", "meditation", "gymnas", "trampoline", "acrobat", "souplesse"], icon: PersonStanding },
  { keys: ["danse", "dance", "zumba", "barre"], icon: Music },
  { keys: ["ski", "snow", "glisse", "skate", "patin", "luge", "glace", "biathlon"], icon: Snowflake },
  { keys: ["boxe", "boxing", "mma", "judo", "karate", "combat", "art martiaux", "arts martiaux", "lutte", "krav", "escrime", "taekwon", "kickbox", "grappling", "jjb"], icon: Swords },
  { keys: ["foot", "basket", "hand", "volley", "rugby", "tennis", "badmin", "squash", "ping", "pong", "padel", "ballon", "balle", "golf", "baseball", "cricket", "hockey", "waterpolo", "ultimate", "petanque"], icon: Volleyball },
  { keys: ["cardio", "hiit", "fractionne", "endurance", "rameur", "elliptique", "stepper"], icon: Heart },
  { keys: ["equitation", "cheval", "poney", "hippisme", "equestre"], icon: Medal },
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
