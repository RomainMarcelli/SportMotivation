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
      <Stack.Screen name="invitations" options={{ title: "Invitations envoyées" }} />
      <Stack.Screen name="members" options={{ title: "Membres" }} />
      <Stack.Screen name="edit" options={{ title: "Modifier le groupe" }} />
      <Stack.Screen name="suspensions" options={{ title: "Suspensions" }} />
      <Stack.Screen name="declare" options={{ title: "Déclarer une séance" }} />
      {/* Excuse : header custom dans l'écran (maquette) */}
      <Stack.Screen name="excuse" options={{ headerShown: false }} />
      <Stack.Screen name="vote" options={{ headerShown: false }} />
      {/* Cagnotte : header custom dans l'écran (maquette) */}
      <Stack.Screen name="cagnotte" options={{ headerShown: false }} />
      {/* Fin de défi : bilan + clôture (headers custom, maquettes) */}
      <Stack.Screen name="fin-defi" options={{ headerShown: false }} />
      <Stack.Screen name="cloture" options={{ headerShown: false }} />
    </Stack>
  );
}
