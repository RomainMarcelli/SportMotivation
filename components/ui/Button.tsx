import { ActivityIndicator, Pressable, Text, type PressableProps } from "react-native";

type Variant = "primary" | "secondary" | "ghost";

const variantStyles: Record<Variant, { container: string; text: string; spinner: string }> = {
  primary: {
    container: "bg-primary-500 active:bg-primary-600",
    text: "text-white",
    spinner: "#ffffff",
  },
  secondary: {
    container:
      "bg-neutral-100 active:bg-neutral-200 dark:bg-neutral-800 dark:active:bg-neutral-700",
    text: "text-neutral-900 dark:text-white",
    spinner: "#3b82f6",
  },
  ghost: {
    container: "bg-transparent active:bg-neutral-100 dark:active:bg-neutral-800",
    text: "text-primary-500",
    spinner: "#3b82f6",
  },
};

type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  children: string;
};

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const styles = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      className={`min-h-[48px] flex-row items-center justify-center rounded-xl px-4 py-3.5 ${styles.container} ${isDisabled ? "opacity-50" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={styles.spinner} />
      ) : (
        <Text className={`text-base font-semibold ${styles.text}`}>{children}</Text>
      )}
    </Pressable>
  );
}
