import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/constants/colors";
import { useAppReducedMotion } from "@/hooks/useAppReducedMotion";

/**
 * Pluie de confettis (maquette `sport-motiv-cloture.html`) — chaque pièce tombe du haut de
 * l'écran vers le bas en tournant sur elle-même, avec un délai et une durée aléatoires.
 *
 * Choix d'implémentation :
 * - **Reanimated** (une valeur partagée par pièce) plutôt qu'une layout-animation : fiable
 *   iOS + Android + web, et on contrôle exactement translateY/rotate/opacity.
 * - La config aléatoire (position, couleur, taille, timing) est figée au montage via `useMemo`
 *   → les pièces ne « sautent » pas à chaque rendu.
 * - On attend la hauteur réelle du conteneur (`onLayout`) pour que les confettis tombent
 *   jusqu'en bas, quel que soit l'appareil.
 * - **Respecte `prefers-reduced-motion`** : rien n'est rendu (pas d'animation décorative).
 *
 * À placer en enfant absolu d'un conteneur `flex-1` (il se superpose au contenu, `pointerEvents`
 * désactivé → n'intercepte aucun tap).
 */

const PALETTE = [colors.coral, colors.amber, colors.mint, colors.cream] as const;

type PieceConfig = {
  leftPct: number;
  color: string;
  width: number;
  height: number;
  round: boolean;
  duration: number;
  delay: number;
  spin: number;
};

function buildPieces(count: number): PieceConfig[] {
  return Array.from({ length: count }, (_, i) => ({
    leftPct: Math.random() * 100,
    color: PALETTE[i % PALETTE.length],
    width: 6 + Math.random() * 5,
    height: 10 + Math.random() * 7,
    round: Math.random() > 0.55,
    duration: 2800 + Math.random() * 2400,
    delay: Math.random() * 1600,
    // Sens et amplitude de rotation variables (± ~1,5 tour).
    spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 280),
  }));
}

function ConfettiPiece({ cfg, fallHeight }: { cfg: PieceConfig; fallHeight: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    // Une seule chute (fill-forward), pas de boucle : c'est un feu d'artifice d'accueil.
    progress.value = withDelay(
      cfg.delay,
      withTiming(1, { duration: cfg.duration, easing: Easing.bezier(0.3, 0.2, 0.5, 1) })
    );
  }, [cfg.delay, cfg.duration, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: progress.value * fallHeight },
      { rotate: `${progress.value * cfg.spin}deg` },
    ],
    // 1 → 0.35, comme la maquette (les pièces s'estompent en tombant).
    opacity: 1 - progress.value * 0.65,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: -24,
          left: `${cfg.leftPct}%`,
          width: cfg.width,
          height: cfg.height,
          borderRadius: cfg.round ? cfg.height / 2 : 2,
          backgroundColor: cfg.color,
        },
        style,
      ]}
    />
  );
}

export function Confetti({ count = 22 }: { count?: number }) {
  const reduceMotion = useAppReducedMotion();
  const [height, setHeight] = useState(0);
  const pieces = useMemo(() => buildPieces(count), [count]);

  if (reduceMotion) return null;

  return (
    <View
      pointerEvents="none"
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
      style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}
    >
      {/* On ne monte les pièces qu'une fois la hauteur connue → chute jusqu'en bas. */}
      {height > 0
        ? pieces.map((cfg, i) => <ConfettiPiece key={i} cfg={cfg} fallHeight={height + 40} />)
        : null}
    </View>
  );
}
