import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { Card } from "@/components/ui/Card";
import { colors, gradients } from "@/constants/colors";
import type { HistoryBar } from "@/features/home/home-stats";
import { useAppReducedMotion } from "@/hooks/useAppReducedMotion";

const TRACK_HEIGHT = 92;

type Props = {
  bars: HistoryBar[];
  /** Change à chaque arrivée sur l'écran → les barres repoussent depuis le bas. */
  replay: number;
};

/**
 * « Historique » : séances validées par semaine, 6 dernières semaines.
 * Une semaine à zéro garde sa colonne — un trou est une information.
 */
export function WeeklyHistory({ bars, replay }: Props) {
  return (
    <View>
      <View className="mb-2 flex-row items-baseline justify-between px-0.5">
        <Text className="font-display text-[16px] tracking-tight text-cream">Historique</Text>
        <Text className="font-body text-[11.5px] text-cream-dim">séances par semaine</Text>
      </View>

      <Card>
        <View className="flex-row items-end justify-between" style={{ gap: 8 }}>
          {bars.map((bar, index) => (
            <View key={bar.weekStart} className="flex-1 items-center">
              <Text
                className="mb-1.5 font-display text-[11px]"
                style={{ color: bar.done > 0 ? colors.cream : colors.creamDim }}
              >
                {bar.done}
              </Text>
              <Bar key={replay} ratio={bar.ratio} done={bar.done} index={index} />
              <Text
                numberOfLines={1}
                className="mt-1.5 font-body text-[9.5px]"
                style={{ color: bar.current ? colors.coral : colors.creamDim }}
              >
                {bar.label}
              </Text>
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
}

/** Une colonne. Elle pousse depuis le bas, décalée de gauche à droite. */
function Bar({ ratio, done, index }: { ratio: number; done: number; index: number }) {
  const reduceMotion = useAppReducedMotion();
  // `Math.max(…, 3)` : une semaine à 0 garde un liseré visible, sinon la colonne
  // disparaît et on croit à un bug d'affichage.
  const target = Math.max(ratio * TRACK_HEIGHT, done > 0 ? 8 : 3);
  const height = useSharedValue(reduceMotion ? target : 0);

  useEffect(() => {
    if (reduceMotion) {
      height.value = target;
      return;
    }
    height.value = 0;
    height.value = withDelay(
      200 + index * 90,
      withTiming(target, { duration: 620, easing: Easing.bezier(0.2, 0.7, 0.2, 1) })
    );
  }, [target, index, height, reduceMotion]);

  const style = useAnimatedStyle(() => ({ height: height.value }));

  return (
    <View
      className="w-full overflow-hidden rounded-lg"
      style={{ height: TRACK_HEIGHT, backgroundColor: "rgba(255,238,221,0.05)" }}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View style={[{ borderRadius: 8, opacity: done > 0 ? 1 : 0.25 }, style]}>
          <LinearGradient
            colors={gradients.brand.colors}
            locations={gradients.brand.locations}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
            style={{ flex: 1, borderRadius: 8 }}
          />
        </Animated.View>
      </View>
    </View>
  );
}
