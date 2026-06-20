import { router, usePathname, type Href } from "expo-router";
import { House, User, Users, type LucideIcon } from "lucide-react-native";
import { Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/constants/colors";
import { fontFamily } from "@/constants/fonts";

type TabKey = "index" | "groups" | "profile";

type Item = { key: TabKey; label: string; icon: LucideIcon; href: Href };

const ITEMS: Item[] = [
  { key: "index", label: "Accueil", icon: House, href: "/" },
  { key: "groups", label: "Groupes", icon: Users, href: "/groups" },
  { key: "profile", label: "Profil", icon: User, href: "/profile" },
];

/** Onglet actif déduit du chemin courant (groupe → onglet Groupes, réglages → Profil). */
function activeFromPath(pathname: string): TabKey | null {
  if (pathname === "/") return "index";
  if (pathname.startsWith("/group")) return "groups"; // /groups ET /group/[id]/...
  if (pathname.startsWith("/profile") || pathname.startsWith("/settings")) return "profile";
  return null;
}

/**
 * Barre de navigation basse UNIQUE de l'app (Accueil / Groupes / Profil), montée une seule
 * fois au-dessus de toute la pile (cf. `app/_layout.tsx`). Remplace la tab bar native des
 * `(tabs)` (masquée) pour avoir un footer **identique partout**, onglets comme écrans poussés.
 *
 * Navigation : `router.navigate(href)` rejoint l'onglet cible et dépile au passage les écrans
 * poussés (groupe, déclarer…) — fiable depuis n'importe où. (On ne fait PAS de `dismissAll`
 * d'abord : ça laissait l'onglet Groupes repasser au premier plan et écraser la navigation.)
 */
export function BottomNav() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const active = activeFromPath(pathname);
  const bottomPad = Math.max(insets.bottom, Platform.OS === "web" ? 22 : 14);

  const go = (href: Href) => {
    router.navigate(href);
  };

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.ink2,
        borderTopColor: colors.line,
        borderTopWidth: 1,
        paddingTop: 9,
        paddingBottom: bottomPad,
      }}
    >
      {ITEMS.map((item) => {
        const on = item.key === active;
        const tint = on ? colors.coral : colors.creamDim;
        const Icon = item.icon;
        return (
          <Pressable
            key={item.key}
            onPress={() => go(item.href)}
            className="flex-1 items-center justify-center active:opacity-70"
            style={{ paddingVertical: 1 }}
          >
            <Icon size={22} color={tint} />
            <Text
              style={{
                fontFamily: fontFamily.bodySemibold,
                fontSize: 11,
                marginTop: 3,
                color: tint,
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
