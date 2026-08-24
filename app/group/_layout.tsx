import { Stack } from "expo-router";

import { colors } from "@/constants/colors";
import { fontFamily } from "@/constants/fonts";

/**
 * Écrans « groupe » poussés hors des onglets. Le footer (BottomNav) est global
 * (`app/_layout.tsx`) : il reste visible sous cette pile, rien à monter ici.
 */
export default function GroupLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.ink },
        headerShadowVisible: false,
        headerTintColor: colors.cream,
        headerTitleStyle: { fontFamily: fontFamily.displayExtrabold, fontSize: 17 },
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: colors.ink },
      }}
    >
      <Stack.Screen name="create" options={{ title: "Créer un défi" }} />
      <Stack.Screen name="join" options={{ title: "Rejoindre" }} />
      <Stack.Screen name="scan" options={{ title: "Scanner" }} />
      <Stack.Screen name="join-confirm" options={{ title: "Confirmer" }} />
      <Stack.Screen name="accept-invite" options={{ title: "Invitation" }} />
      <Stack.Screen name="penalty-response" options={{ title: "Pénalité" }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
