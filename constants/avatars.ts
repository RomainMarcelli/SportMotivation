/**
 * Sport Motiv — Personnalisation de l'avatar.
 *
 * Trois façons d'avoir une bulle qui ne ressemble à personne d'autre :
 *   • une COULEUR de fond (+ initiales)  → `avatar_color`
 *   • une ICÔNE sport sur cette couleur  → `avatar_color` + `avatar_icon`
 *   • une IMAGE                          → `avatar_url` (photo perso OU avatar généré)
 *
 * Aucune donnée d'affichage n'est dupliquée en base : la couleur est stockée en
 * hexa, l'icône par son nom, l'image par son URL. Tout le reste est déduit ici.
 */

import {
  Bike,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  Medal,
  Mountain,
  Rocket,
  Sparkles,
  Target,
  Trophy,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react-native";

/**
 * Palette de fonds proposée au joueur. Toutes ces teintes sont assez sombres
 * pour rester lisibles avec `colors.onAvatar`, et assez saturées pour se
 * distinguer les unes des autres dans une liste de membres.
 */
export const AVATAR_COLORS = [
  "#FF6A45", // coral (accent de marque)
  "#FF8A6B", // corail clair
  "#F2554A", // rouge
  "#FF7BA9", // rose
  "#FFB23E", // ambre
  "#E9C268", // sable
  "#5FE0A8", // menthe
  "#4FC3E8", // ciel
  "#9B8CFF", // violet
  "#B7D96B", // vert pomme
] as const;

export type AvatarColor = (typeof AVATAR_COLORS)[number];

/**
 * Icônes disponibles. La CLÉ est ce qui part en base (`users.avatar_icon`) :
 * elle doit rester stable, ne jamais être renommée.
 */
export const AVATAR_ICONS: Record<string, LucideIcon> = {
  dumbbell: Dumbbell,
  bike: Bike,
  footprints: Footprints,
  waves: Waves,
  mountain: Mountain,
  flame: Flame,
  zap: Zap,
  trophy: Trophy,
  medal: Medal,
  target: Target,
  heart: Heart,
  rocket: Rocket,
  sparkles: Sparkles,
};

/** Ordre d'affichage dans le sélecteur (l'objet ne garantit rien de lisible). */
export const AVATAR_ICON_KEYS = [
  "dumbbell",
  "bike",
  "footprints",
  "waves",
  "mountain",
  "flame",
  "zap",
  "trophy",
  "medal",
  "target",
  "heart",
  "rocket",
  "sparkles",
] as const;

export type AvatarIconKey = (typeof AVATAR_ICON_KEYS)[number];

/** L'icône correspondante, ou `null` si la clé est inconnue (avatar plus ancien). */
export function avatarIconFor(key: string | null | undefined): LucideIcon | null {
  if (!key) return null;
  return AVATAR_ICONS[key] ?? null;
}

/* -------------------------------------------------------------------------- */
/*  Avatars générés (DiceBear)                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Styles DiceBear retenus : uniquement ceux qui restent lisibles en 40 px et
 * qui ont un côté « rigolo » assumé. L'API est gratuite et sans clé.
 * https://www.dicebear.com/styles/
 */
export const DICEBEAR_STYLES = [
  { key: "bottts", label: "Robots" },
  { key: "fun-emoji", label: "Smileys" },
  { key: "adventurer", label: "Aventuriers" },
  { key: "thumbs", label: "Pouces" },
  { key: "shapes", label: "Formes" },
  { key: "pixel-art", label: "Pixel" },
] as const;

export type DicebearStyle = (typeof DICEBEAR_STYLES)[number]["key"];

const DICEBEAR_BASE = "https://api.dicebear.com/9.x";

/**
 * URL d'un avatar généré. On demande du **PNG** (et pas du SVG) parce que
 * `expo-image` ne rend pas le SVG distant de la même façon sur les 3 plateformes.
 *
 * La `seed` détermine le dessin : même graine = même avatar, toujours.
 */
export function dicebearUrl(style: string, seed: string, size = 256): string {
  const safeSeed = encodeURIComponent(seed.trim() || "sportmotiv");
  return `${DICEBEAR_BASE}/${style}/png?seed=${safeSeed}&size=${size}`;
}

/** Une URL d'avatar est-elle un avatar généré (par opposition à une photo) ? */
export function isDicebearUrl(url: string | null | undefined): boolean {
  return !!url && url.startsWith(DICEBEAR_BASE);
}

/**
 * Quelques graines pour la grille de propositions. On les fait varier avec la
 * graine de l'utilisateur pour que deux joueurs ne voient pas la même planche.
 */
export function dicebearSeeds(base: string, count = 12): string[] {
  const root = base.trim() || "sportmotiv";
  return Array.from({ length: count }, (_, i) => (i === 0 ? root : `${root}-${i}`));
}
