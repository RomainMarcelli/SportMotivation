import { Tabs } from "expo-router";
import { House, User, Users } from "lucide-react-native";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { colors } from "@/constants/colors";
import { fontFamily } from "@/constants/fonts";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  // Padding bas = home indicator (insets) + marge mini pour dégager les libellés (web inclus,
  // où la frame de l'émulateur rogne le bas → on remonte un peu plus).
  const bottomPad = Math.max(insets.bottom, Platform.OS === "web" ? 22 : 14);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.coral,
        tabBarInactiveTintColor: colors.creamDim,
        tabBarStyle: {
          backgroundColor: colors.ink2,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          elevation: 0,
          height: 60 + bottomPad,
          paddingTop: 9,
          paddingBottom: bottomPad,
        },
        tabBarLabelStyle: { fontFamily: fontFamily.bodySemibold, fontSize: 11, marginTop: 3 },
        tabBarIconStyle: { marginTop: 1 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color }) => <House size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: "Groupes",
          tabBarIcon: ({ color }) => <Users size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) => <User size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
