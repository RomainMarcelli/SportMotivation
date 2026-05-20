import { Stack } from "expo-router";

export default function GroupDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerBackTitle: "Retour" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="invite" options={{ title: "Inviter" }} />
      <Stack.Screen name="members" options={{ title: "Membres" }} />
      <Stack.Screen name="edit" options={{ title: "Modifier le groupe" }} />
      <Stack.Screen name="declare" options={{ title: "Déclarer une séance" }} />
    </Stack>
  );
}
