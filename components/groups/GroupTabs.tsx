import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { type LayoutChangeEvent, Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { colors, gradients } from "@/constants/colors";
import { useAppReducedMotion } from "@/hooks/useAppReducedMotion";

type Tab<T extends string> = { value: T; label: string; count?: number };

type Props<T extends string> = {
  tabs: Tab<T>[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * Onglets du détail groupe, calqués sur la maquette : libellés `display`, séparateur bas `line`
 * et **soulignement dégradé qui glisse** sous l'onglet actif (Reanimated, position + largeur
 * mesurées par `onLayout`). Respecte `prefers-reduced-motion` (saut sans animation).
 */
export function GroupTabs<T extends string>({ tabs, value, onChange }: Props<T>) {
  const reduce = useAppReducedMotion();
  const [layouts, setLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);

  const active = layouts[value];
  useEffect(() => {
    if (!active) return;
    if (reduce) {
      x.value = active.x;
      w.value = active.width;
      return;
    }
    x.value = withTiming(active.x, { duration: 260, easing: Easing.out(Easing.cubic) });
    w.value = withTiming(active.width, { duration: 260, easing: Easing.out(Easing.cubic) });
  }, [active?.x, active?.width, reduce, x, w]);

  const underlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
    width: w.value,
  }));

  const onTabLayout = (val: string) => (e: LayoutChangeEvent) => {
    const { x: lx, width } = e.nativeEvent.layout;
    setLayouts((prev) =>
      prev[val]?.x === lx && prev[val]?.width === width ? prev : { ...prev, [val]: { x: lx, width } }
    );
  };

  return (
    <View>
      <View
        style={{ flexDirection: "row", gap: 26, borderBottomWidth: 1, borderBottomColor: colors.line }}
      >
        {tabs.map((t) => {
          const on = t.value === value;
          return (
            <Pressable
              key={t.value}
              onLayout={onTabLayout(t.value)}
              onPress={() => onChange(t.value)}
              className="flex-row items-center pb-3 pt-2.5"
            >
              <Text
                className="font-display-bold text-[15px]"
                style={{ color: on ? colors.cream : colors.creamDim }}
              >
                {t.label}
              </Text>
              {t.count != null ? (
                <View
                  className="ml-1.5 rounded-full px-[7px] py-px"
                  style={{ backgroundColor: on ? colors.coralSoft : "rgba(255,238,221,0.1)" }}
                >
                  <Text
                    className="font-body-bold text-[11px]"
                    style={{ color: on ? colors.coral : colors.creamDim }}
                  >
                    {t.count}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <Animated.View
        pointerEvents="none"
        style={[
          { position: "absolute", bottom: 0, left: 0, height: 2.5, borderRadius: 99 },
          underlineStyle,
        ]}
      >
        <LinearGradient {...gradients.brand} style={{ flex: 1, borderRadius: 99 }} />
      </Animated.View>
    </View>
  );
}
