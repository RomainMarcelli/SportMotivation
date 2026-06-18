import { Platform, type ViewStyle } from "react-native";

/** Convertit un hex `#RRGGBB` en `rgba(r, g, b, alpha)`. */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type GlowOptions = {
  /** Couleur hex de l'ombre/glow. */
  color: string;
  /** Décalage vertical (px). */
  offsetY?: number;
  /** Rayon de flou (px). */
  radius?: number;
  /** Étalement (px). Web uniquement : négatif = ombre plus contenue/diffuse (pas de bande dure). */
  spread?: number;
  /** Opacité 0–1. */
  opacity?: number;
  /** Elevation Android (ignorée sur iOS/web). */
  elevation?: number;
};

/**
 * Ombre / glow colorée **cross-platform**.
 * - iOS / Android : props natives `shadow*` (+ `elevation` sur Android).
 * - Web : `boxShadow` — les `shadow*` y sont dépréciés et ignorés par React Native Web. Le `spread`
 *   négatif (ex. -16) reproduit le rendu diffus de la maquette (pas de halo dur sous l'élément).
 *
 * Usage : `style={[base, glow({ color: colors.coral, offsetY: 16, radius: 32, spread: -16 })]}`.
 */
export function glow({
  color,
  offsetY = 12,
  radius = 20,
  spread = 0,
  opacity = 0.5,
  elevation = 8,
}: GlowOptions): ViewStyle {
  if (Platform.OS === "web") {
    return {
      boxShadow: `0px ${offsetY}px ${radius}px ${spread}px ${hexToRgba(color, opacity)}`,
    } as ViewStyle;
  }
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  };
}
