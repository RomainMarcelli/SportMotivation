import type { LucideIcon } from "lucide-react-native";
import { Text, View } from "react-native";

import { colors } from "@/constants/colors";

type Props = {
  icon: LucideIcon;
  label: string;
  value: string;
  /** Dernière ligne → pas de séparateur bas. */
  last?: boolean;
};

/** Ligne d'un récap DA : tuile d'icône `surface-2` + libellé `cream-dim` + valeur `display`. */
export function RecapRow({ icon: Icon, label, value, last }: Props) {
  return (
    <View
      className={`flex-row items-center gap-3 py-3 ${last ? "" : "border-b border-line"}`}
    >
      <View className="h-8 w-8 items-center justify-center rounded-[9px] bg-surface-2">
        <Icon size={16} color={colors.creamDim} />
      </View>
      <Text className="flex-1 font-body text-[13px] text-cream-dim">{label}</Text>
      <Text className="font-display text-[13.5px] text-cream">{value}</Text>
    </View>
  );
}

/** Conteneur carte du récap (regroupe des `RecapRow`). */
export function RecapCard({ children }: { children: React.ReactNode }) {
  return <View className="rounded-card border border-line-2 bg-surface px-3.5">{children}</View>;
}
