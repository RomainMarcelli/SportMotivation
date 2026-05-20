import { Stack } from "expo-router";

export default function GroupLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerBackTitle: "Retour" }}>
      <Stack.Screen name="create" options={{ title: "Créer un groupe" }} />
      <Stack.Screen name="join" options={{ title: "Rejoindre" }} />
      <Stack.Screen name="scan" options={{ title: "Scanner" }} />
      <Stack.Screen name="join-confirm" options={{ title: "Confirmer" }} />
      <Stack.Screen name="accept-invite" options={{ title: "Invitation" }} />
      <Stack.Screen name="penalty-response" options={{ title: "Pénalité" }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
