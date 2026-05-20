import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, Mail, Wallet } from "lucide-react-native";

import {
  useNotifications,
  type AppNotification,
} from "@/features/notifications/queries";
import { useMarkAllRead, useMarkNotificationRead } from "@/features/notifications/mutations";

function notifIcon(type: string) {
  if (type === "group_invitation") return <Mail size={20} color="#3b82f6" />;
  if (type === "penalty_change_request") return <Wallet size={20} color="#f59e0b" />;
  return <Bell size={20} color="#3b82f6" />;
}

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();

  const onPressNotification = (n: AppNotification) => {
    if (!n.read) markRead.mutate(n.id);
    const data = (n.data ?? {}) as Record<string, string>;

    if (n.type === "group_invitation" && data.invitation_id && data.group_id) {
      router.push({
        pathname: "/group/accept-invite",
        params: { invitationId: data.invitation_id, groupId: data.group_id },
      } as never);
    } else if (n.type === "penalty_change_request" && data.change_id) {
      router.push({
        pathname: "/group/penalty-response",
        params: { changeId: data.change_id },
      } as never);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  const hasNotifs = (notifications?.length ?? 0) > 0;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-900" edges={["bottom"]}>
      {hasNotifs ? (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerClassName="p-4 gap-2"
          ListHeaderComponent={
            <Pressable onPress={() => markAllRead.mutate()} className="mb-2 self-end">
              <Text className="text-xs font-medium text-primary-500">Tout marquer comme lu</Text>
            </Pressable>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onPressNotification(item)}
              className={`flex-row items-start gap-3 rounded-2xl border p-4 ${
                item.read
                  ? "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
                  : "border-primary-200 bg-primary-50 dark:border-primary-900 dark:bg-primary-500/10"
              }`}
            >
              <View className="mt-0.5">{notifIcon(item.type)}</View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-neutral-900 dark:text-white">
                  {item.title}
                </Text>
                <Text className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
                  {item.body}
                </Text>
                <Text className="mt-1 text-xs text-neutral-400">{formatWhen(item.created_at)}</Text>
              </View>
              {!item.read ? <View className="mt-1 h-2 w-2 rounded-full bg-primary-500" /> : null}
            </Pressable>
          )}
        />
      ) : (
        <View className="flex-1 items-center justify-center p-6">
          <Bell size={40} color="#94a3b8" />
          <Text className="mt-4 text-center text-base text-neutral-500 dark:text-neutral-400">
            Aucune notification pour l'instant.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
