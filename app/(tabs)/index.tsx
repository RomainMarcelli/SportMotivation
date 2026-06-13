import { useRouter } from "expo-router";
import { Alert, FlatList, Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, ChevronRight, Crown, Plus, Users } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { useSignOut } from "@/features/auth/mutations";
import { useMyGroups, type MyGroup } from "@/features/groups/queries";
import { useUnreadCount } from "@/features/notifications/queries";
import { formatDbDate } from "@/lib/date";
import { useProfile } from "@/hooks/useProfile";

export default function HomeScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: groups, isLoading } = useMyGroups();
  const unread = useUnreadCount();
  const signOut = useSignOut();

  const handleSignOut = () => {
    Alert.alert("Déconnexion", "Tu es sûr ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Me déconnecter", style: "destructive", onPress: () => signOut.mutate() },
    ]);
  };

  const initials = profile
    ? `${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}`.toUpperCase()
    : "?";

  const hasGroups = (groups?.length ?? 0) > 0;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-900">
      <View className="flex-1 px-6 pt-4">
        <View className="mb-6 flex-row items-center gap-3">
          <Pressable
            onPress={() => router.push("/(tabs)/profile" as never)}
            className="flex-1 flex-row items-center gap-3 active:opacity-70"
          >
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} className="h-12 w-12 rounded-full" />
            ) : (
              <View className="h-12 w-12 items-center justify-center rounded-full bg-primary-500">
                <Text className="text-base font-bold text-white">{initials}</Text>
              </View>
            )}
            <View className="flex-1">
              <Text className="text-xs text-neutral-500 dark:text-neutral-400">Salut,</Text>
              <View className="flex-row items-center gap-1">
                <Text className="text-base font-semibold text-neutral-900 dark:text-white">
                  {profile?.first_name ?? "Toi"}
                </Text>
                {profile?.username ? (
                  <Text className="text-sm text-neutral-400">@{profile.username}</Text>
                ) : null}
                <ChevronRight size={16} color="#94a3b8" />
              </View>
            </View>
          </Pressable>
          <Pressable
            onPress={() => router.push("/notifications" as never)}
            className="h-11 w-11 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800"
          >
            <Bell size={22} color="#3b82f6" />
            {unread > 0 ? (
              <View className="absolute right-1 top-1 h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1">
                <Text className="text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {hasGroups ? (
          <FlatList
            data={groups}
            keyExtractor={(item) => item.membershipId}
            contentContainerClassName="gap-3 pb-4"
            ListHeaderComponent={
              <Text className="mb-2 text-xl font-bold text-neutral-900 dark:text-white">
                Mes groupes
              </Text>
            }
            renderItem={({ item }) => (
              <GroupListItem
                item={item}
                onPress={() =>
                  router.push({ pathname: "/group/[id]", params: { id: item.group.id } } as never)
                }
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View className="flex-1">
            <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
              {isLoading ? "Chargement…" : "Aucun groupe pour l'instant"}
            </Text>
            {!isLoading ? (
              <Text className="mt-1 text-base text-neutral-500 dark:text-neutral-400">
                Crée ton défi sportif ou rejoins celui d'amis.
              </Text>
            ) : null}
          </View>
        )}

        <View className="gap-3 py-4">
          <ActionCard
            icon={<Plus size={24} color="#ffffff" />}
            title="Créer un groupe"
            description="Lance un défi avec tes amis."
            onPress={() => router.push("/group/create" as never)}
            variant="primary"
          />
          <ActionCard
            icon={<Users size={24} color="#3b82f6" />}
            title="Rejoindre un groupe"
            description="Tu as un code, un lien ou un QR ?"
            onPress={() => router.push("/group/join" as never)}
            variant="secondary"
          />
          <Button variant="ghost" onPress={handleSignOut} loading={signOut.isPending}>
            Se déconnecter
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

function GroupListItem({ item, onPress }: { item: MyGroup; onPress: () => void }) {
  const { group, role, weeklyTarget } = item;
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 active:opacity-80 dark:border-neutral-700 dark:bg-neutral-800"
    >
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-base font-semibold text-neutral-900 dark:text-white">
            {group.name}
          </Text>
          {role === "admin" ? <Crown size={15} color="#f59e0b" /> : null}
        </View>
        <Text className="text-xs text-neutral-500 dark:text-neutral-400">
          {formatDbDate(group.challenge_start)} → {formatDbDate(group.challenge_end)}
        </Text>
        <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          Ton objectif : {weeklyTarget} séance{weeklyTarget > 1 ? "s" : ""}/semaine
        </Text>
      </View>
      <ChevronRight size={20} color="#94a3b8" />
    </Pressable>
  );
}

type ActionCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  onPress: () => void;
  variant: "primary" | "secondary";
};

function ActionCard({ icon, title, description, onPress, variant }: ActionCardProps) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-4 rounded-2xl p-4 active:opacity-80 ${
        isPrimary
          ? "bg-primary-500"
          : "border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800"
      }`}
    >
      <View
        className={`h-12 w-12 items-center justify-center rounded-full ${
          isPrimary ? "bg-primary-600" : "bg-primary-50 dark:bg-neutral-700"
        }`}
      >
        {icon}
      </View>
      <View className="flex-1">
        <Text
          className={`text-base font-semibold ${isPrimary ? "text-white" : "text-neutral-900 dark:text-white"}`}
        >
          {title}
        </Text>
        <Text
          className={`text-xs ${isPrimary ? "text-white/80" : "text-neutral-500 dark:text-neutral-400"}`}
        >
          {description}
        </Text>
      </View>
    </Pressable>
  );
}
