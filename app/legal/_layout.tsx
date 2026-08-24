import { Stack } from "expo-router";

import { colors } from "@/constants/colors";

/** Aide et textes légaux — entête maison dans l'écran, pas de header natif. */
export default function LegalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.ink },
      }}
    />
  );
}
