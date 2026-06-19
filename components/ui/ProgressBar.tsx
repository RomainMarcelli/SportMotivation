import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";

import { gradients } from "@/constants/colors";

type Props = {
  /** Ratio rempli, 0→1 (borné). */
  ratio: number;
  /** Hauteur de la barre (px). */
  height?: number;
};

/** Barre de progression DA : piste `cream/0.08` + remplissage dégradé `brand`. */
export function ProgressBar({ ratio, height = 8 }: Props) {
  const pct = `${Math.max(0, Math.min(1, ratio)) * 100}%` as const;
  return (
    <View
      style={{ height, borderRadius: 99, backgroundColor: "rgba(255,238,221,0.08)", overflow: "hidden" }}
    >
      <LinearGradient
        {...gradients.brand}
        style={{ height: "100%", width: pct, borderRadius: 99 }}
      />
    </View>
  );
}
