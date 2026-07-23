import { LinearGradient } from "expo-linear-gradient";
import type { LucideIcon } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type PressableProps } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { colors, gradients } from "@/constants/colors";
import { fontFamily } from "@/constants/fonts";
import { glow } from "@/lib/shadow";
import { useAppReducedMotion } from "@/hooks/useAppReducedMotion";

type Props = Omit<PressableProps, "children" | "style"> & {
  children: string;
  loading?: boolean;
  disabled?: boolean;
  /** Icône lucide à gauche du libellé */
  icon?: LucideIcon;
  /** Icône lucide à droite, dans une pastille sombre (ex. flèche → de l'onboarding) */
  iconRight?: LucideIcon;
  /** Animation de brillance qui balaie le bouton (true par défaut) */
  sheen?: boolean;
};

/**
 * CTA principal — dégradé coral→amber, glow coral, et « sheen » animé.
 *
 * Robustesse iOS + Android :
 * - L'ombre/elevation est portée par le Pressable extérieur (fond `coral` plein) :
 *   sur Android une elevation sur fond transparent dessine un artefact sombre.
 * - Le dégradé ET le sheen sont clippés dans une vue interne `overflow:hidden` +
 *   `borderRadius` : un sheen non clippé débordait du bouton (artefact observé).
 * Respecte `prefers-reduced-motion`.
 */
export function GradientButton({
  children,
  loading,
  disabled,
  icon: Icon,
  iconRight: IconRight,
  sheen = true,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;
  const [width, setWidth] = useState(0);
  const reduceMotion = useAppReducedMotion();
  const x = useSharedValue(-1);

  const sheenActive = sheen && !isDisabled && !reduceMotion && width > 0;

  useEffect(() => {
    if (!sheenActive) {
      cancelAnimation(x);
      x.value = -1;
      return;
    }
    x.value = -1;
    x.value = withRepeat(
      withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
    return () => cancelAnimation(x);
  }, [sheenActive, x]);

  const sheenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value * width * 1.6 }, { rotate: "12deg" }],
  }));

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={({ pressed }) => [
        styles.button,
        // Glow diffus (spread négatif sur web → pas de bande dure sous le bouton).
        !isDisabled &&
          glow({ color: colors.coral, offsetY: 16, radius: 32, spread: -16, opacity: 0.5 }),
        {
          opacity: isDisabled ? 0.45 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.985 : 1 }],
        },
      ]}
    >
      {/* Vue de clipping : contient le dégradé + le sheen, coins arrondis appliqués ici. */}
      <View style={styles.clip}>
        <LinearGradient
          colors={gradients.brand.colors}
          locations={gradients.brand.locations}
          start={gradients.brand.start}
          end={gradients.brand.end}
          style={StyleSheet.absoluteFill}
        />
        {sheenActive ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.sheen, { width: width * 0.5 }, sheenStyle]}
          >
            <LinearGradient
              colors={["transparent", "rgba(255,255,255,0.4)", "transparent"]}
              locations={[0.3, 0.5, 0.7]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        ) : null}
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={colors.onCoral} />
        ) : (
          <>
            {Icon ? <Icon size={20} color={colors.onCoral} strokeWidth={2.6} /> : null}
            <Text style={styles.label}>{children}</Text>
            {IconRight ? <IconRight size={18} color={colors.onCoral} strokeWidth={2.8} /> : null}
          </>
        )}
      </View>
    </Pressable>
  );
}

const RADIUS = 18;

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: RADIUS,
    justifyContent: "center",
    // Fond plein : base de l'ombre Android (évite l'artefact sombre sur fond transparent).
    // Le glow est ajouté via glow() dans la prop style (cross-platform). PAS d'overflow:hidden
    // ici, sinon l'ombre iOS serait coupée.
    backgroundColor: colors.coral,
  },
  clip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADIUS,
    overflow: "hidden",
  },
  sheen: {
    position: "absolute",
    top: -12,
    bottom: -12,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  label: {
    fontFamily: fontFamily.displayExtrabold,
    fontSize: 16,
    color: colors.onCoral,
    letterSpacing: -0.16,
  },
});
