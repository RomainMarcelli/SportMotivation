import "../global.css";

import { DarkTheme, DefaultTheme, ThemeProvider, type Theme } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { FeedbackProvider } from "@/components/feedback/FeedbackProvider";
import { colors } from "@/constants/colors";
import { fontsToLoad } from "@/constants/fonts";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useProfile } from "@/hooks/useProfile";
import { useAuthInitialized, useIsAuthenticated } from "@/lib/auth-store";
import { queryClient } from "@/lib/query-client";
import { useThemeStore } from "@/lib/theme-store";

// On garde le splash natif tant que les polices ne sont pas chargées.
SplashScreen.preventAutoHideAsync().catch(() => {});

/** Thème de navigation dark-first : fond `ink`, accent `coral`. */
const NavDarkTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.coral,
    background: colors.ink,
    card: colors.ink,
    text: colors.cream,
    border: colors.line2,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontsToLoad);

  useEffect(() => {
    useThemeStore.getState().load();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Tant que les polices ne sont pas prêtes, on laisse le splash natif visible.
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.ink }}>
      <QueryClientProvider client={queryClient}>
        <FeedbackProvider>
          <RootContent />
        </FeedbackProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function Splash() {
  return (
    <View className="flex-1 items-center justify-center bg-ink">
      <ActivityIndicator size="large" color={colors.coral} />
    </View>
  );
}

function RootContent() {
  const colorScheme = useColorScheme();
  const pref = useThemeStore((s) => s.pref);
  const initialized = useAuthInitialized();
  const isAuthenticated = useIsAuthenticated();
  const { isLoading: profileLoading, isFetched: profileFetched } = useProfile();

  // Splash : tant que l'auth n'est pas init OU que le profil charge pour un user loggé
  if (!initialized) return <Splash />;
  if (isAuthenticated && !profileFetched && profileLoading) return <Splash />;

  // Dark-first : sombre par défaut, clair seulement si explicitement demandé.
  const isDark = pref === "dark" || (pref === "system" && colorScheme !== "light");

  return (
    <ThemeProvider value={isDark ? NavDarkTheme : DefaultTheme}>
      {/* Fond `ink` plein écran, HORS de toute SafeAreaView (couvre la zone status bar/notch). */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.ink }]} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ink } }}>
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="group" />
          <Stack.Screen
            name="notifications"
            options={{ headerShown: true, title: "Notifications" }}
          />
          <Stack.Screen name="settings" options={{ headerShown: true, title: "Paramètres" }} />
        </Stack.Protected>
      </Stack>
      <StatusBar style={isDark ? "light" : "dark"} />
    </ThemeProvider>
  );
}
