import { Pressable, Text, View } from "react-native";

type Option<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View className="flex-row rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className={`flex-1 items-center rounded-lg py-2 ${
              active ? "bg-white dark:bg-neutral-700" : ""
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                active ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400"
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
