import { ActivityIndicator, Pressable, Text, type PressableProps } from "react-native";

import { colors } from "@/constants/colors";
import { GradientButton } from "./GradientButton";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const outlineStyles: Record<
  Exclude<Variant, "primary">,
  { container: string; text: string; spinner: string }
> = {
  secondary: {
    container: "border border-line-2 bg-surface active:bg-surface-2",
    text: "text-cream",
    spinner: colors.cream,
  },
  ghost: {
    container: "bg-transparent active:bg-surface",
    text: "text-cream-dim",
    spinner: colors.creamDim,
  },
  danger: {
    container: "bg-red-soft active:bg-red/25",
    text: "text-red",
    spinner: colors.red,
  },
};

type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  children: string;
};

/**
 * Bouton générique de la DA.
 * - `primary`   → CTA dégradé coral→amber avec sheen (délègue à GradientButton)
 * - `secondary` → surface + bordure
 * - `ghost`     → transparent
 * - `danger`    → fond rouge atténué, texte rouge
 */
export function Button({ variant = "primary", loading = false, disabled, children, ...rest }: ButtonProps) {
  if (variant === "primary") {
    return (
      <GradientButton loading={loading} disabled={disabled} {...rest}>
        {children}
      </GradientButton>
    );
  }

  const styles = outlineStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      className={`h-14 flex-row items-center justify-center rounded-card px-5 ${styles.container} ${
        isDisabled ? "opacity-50" : ""
      }`}
    >
      {loading ? (
        <ActivityIndicator color={styles.spinner} />
      ) : (
        <Text className={`font-display text-base ${styles.text}`}>{children}</Text>
      )}
    </Pressable>
  );
}
