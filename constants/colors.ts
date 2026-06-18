/**
 * Sport Motiv — Design tokens (couleurs + dégradés).
 *
 * Extraits des maquettes `maquette/V3/*.html` (variables `:root`).
 * Source de vérité pour les valeurs utilisées hors Tailwind (LinearGradient,
 * StatusBar, props de style RN, ombres colorées…).
 *
 * Voir aussi `.claude/DA.md` pour le design system complet.
 * L'app est **dark-first** : pas de variante claire ici.
 */

export const colors = {
  /** Fond d'écran principal */
  ink: "#15100C",
  /** Fond secondaire (tab bar, dégradés de pied) */
  ink2: "#1B140E",
  /** Cartes, inputs, boutons icône */
  surface: "#231A12",
  /** Surface surélevée / état actif */
  surface2: "#2D2218",
  /** Bordure fine / séparateur */
  line: "rgba(255,238,221,0.08)",
  /** Bordure plus marquée */
  line2: "rgba(255,238,221,0.13)",

  /** Accent principal */
  coral: "#FF6A45",
  coralSoft: "rgba(255,106,69,0.15)",
  /** Accent secondaire / argent / warning */
  amber: "#FFB23E",
  amberSoft: "rgba(255,178,62,0.15)",
  /** Succès / validé */
  mint: "#5FE0A8",
  mintSoft: "rgba(95,224,168,0.14)",
  /** Danger / refusé / suppression */
  red: "#F2554A",
  redSoft: "rgba(242,85,74,0.14)",

  /** Texte principal */
  cream: "#FBEEDD",
  /** Texte secondaire / atténué */
  creamDim: "#B7A18B",

  /** Couleurs de texte/icône posées SUR un aplat coloré (lisibilité) */
  onCoral: "#23120A",
  onMint: "#0C2C20",
  onAmber: "#3A2406",
  onAvatar: "#1A1006",
} as const;

/**
 * Dégradés. Pour `expo-linear-gradient` : passer `colors` (+ `locations` si fourni).
 * `start`/`end` = 135° → `{ x: 0, y: 0 }` vers `{ x: 1, y: 1 }`.
 */
export const gradients = {
  /** Dégradé de marque coral → amber (CTA principal, marques, jauges) */
  brand: {
    colors: ["#FF6A45", "#FF8A3D", "#FFB23E"] as const,
    locations: [0, 0.48, 1] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  /** Validation (bouton « valider », cercle « fait ») */
  green: {
    colors: ["#3FD39B", "#5FE0A8"] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  /** Déblocage cagnotte / montant héro */
  amber: {
    colors: ["#FFC65C", "#FF9A42"] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
} as const;

/** Palette d'avatars colorés par index (cyclique). Texte = `colors.onAvatar`. */
export const avatarPalette = [
  "#FF6A45",
  "#FFB23E",
  "#5FE0A8",
  "#FF8A6B",
  "#E9C268",
] as const;

/**
 * Teintes d'ombre colorée (glow) pour les CTA.
 * RN : `shadowColor` + grand `shadowRadius`, faible `shadowOpacity`.
 */
export const shadowTint = {
  coral: "#FF8A3D",
  mint: "#5FE0A8",
  amber: "#FF9A42",
} as const;

export type ColorToken = keyof typeof colors;
