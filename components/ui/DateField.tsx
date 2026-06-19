import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar } from "lucide-react-native";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { colors } from "@/constants/colors";

type Props = {
  label: string;
  value: Date | undefined;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  error?: string;
};

/** Champ date DA : déclencheur `surface` + bordure `line` (rouge si erreur), picker natif. */
export function DateField({ label, value, onChange, minimumDate, maximumDate, error }: Props) {
  const [show, setShow] = useState(false);

  const formatted = value
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(
        value
      )
    : "Choisir";

  return (
    <View className="flex-1 gap-1.5">
      <Text className="font-body-semibold text-[12px] uppercase tracking-label text-cream-dim">
        {label}
      </Text>
      <Pressable
        onPress={() => setShow(true)}
        className={`min-h-[50px] flex-row items-center gap-2 rounded-input border bg-surface px-3.5 py-3 ${
          error ? "border-red" : "border-line"
        }`}
      >
        <Calendar size={17} color={colors.creamDim} />
        <Text
          className="flex-1 font-body text-[14px]"
          style={{ color: value ? colors.cream : "rgba(183,161,139,0.6)" }}
          numberOfLines={1}
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
          themeVariant="dark"
          onChange={(event, date) => {
            setShow(Platform.OS === "ios");
            if (event.type === "set" && date) onChange(date);
          }}
        />
      ) : null}
      {error ? <Text className="font-body text-[12px] text-red">{error}</Text> : null}
    </View>
  );
}
