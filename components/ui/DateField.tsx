import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar, ChevronRight } from "lucide-react-native";
import { createElement, useRef, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import { toDateOnly } from "@/lib/date";

type Props = {
  label: string;
  value: Date | undefined;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  error?: string;
  /** "default" = trigger compact ; "card" = grosse carte façon maquette (icône + libellé relatif). */
  variant?: "default" | "card";
};

/** "YYYY-MM-DD" (web input) → Date locale (minuit). */
function parseDateOnly(v: string): Date | null {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Libellé relatif : "Aujourd'hui" / "Hier" / "Lundi"… */
function relativeLabel(value: Date): string {
  const now = new Date();
  if (sameDay(value, now)) return "Aujourd'hui";
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (sameDay(value, yesterday)) return "Hier";
  const wd = new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(value);
  return wd.charAt(0).toUpperCase() + wd.slice(1);
}

/**
 * Champ date DA. Picker natif (`@react-native-community/datetimepicker`) sur iOS/Android ;
 * sur **web**, ce module ne rend rien → on superpose un `<input type="date">` natif du
 * navigateur (transparent) pour que le clic ouvre bien un sélecteur.
 */
export function DateField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  error,
  variant = "default",
}: Props) {
  const [show, setShow] = useState(false);
  // Web : référence vers l'<input type="date"> caché pour ouvrir le sélecteur au clic.
  const webInputRef = useRef<HTMLInputElement | null>(null);

  const openWebPicker = () => {
    const el = webInputRef.current;
    if (!el) return;
    // showPicker() ouvre le calendrier du navigateur (Chrome/Edge/Firefox récents).
    if (typeof el.showPicker === "function") {
      try {
        el.showPicker();
        return;
      } catch {
        // certains navigateurs lèvent si déjà ouvert / non supporté → repli
      }
    }
    el.focus();
    el.click();
  };

  const formattedLong = value
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(
        value
      )
    : "Choisir une date";
  const formattedShort = value
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(
        value
      )
    : "Choisir";

  const isCard = variant === "card";

  // --- Surface visible (carte maquette ou trigger compact) ---
  const Surface = (
    <View
      className={
        isCard
          ? "flex-row items-center gap-3 rounded-[16px] border bg-surface px-3.5 py-3"
          : `min-h-[50px] flex-row items-center gap-2 rounded-input border bg-surface px-3.5 py-3 ${
              error ? "border-red" : "border-line"
            }`
      }
      style={isCard ? { borderColor: error ? colors.red : colors.line } : undefined}
    >
      {isCard ? (
        <>
          <View className="h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-surface-2">
            <Calendar size={19} color={colors.creamDim} />
          </View>
          <View className="flex-1">
            <Text className="font-body-bold text-[14px] text-cream">
              {value ? relativeLabel(value) : "Choisir une date"}
            </Text>
            {value ? (
              <Text className="mt-0.5 font-body text-[11px] text-cream-dim">{formattedLong}</Text>
            ) : null}
          </View>
          <ChevronRight size={18} color={colors.creamDim} />
        </>
      ) : (
        <>
          <Calendar size={17} color={colors.creamDim} />
          <Text
            className="flex-1 font-body text-[14px]"
            style={{ color: value ? colors.cream : "rgba(183,161,139,0.6)" }}
            numberOfLines={1}
          >
            {formattedShort}
          </Text>
        </>
      )}
    </View>
  );

  return (
    <View className={isCard ? "gap-1.5" : "flex-1 gap-1.5"}>
      {!isCard ? (
        <Text className="font-body-semibold text-[12px] uppercase tracking-label text-cream-dim">
          {label}
        </Text>
      ) : null}

      {Platform.OS === "web" ? (
        // Web : un clic sur la surface ouvre le sélecteur natif via showPicker() ; l'input
        // reste dans le DOM (caché) pour porter la valeur et déclencher onChange.
        <View style={{ position: "relative" }}>
          <Pressable onPress={openWebPicker}>{Surface}</Pressable>
          {createElement("input", {
            type: "date",
            ref: (el: HTMLInputElement | null) => {
              webInputRef.current = el;
            },
            value: value ? toDateOnly(value) : "",
            min: minimumDate ? toDateOnly(minimumDate) : undefined,
            max: maximumDate ? toDateOnly(maximumDate) : undefined,
            onChange: (e: { target: { value: string } }) => {
              const d = parseDateOnly(e.target.value);
              if (d) onChange(d);
            },
            "aria-label": label,
            style: {
              position: "absolute",
              left: 12,
              bottom: 0,
              width: 1,
              height: 1,
              opacity: 0,
              border: 0,
              padding: 0,
              pointerEvents: "none",
            },
          })}
        </View>
      ) : (
        <Pressable onPress={() => setShow(true)}>{Surface}</Pressable>
      )}

      {show && Platform.OS !== "web" ? (
        <DateTimePicker
          value={value ?? maximumDate ?? minimumDate ?? new Date()}
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
