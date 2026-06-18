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
        <RadialGradient id="appCoral" cx="18%" cy="6%" r="100%">
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

const CORAL_FALLOFF: readonly [number, number][] = [
  [0, 0.18],
  [0.15, 0.14],
  [0.3, 0.1],
  [0.45, 0.06],
  [0.6, 0.03],
  [0.75, 0.01],
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
