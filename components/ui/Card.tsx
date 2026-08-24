import { View, type ViewProps } from "react-native";

type Props = ViewProps & {
  /** `hero` = coins plus arrondis, bordure plus marquée, padding plus généreux */
  variant?: "default" | "hero";
  className?: string;
};

/**
 * Conteneur de surface de la DA : fond `surface`, bordure `line`, coins arrondis.
 * Le padding/contenu se surcharge via `className`.
 */
export function Card({ variant = "default", className = "", children, ...rest }: Props) {
  const base =
    variant === "hero"
      ? "rounded-hero border border-line-2 bg-surface p-[18px]"
      : "rounded-card border border-line bg-surface p-[14px]";
  return (
    <View {...rest} className={`${base} ${className}`}>
      {children}
    </View>
  );
}
