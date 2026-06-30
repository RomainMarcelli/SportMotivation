import { Stack } from "expo-router";

import { colors } from "@/constants/colors";
import { fontFamily } from "@/constants/fonts";

export default function GroupDetailLayout() {
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
      {/* Dashboard : header custom dans l'écran */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="invite" options={{ title: "Inviter" }} />
      <Stack.Screen name="invitations" options={{ title: "Invitations envoyées" }} />
      <Stack.Screen name="members" options={{ title: "Membres" }} />
      <Stack.Screen name="edit" options={{ title: "Modifier le groupe" }} />
      <Stack.Screen name="declare" options={{ title: "Déclarer une séance" }} />
      <Stack.Screen name="excuse" options={{ title: "Déclarer une excuse" }} />
      <Stack.Screen name="vote" options={{ headerShown: false }} />
    </Stack>
  );
}
