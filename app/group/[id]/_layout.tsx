import { Stack, useRouter } from "expo-router";
import { Pressable } from "react-native";
import { ChevronLeft } from "lucide-react-native";

function BackToHome() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/" as never))}
      hitSlop={12}
      className="active:opacity-60"
    >
      <ChevronLeft size={26} color="#3b82f6" />
    </Pressable>
  );
}

export default function GroupDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerBackTitle: "Retour" }}>
      <Stack.Screen
        name="(tabs)"
        options={{ title: "Groupe", headerLeft: () => <BackToHome /> }}
      />
      <Stack.Screen name="invite" options={{ title: "Inviter" }} />
      <Stack.Screen name="invitations" options={{ title: "Invitations envoyées" }} />
      <Stack.Screen name="members" options={{ title: "Membres" }} />
      <Stack.Screen name="edit" options={{ title: "Modifier le groupe" }} />
      <Stack.Screen name="declare" options={{ title: "Déclarer une séance" }} />
    </Stack>
  );
}
