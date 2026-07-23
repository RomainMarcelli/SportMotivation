import { router, usePathname, type Href } from "expo-router";
import { House, User, Users, type LucideIcon } from "lucide-react-native";
import { Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/constants/colors";
import { fontFamily } from "@/constants/fonts";
import { useMyGroups } from "@/features/groups/queries";
import { groupsView } from "@/features/groups/selectors";

type TabKey = "index" | "groups" | "profile";

type Item = { key: TabKey; label: string; icon: LucideIcon; href: Href };

const ITEMS: Item[] = [
  { key: "index", label: "Accueil", icon: House, href: "/" },
  { key: "groups", label: "Groupes", icon: Users, href: "/groups" },
  { key: "profile", label: "Profil", icon: User, href: "/profile" },
];

/**
 * Onglet actif déduit du chemin courant (groupe → onglet Groupes, réglages → Profil).
 * Exporté pour les tests.
 */
export function activeFromPath(pathname: string): TabKey | null {
  if (pathname === "/") return "index";
  if (pathname.startsWith("/group")) return "groups"; // /groups ET /group/[id]/...
  // /account/* et /legal/* ne s'atteignent que depuis les Paramètres, eux-mêmes
  // dans la branche Profil : l'onglet doit y rester allumé.
  if (
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/legal")
  ) {
    return "profile";
  }
  // /notifications : aucun onglet du footer ne correspond.
  return null;
}

/**
 * Barre de navigation basse UNIQUE de l'app (Accueil / Groupes / Profil), montée une seule
 * fois au-dessus de toute la pile (cf. `app/_layout.tsx`). Remplace la tab bar native des
 * `(tabs)` (masquée) pour avoir un footer **identique partout**, onglets comme écrans poussés.
 *
 * Navigation : on **dépile d'abord** la pile racine (`dismissAll`) puis on rejoint l'onglet.
 * `navigate` seul suffisait depuis un écran poussé simple, mais PAS quand plusieurs écrans sont
 * empilés (ex. Accueil → Notifications → Groupe) : la cible « / » était alors ignorée et seul
 * l'onglet Profil répondait. Dépiler d'abord rend la navigation fiable depuis n'importe où.
 */
export function BottomNav() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const active = activeFromPath(pathname);
  const bottomPad = Math.max(insets.bottom, Platform.OS === "web" ? 22 : 14);

  // Un seul défi → l'onglet « Groupes » ouvre le défi, pas une liste d'un
  // élément. La décision est prise ICI et pas dans l'écran : une redirection
  // côté écran se déclenchait aussi quand « Accueil » dépilait la navigation,
  // ce qui rouvrait le défi et rendait l'accueil inatteignable.
  const { data: groups } = useMyGroups();
  const view = groupsView(groups);
  const groupsHref: Href =
    view.kind === "single"
      ? ({ pathname: "/group/[id]", params: { id: view.groupId, solo: "1" } } as Href)
      : "/groups";

  const go = (href: Href) => {
    // Depuis un écran poussé (Notifications → Groupe → …), `navigate` seul ne ramène pas
    // toujours à la pile d'onglets : on vide la pile racine avant de rejoindre l'onglet.
    try {
      if (router.canDismiss()) router.dismissAll();
    } catch {
      // canDismiss/dismissAll indisponible selon le contexte de navigation : on ignore.
    }
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
            onPress={() => go(item.key === "groups" ? groupsHref : item.href)}
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
