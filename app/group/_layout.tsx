import { Stack } from "expo-router";

export default function GroupLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerBackTitle: "Retour" }}>
      <Stack.Screen name="create" options={{ title: "Créer un groupe" }} />
      <Stack.Screen name="join" options={{ title: "Rejoindre" }} />
      <Stack.Screen name="join-confirm" options={{ title: "Confirmer" }} />
      <Stack.Screen name="[id]" options={{ title: "Groupe" }} />
    </Stack>
  );
}
