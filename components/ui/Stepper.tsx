import type { LucideIcon } from "lucide-react-native";
import { Minus, Plus } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import { stepValue } from "@/lib/stepper";

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Suffixe collé à la valeur (ex. `€`). */
  suffix?: string;
  /** Libellé sous la valeur (ex. `séances / semaine`). */
  unit?: string;
  /** Texte affiché à la place de la valeur quand `value === 0` (ex. `Aucun minimum`). */
  zeroLabel?: string;
};

/**
 * Stepper DA pleine largeur : carte `surface`, boutons −/+ `surface-2`, grande valeur `display`
 * (+ suffixe inline et/ou unité dessous). Réutilisé pour objectif, pénalité, durée, seuil…
 */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  suffix,
  unit,
  zeroLabel,
}: Props) {
  const showZero = value === 0 && !!zeroLabel;
  return (
    <View className="flex-row items-center justify-between rounded-[16px] border border-line bg-surface p-2.5">
      <StepButton
        icon={Minus}
        onPress={() => onChange(stepValue(value, "dec", { min, max, step }))}
        disabled={value <= min}
      />
      <View className="items-center">
        {showZero ? (
          <Text className="font-display text-[19px] tracking-tight text-cream">{zeroLabel}</Text>
        ) : (
          <Text className="font-display text-[26px] tracking-tighter text-cream">
            {value}
            {suffix ? <Text className="text-[18px] text-cream-dim"> {suffix}</Text> : null}
          </Text>
        )}
        {unit && !showZero ? (
          <Text className="mt-1 font-body-medium text-[12px] text-cream-dim">{unit}</Text>
        ) : null}
      </View>
      <StepButton
        icon={Plus}
        onPress={() => onChange(stepValue(value, "inc", { min, max, step }))}
        disabled={value >= max}
      />
    </View>
  );
}

function StepButton({
  icon: Icon,
  onPress,
  disabled,
}: {
  icon: LucideIcon;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      className={`h-[42px] w-[42px] items-center justify-center rounded-xl bg-surface-2 active:opacity-80 ${
        disabled ? "opacity-30" : ""
      }`}
    >
      <Icon size={20} color={colors.cream} strokeWidth={2.6} />
    </Pressable>
  );
}
