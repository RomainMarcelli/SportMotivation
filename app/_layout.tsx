import "../global.css";

import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { isProfileComplete, useProfile } from "@/hooks/useProfile";
import { useAuthInitialized, useIsAuthenticated } from "@/lib/auth-store";
import { queryClient } from "@/lib/query-client";

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootContent />
    </QueryClientProvider>
  );
}

function Splash() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  );
}

function RootContent() {
  const colorScheme = useColorScheme();
  const initialized = useAuthInitialized();
  const isAuthenticated = useIsAuthenticated();
  const { data: profile, isLoading: profileLoading, isFetched: profileFetched } = useProfile();

  // Splash : tant que l'auth n'est pas init OU que le profil charge pour un user loggé
  if (!initialized) return <Splash />;
  if (isAuthenticated && !profileFetched && profileLoading) return <Splash />;

  const hasCompleteProfile = isProfileComplete(profile);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated && !hasCompleteProfile}>
          <Stack.Screen name="(setup)" />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated && hasCompleteProfile}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="group" />
        </Stack.Protected>
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
