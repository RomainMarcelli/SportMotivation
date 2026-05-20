import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { Calendar } from "lucide-react-native";

type Props = {
  label: string;
  value: Date | undefined;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  error?: string;
};

export function DateField({ label, value, onChange, minimumDate, maximumDate, error }: Props) {
  const [show, setShow] = useState(false);

  const formatted = value
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(value)
    : "Choisir une date";

  return (
    <View className="flex-1 gap-1.5">
      <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</Text>
      <Pressable
        onPress={() => setShow(true)}
        className={`min-h-[48px] flex-row items-center gap-2 rounded-xl border bg-white px-4 py-3 dark:bg-neutral-800 ${
          error ? "border-red-500" : "border-neutral-300 dark:border-neutral-700"
        }`}
      >
        <Calendar size={18} color="#94a3b8" />
        <Text
          className={`text-base ${value ? "text-neutral-900 dark:text-white" : "text-neutral-400"}`}
        >
          {formatted}
        </Text>
      </Pressable>
      {show ? (
        <DateTimePicker
          value={value ?? minimumDate ?? new Date()}
          mode="date"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(event, date) => {
            setShow(Platform.OS === "ios");
            if (event.type === "set" && date) onChange(date);
          }}
        />
      ) : null}
      {error ? <Text className="text-xs text-red-500">{error}</Text> : null}
    </View>
  );
}
