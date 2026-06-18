import { Stack } from "expo-router";
import { View } from "react-native";

import { AppBackground } from "@/components/ui/AppBackground";
import { colors } from "@/constants/colors";

export default function AuthLayout() {
  return (
    // Conteneur racine plein écran : fond `ink` (filet de sécurité) + AppBackground full-bleed
    // (absoluteFill, JAMAIS borné par une SafeAreaView) → le fond passe sous la status bar / notch.
    <View style={{ flex: 1, backgroundColor: colors.ink }}>
      <AppBackground />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: "transparent" },
        }}
      >
        <Stack.Screen name="index" options={{ animation: "none" }} />
        <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
      </Stack>
    </View>
  );
}
