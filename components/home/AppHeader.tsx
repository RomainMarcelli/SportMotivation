import { useRouter } from "expo-router";
import { Bell } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { BrandMark } from "@/components/ui/BrandMark";
import { colors } from "@/constants/colors";
import { useUnreadCount } from "@/features/notifications/queries";
import { useProfile } from "@/hooks/useProfile";

/**
 * Barre de tête partagée (Accueil, Groupes…) : marque Sport Motiv à gauche, cloche
 * notifications (pastille si non-lu) + avatar (→ Profil) à droite. Chaque écran ajoute
 * son propre bloc titre en dessous.
 */
export function AppHeader() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const unread = useUnreadCount();
  const fullName = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();

  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-2.5">
        <BrandMark size={34} />
        <Text className="font-display text-[19px] tracking-tight text-cream">
          Sport<Text className="text-coral">Motiv</Text>
        </Text>
      </View>
      <View className="flex-row items-center gap-2.5">
        <Pressable
          onPress={() => router.push("/notifications" as never)}
          hitSlop={6}
          className="h-10 w-10 items-center justify-center rounded-chip border border-line bg-surface"
        >
          <Bell size={19} color={colors.creamDim} />
          {unread > 0 ? (
            <View
              className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface"
              style={{ backgroundColor: colors.coral }}
            />
          ) : null}
        </Pressable>
        <Pressable onPress={() => router.push("/(tabs)/profile" as never)} hitSlop={6}>
          <Avatar uri={profile?.avatar_url} name={fullName || "?"} size={40} />
        </Pressable>
      </View>
    </View>
  );
}
