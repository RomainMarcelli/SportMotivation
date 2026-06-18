import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import { fontFamily } from "@/constants/fonts";

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: LucideIcon;
};

/**
 * Puce sélectionnable (toggle) — ex. choix d'activité, presets.
 * Sélectionnée : fond coral-soft + texte coral + anneau coral.
 * Pour un statut non interactif, utiliser `Badge`.
 */
export function Chip({ label, selected, onPress, icon: Icon }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 13,
        paddingVertical: 9,
        borderRadius: 13,
        backgroundColor: selected ? colors.coralSoft : colors.surface,
        borderWidth: 1,
        borderColor: selected ? "rgba(255,106,69,0.4)" : colors.line,
      }}
    >
      {Icon ? <Icon size={16} color={selected ? colors.coral : colors.creamDim} /> : null}
      <Text
        style={{
          fontFamily: fontFamily.bodySemibold,
          fontSize: 13,
          color: selected ? colors.coral : colors.creamDim,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Conteneur flex-wrap pour aligner des chips. */
export function ChipGroup({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View>;
}
