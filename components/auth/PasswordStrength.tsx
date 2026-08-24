import { Check } from "lucide-react-native";
import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/constants/colors";
import { fontFamily } from "@/constants/fonts";
import { getPasswordChecks, PASSWORD_CRITERIA } from "@/lib/password";
import { useAppReducedMotion } from "@/hooks/useAppReducedMotion";

type Props = {
  password: string;
  /** Affiché dès que le champ a le focus ou du contenu. */
  visible: boolean;
};

/** Barre de force segmentée + checklist des critères, synchronisées avec `getPasswordChecks`. */
export function PasswordStrength({ password, visible }: Props) {
  const { checks, satisfied, label } = getPasswordChecks(password);

  if (!visible) return null;

  const barColor =
    satisfied === 0
      ? colors.surface2
      : satisfied === 1
        ? colors.red
        : satisfied <= 3
          ? colors.amber
          : colors.mint;

  return (
    <View className="mt-3 gap-2.5">
      {/* Barre de force : 4 segments */}
      <View className="flex-row items-center gap-2">
        <View className="flex-1 flex-row gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 5,
                borderRadius: 999,
                backgroundColor: i < satisfied ? barColor : colors.surface2,
              }}
            />
          ))}
        </View>
        {label ? (
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 11.5, color: barColor }}>
            {label}
          </Text>
        ) : null}
      </View>

      {/* Checklist (2 colonnes) */}
      <View className="flex-row flex-wrap">
        {PASSWORD_CRITERIA.map((c) => (
          <View key={c.key} style={{ width: "50%" }} className="py-1">
            <CriterionRow label={c.label} done={checks[c.key]} />
          </View>
        ))}
      </View>
    </View>
  );
}

function CriterionRow({ label, done }: { label: string; done: boolean }) {
  const reduceMotion = useAppReducedMotion();
  const p = useSharedValue(done ? 1 : 0);

  useEffect(() => {
    p.value = reduceMotion ? (done ? 1 : 0) : withTiming(done ? 1 : 0, { duration: 220 });
  }, [done, reduceMotion, p]);

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], ["rgba(95,224,168,0)", colors.mint]),
    borderColor: interpolateColor(p.value, [0, 1], [colors.creamDim, colors.mint]),
  }));

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(p.value, [0, 1], [colors.creamDim, colors.cream]),
  }));

  return (
    <View className="flex-row items-center gap-2">
      <Animated.View
        style={[
          {
            width: 16,
            height: 16,
            borderRadius: 999,
            borderWidth: 1.5,
            alignItems: "center",
            justifyContent: "center",
          },
          pillStyle,
        ]}
      >
        {done ? <Check size={10} color={colors.onMint} strokeWidth={3} /> : null}
      </Animated.View>
      <Animated.Text style={[{ fontFamily: fontFamily.bodyMedium, fontSize: 12 }, textStyle]}>
        {label}
      </Animated.Text>
    </View>
  );
}
