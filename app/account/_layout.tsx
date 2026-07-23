import { Stack } from "expo-router";

import { colors } from "@/constants/colors";

/**
 * Écrans de sécurité du compte (mot de passe, adresse e-mail).
 * Entête maison dans chaque écran → pas de header natif ici.
 */
export default function AccountLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.ink },
      }}
    />
  );
}
