import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

type Props = ViewProps & {
  children: ReactNode;
  className?: string;
  /** Padding horizontal standard (18px). Désactiver pour les pagers plein écran. */
  padded?: boolean;
  /** Bords SafeArea à appliquer. */
  edges?: readonly Edge[];
  /** Fond transparent (laisse voir un `AppBackground` placé derrière). */
  transparent?: boolean;
};

/**
 * Conteneur de base de tous les écrans : SafeArea + fond `ink` + padding standard.
 * `transparent` laisse passer un fond partagé (`AppBackground`) rendu derrière.
 */
export function ScreenContainer({
  children,
  className = "",
  padded = true,
  edges = ["top", "bottom"],
  transparent = false,
  ...rest
}: Props) {
  return (
    <SafeAreaView edges={edges} className={`flex-1 ${transparent ? "" : "bg-ink"}`}>
      <View {...rest} className={`flex-1 ${padded ? "px-[18px]" : ""} ${className}`}>
        {children}
      </View>
    </SafeAreaView>
  );
}
