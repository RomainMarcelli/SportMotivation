import { useEffect } from "react";
import { Pressable } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/constants/colors";
import { useAppReducedMotion } from "@/hooks/useAppReducedMotion";

// Géométrie explicite pour que la bulle soit posée symétriquement — même écart à
// gauche (éteint) qu'à droite (allumé). Le piège précédent : `TRAVEL` ne comptait
// pas la bordure (1 px de chaque côté), donc la bulle allumée dépassait de 2 px et
// venait coller/chevaucher la bordure droite (très visible sur le web).
const TRACK_W = 46;
const TRACK_H = 28;
const BORDER = 1; // bordure de la piste (border-box : incluse dans TRACK_W/H)
const INSET = 2; // écart bulle ↔ intérieur de la piste
const KNOB = TRACK_H - 2 * BORDER - 2 * INSET; // 22 → centré verticalement
const TRAVEL = TRACK_W - 2 * BORDER - 2 * INSET - KNOB; // 18 → même marge des deux côtés

type Props = {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

/**
 * Interrupteur de la DA (maquette `sport-motiv-parametres.html`).
 *
 * Écrit à la main plutôt que le `Switch` de React Native : celui-ci prend
 * l'apparence du système (bleu iOS, vert Android, case à cocher sur le web) et
 * n'aurait été identique sur aucune des trois plateformes.
 */
export function Toggle({ value, onChange, disabled, accessibilityLabel }: Props) {
  const reduceMotion = useAppReducedMotion();
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: reduceMotion ? 0 : 180 });
  }, [value, progress, reduceMotion]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.surface2, colors.coral]),
    borderColor: interpolateColor(progress.value, [0, 1], [colors.line2, colors.coral]),
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * TRAVEL }],
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.cream, colors.onCoral]),
  }));

  return (
    <Pressable
      onPress={() => onChange(!value)}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <Animated.View
        style={[
          {
            width: TRACK_W,
            height: TRACK_H,
            borderRadius: TRACK_H / 2,
            borderWidth: BORDER,
            justifyContent: "center",
            paddingHorizontal: INSET,
          },
          trackStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              width: KNOB,
              height: KNOB,
              borderRadius: KNOB / 2,
              shadowColor: "#000",
              shadowOpacity: 0.4,
              shadowRadius: 5,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
            },
            knobStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}
