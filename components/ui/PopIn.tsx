import { useEffect, type ReactNode } from "react";
import { type ViewProps } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { useAppReducedMotion } from "@/hooks/useAppReducedMotion";

type Props = ViewProps & {
  children: ReactNode;
  /** Délai d'entrée en ms. */
  delay?: number;
  /** Échelle de départ (défaut 0.5, comme le « pop » de la maquette). */
  from?: number;
};

/**
 * Entrée « pop » : la vue apparaît en grossissant depuis `from` → 1 avec un léger rebond
 * (`Easing.back`), comme le badge trophée des maquettes de fin de défi. Fade simultané.
 * Respecte `prefers-reduced-motion` (état final immédiat).
 */
export function PopIn({ children, delay = 0, from = 0.5, style, ...rest }: Props) {
  const reduceMotion = useAppReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 560, easing: Easing.out(Easing.back(2)) })
    );
  }, [delay, reduceMotion, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 1.4),
    transform: [{ scale: from + (1 - from) * progress.value }],
  }));

  return (
    <Animated.View {...rest} style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
