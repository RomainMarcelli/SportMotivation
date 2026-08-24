import { ChevronRight, type LucideIcon } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/colors";

type Props = {
  icon: LucideIcon;
  label: string;
  value: string;
  /** Pastille après la valeur (« +2 ») : ce qui n'est pas montré tient ici. */
  badge?: string;
  /** Dernière ligne → pas de séparateur bas. */
  last?: boolean;
  /** Rend la ligne cliquable (détail en popup) et ajoute un chevron. */
  onPress?: () => void;
};

/** Ligne d'un récap DA : tuile d'icône `surface-2` + libellé `cream-dim` + valeur `display`. */
export function RecapRow({ icon: Icon, label, value, badge, last, onPress }: Props) {
  const content = (
    <>
      <View className="h-8 w-8 items-center justify-center rounded-[9px] bg-surface-2">
        <Icon size={16} color={colors.creamDim} />
      </View>
      <Text className="font-body text-[13px] text-cream-dim">{label}</Text>
      {/* La valeur prend la place restante et ne passe JAMAIS à la ligne : c'est
          ce qui gardait le tableau aligné quand la liste s'allonge. */}
      <Text
        numberOfLines={1}
        className="flex-1 text-right font-display text-[13.5px] text-cream"
      >
        {value}
      </Text>
      {badge ? (
        <View
          className="rounded-full px-1.5 py-0.5"
          style={{ backgroundColor: colors.coralSoft }}
        >
          <Text className="font-body-bold text-[11px] text-coral">{badge}</Text>
        </View>
      ) : null}
      {onPress ? <ChevronRight size={15} color={colors.creamDim} /> : null}
    </>
  );

  const className = `flex-row items-center gap-2.5 py-3 ${last ? "" : "border-b border-line"}`;

  if (onPress) {
    return (
      <Pressable onPress={onPress} className={`${className} active:opacity-70`}>
        {content}
      </Pressable>
    );
  }

  return <View className={className}>{content}</View>;
}

/** Conteneur carte du récap (regroupe des `RecapRow`). */
export function RecapCard({ children }: { children: React.ReactNode }) {
  return <View className="rounded-card border border-line-2 bg-surface px-3.5">{children}</View>;
}
