import { forwardRef } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";

type Props = TextInputProps & {
  label?: string;
  error?: string;
};

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, ...rest },
  ref
) {
  return (
    <View className="gap-1.5">
      {label ? (
        <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor="#94a3b8"
        className={`min-h-[48px] rounded-xl border bg-white px-4 py-3 text-base text-neutral-900 dark:bg-neutral-800 dark:text-white ${
          error ? "border-red-500" : "border-neutral-300 dark:border-neutral-700"
        }`}
        {...rest}
      />
      {error ? <Text className="text-xs text-red-500">{error}</Text> : null}
    </View>
  );
});
