import type { LucideIcon } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/colors";

type Option<T extends string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
};

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * Contrôle segmenté DA : piste `cream/0.06`, segment actif `surface-2` + texte `cream`.
 * Icône lucide optionnelle par segment.
 */
export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View
      className="flex-row gap-1 rounded-[13px] p-1"
      style={{ backgroundColor: "rgba(255,238,221,0.06)" }}
    >
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-[10px] py-3"
            style={active ? { backgroundColor: colors.surface2 } : undefined}
          >
            {Icon ? <Icon size={15} color={active ? colors.cream : colors.creamDim} /> : null}
            <Text
              className="font-body-semibold text-[13px]"
              style={{ color: active ? colors.cream : colors.creamDim }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
