import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { Clock, MailX, UserCheck, UserX } from "lucide-react-native";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { Avatar } from "@/components/ui/Avatar";
import {
  useCancelInvitation,
  useGroupInvitations,
  type GroupInvitation,
} from "@/features/groups/invitations";

const STATUS_META: Record<
  GroupInvitation["status"],
  { label: string; bg: string; text: string }
> = {
  pending: {
    label: "En attente",
    bg: "bg-amber-100 dark:bg-amber-950",
    text: "text-amber-700 dark:text-amber-300",
  },
  accepted: {
    label: "Acceptée",
    bg: "bg-green-100 dark:bg-green-950",
    text: "text-green-700 dark:text-green-300",
  },
  refused: {
    label: "Refusée",
    bg: "bg-neutral-100 dark:bg-neutral-800",
    text: "text-neutral-600 dark:text-neutral-300",
  },
};

export default function GroupInvitationsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: invitations, isLoading, refetch, isRefetching } = useGroupInvitations(id);
  const cancel = useCancelInvitation(id!);
  const { confirm, toast } = useFeedback();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  const onCancel = async (inv: GroupInvitation) => {
    const name = inv.first_name ?? inv.username ?? "ce joueur";
    const ok = await confirm({
      title: "Annuler l'invitation",
      message: `Annuler l'invitation envoyée à ${name} ?`,
      confirmLabel: "Annuler l'invitation",
      cancelLabel: "Retour",
      destructive: true,
    });
    if (!ok) return;
    cancel.mutate(inv.id, {
      onSuccess: () => toast("Invitation annulée", "success"),
      onError: (e) => toast(e.message, "error"),
    });
  };

  return (
    <View className="flex-1 bg-white dark:bg-neutral-900">
      <FlatList
        data={invitations ?? []}
        keyExtractor={(i) => i.id}
        contentContainerClassName="gap-3 p-6"
        refreshing={isRefetching}
        onRefresh={refetch}
        ListHeaderComponent={
          <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Invitations envoyées
          </Text>
        }
        ListEmptyComponent={
          <View className="mt-16 items-center gap-3">
            <MailX size={40} color="#94a3b8" />
            <Text className="text-center text-base text-neutral-500">
              Aucune invitation envoyée pour l'instant.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const meta = STATUS_META[item.status];
          const StatusIcon =
            item.status === "accepted" ? UserCheck : item.status === "refused" ? UserX : Clock;
          return (
            <View className="flex-row items-center gap-3 rounded-2xl border border-neutral-200 p-3 dark:border-neutral-700">
              <Avatar
                uri={item.avatar_url}
                color={item.avatar_color}
                icon={item.avatar_icon}
                name={`${item.first_name ?? ""} ${item.last_name ?? ""}`.trim()}
                size={44}
              />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-neutral-900 dark:text-white">
                  {item.first_name} {item.last_name}
                </Text>
                <Text className="text-xs text-neutral-500">@{item.username}</Text>
              </View>
              <View className="items-end gap-2">
                <View className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${meta.bg}`}>
                  <StatusIcon size={12} color="#6b7280" />
                  <Text className={`text-xs font-medium ${meta.text}`}>{meta.label}</Text>
                </View>
                {item.status === "pending" ? (
                  <Pressable onPress={() => onCancel(item)} disabled={cancel.isPending}>
                    <Text className="text-xs font-medium text-red-500">Annuler</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}
