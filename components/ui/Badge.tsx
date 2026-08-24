import { Text, View } from "react-native";

import { colors } from "@/constants/colors";
import { fontFamily } from "@/constants/fonts";

type Variant = "default" | "coral" | "amber" | "mint" | "red";

const variants: Record<Variant, { bg: string; fg: string }> = {
  default: { bg: "rgba(255,238,221,0.07)", fg: colors.creamDim },
  coral: { bg: colors.coralSoft, fg: colors.coral },
  amber: { bg: colors.amberSoft, fg: colors.amber },
  mint: { bg: colors.mintSoft, fg: colors.mint },
  red: { bg: colors.redSoft, fg: colors.red },
};

type Props = {
  label: string;
  variant?: Variant;
};

/**
 * Tag/badge statique (pas interactif). Pour les statuts : Validée (mint),
 * En attente (amber), En cours (coral), Refusé (red), neutre (default).
 * Pour une puce sélectionnable, utiliser `Chip`.
 */
export function Badge({ label, variant = "default" }: Props) {
  const { bg, fg } = variants[variant];
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: bg,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
      }}
    >
      <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: 12, color: fg }}>{label}</Text>
    </View>
  );
}
