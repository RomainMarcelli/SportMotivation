import { useEffect, type ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

type Props = ViewProps & {
  children: ReactNode;
  /** Délai d'entrée en ms (pour stagger). */
  delay?: number;
  /** Translation verticale initiale en px. */
  distance?: number;
  className?: string;
};

/**
 * Animation d'entrée (fade + translateY) via `useAnimatedStyle` — PAS une layout-animation
 * `entering`. Les layout-animations Reanimated cassent le rendu des `expo-linear-gradient`
 * imbriqués sur Android (couches dégradé non peintes) ; cette approche manuelle ne l'a pas,
 * donc on peut envelopper un `GradientButton` / une marque dégradée en toute sécurité.
 * Respecte `prefers-reduced-motion` (état final immédiat).
 *
 * Le `className` (layout NativeWind) est porté par une `View` interne classique, pas par
 * l'`Animated.View` : sur web, NativeWind n'interop pas de façon fiable le `className` d'un
 * composant Reanimated (la rangée tombait en colonne). L'`Animated.View` ne fait que l'entrée.
 */
export function Reveal({ children, delay = 0, distance = 16, className, style, ...rest }: Props) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }),
    );
  }, [delay, reduceMotion, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * distance }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <View {...rest} className={className} style={style}>
        {children}
      </View>
    </Animated.View>
  );
}
