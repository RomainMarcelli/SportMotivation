import { Check } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { colors } from "@/constants/colors";

type Props = {
  checked: boolean;
  onToggle: () => void;
  children: ReactNode;
};

/**
 * Carte « case à cocher » DA (acceptation des règles). Cochée : fond `coral-soft` + anneau coral
 * + case coral avec `Check`. Non cochée : `surface` + bordure `line` + case vide.
 */
export function CheckCard({ checked, onToggle, children }: Props) {
  return (
    <Pressable
      onPress={onToggle}
      // `items-center` et non `items-start` : la case était alignée sur le HAUT
      // du bloc de texte, donc visiblement plus haute qu'une phrase d'une ligne
      // dont la hauteur de ligne dépasse celle de la case. Centré, c'est juste
      // sur une ligne comme sur trois.
      className="flex-row items-center gap-3 rounded-[16px] border bg-surface p-3.5"
      style={
        checked
          ? { backgroundColor: colors.coralSoft, borderColor: "rgba(255,106,69,0.4)" }
          : { borderColor: colors.line }
      }
    >
      <View
        className="h-6 w-6 items-center justify-center rounded-lg border-2"
        style={
          checked
            ? { backgroundColor: colors.coral, borderColor: colors.coral }
            : { borderColor: colors.line2 }
        }
      >
        {checked ? <Check size={15} color={colors.onCoral} strokeWidth={3} /> : null}
      </View>
      <View className="flex-1">{children}</View>
    </Pressable>
  );
}
