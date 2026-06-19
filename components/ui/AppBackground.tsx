import { StyleSheet } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

/**
 * Fond chaud partagé : `ink` + 2 halos doux (coral haut-gauche, amber bas-droite).
 * Falloff multi-stops + rayon large = pas de banding sur Android. À placer en premier
 * enfant d'un conteneur `flex-1` (ou via un layout), derrière le contenu transparent.
 */
export function AppBackground() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="appCoral" cx="10%" cy="-8%" r="95%">
          {CORAL_FALLOFF.map(([offset, opacity], i) => (
            <Stop key={i} offset={offset} stopColor="#FF6A45" stopOpacity={opacity} />
          ))}
        </RadialGradient>
        <RadialGradient id="appAmber" cx="100%" cy="100%" r="105%">
          {AMBER_FALLOFF.map(([offset, opacity], i) => (
            <Stop key={i} offset={offset} stopColor="#FFB23E" stopOpacity={opacity} />
          ))}
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="#15100C" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#appCoral)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#appAmber)" />
    </Svg>
  );
}

// Pics abaissés + cœur décalé hors-champ (cx/cy) + ramp dense : derrière le header le halo
// est quasi plat → pas de bord dur ni de banding « en carrés » sur web (limite 8 bits des
// dégradés SVG navigateur), tout en gardant la chaleur en haut-gauche.
const CORAL_FALLOFF: readonly [number, number][] = [
  [0, 0.12],
  [0.12, 0.1],
  [0.24, 0.08],
  [0.36, 0.06],
  [0.48, 0.04],
  [0.6, 0.025],
  [0.72, 0.013],
  [0.85, 0.005],
  [1, 0],
];

const AMBER_FALLOFF: readonly [number, number][] = [
  [0, 0.15],
  [0.15, 0.12],
  [0.3, 0.08],
  [0.45, 0.05],
  [0.6, 0.025],
  [0.75, 0.01],
  [1, 0],
];
