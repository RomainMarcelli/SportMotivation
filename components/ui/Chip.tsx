import { Pressable, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: LucideIcon;
};

export function Chip({ label, selected, onPress, icon: Icon }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-2 rounded-full border px-4 py-2 ${
        selected
          ? "border-primary-500 bg-primary-50 dark:bg-primary-500/20"
          : "border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-800"
      }`}
    >
      {Icon ? (
        <Icon size={16} color={selected ? "#2563eb" : "#94a3b8"} />
      ) : null}
      <Text
        className={`text-sm font-medium ${
          selected ? "text-primary-700 dark:text-primary-100" : "text-neutral-700 dark:text-neutral-300"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Conteneur flex-wrap pour aligner des chips. */
export function ChipGroup({ children }: { children: React.ReactNode }) {
  return <View className="flex-row flex-wrap gap-2">{children}</View>;
}
