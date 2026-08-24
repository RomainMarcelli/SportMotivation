import { Tabs } from "expo-router";

/**
 * Onglets Accueil / Groupes / Profil. La tab bar native est **masquée** : le footer de l'app
 * est une `BottomNav` unique montée globalement (`app/_layout.tsx`) pour être identique partout
 * (onglets ET écrans poussés). On garde le navigateur `Tabs` pour les routes seulement.
 */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Accueil" }} />
      <Tabs.Screen name="groups" options={{ title: "Groupes" }} />
      <Tabs.Screen name="profile" options={{ title: "Profil" }} />
    </Tabs>
  );
}
