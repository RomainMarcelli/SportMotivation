import { Stack } from "expo-router";
import { View } from "react-native";

import { AppBackground } from "@/components/ui/AppBackground";
import { colors } from "@/constants/colors";

export default function SetupLayout() {
  return (
    // Fond chaud partagé (full-bleed) ; les écrans sont rendus en transparent par-dessus.
    <View style={{ flex: 1, backgroundColor: colors.ink }}>
      <AppBackground />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}
      />
    </View>
  );
}
