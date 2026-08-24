import { useLocalSearchParams } from "expo-router";
import { Clock, MailX, UserCheck, UserX, X } from "lucide-react-native";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { AppBackground } from "@/components/ui/AppBackground";
import { Avatar } from "@/components/ui/Avatar";
import { Reveal } from "@/components/ui/Reveal";
import { colors } from "@/constants/colors";
import {
  useCancelInvitation,
  useGroupInvitations,
  type GroupInvitation,
} from "@/features/groups/invitations";
import { relativeTime } from "@/features/notifications/format";

const STATUS_META: Record<
  GroupInvitation["status"],
  { label: string; tint: string; soft: string; icon: typeof Clock }
> = {
  pending: { label: "En attente", tint: colors.amber, soft: colors.amberSoft, icon: Clock },
  accepted: { label: "Acceptée", tint: colors.mint, soft: colors.mintSoft, icon: UserCheck },
  refused: { label: "Refusée", tint: colors.creamDim, soft: colors.surface2, icon: UserX },
};

export default function GroupInvitationsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: invitations, isLoading, refetch, isRefetching } = useGroupInvitations(id);
  const cancel = useCancelInvitation(id!);
  const { confirm, toast } = useFeedback();
  const now = new Date();

  const onCancel = async (inv: GroupInvitation) => {
    const name = inv.first_name ?? inv.username ?? "ce joueur";
    const ok = await confirm({
      title: "Annuler l'invitation",
      message: `Annuler l'invitation envoyée à ${name} ? Elle disparaîtra aussi de ses notifications.`,
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

  if (isLoading) {
    return (
      <View className="flex-1">
        <AppBackground />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.coral} />
        </View>
      </View>
    );
  }

  const list = invitations ?? [];
  const pendingCount = list.filter((i) => i.status === "pending").length;

  return (
    <View className="flex-1">
      <AppBackground />
      <FlatList
        data={list}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 18, paddingBottom: 40, gap: 10 }}
        showsVerticalScrollIndicator={false}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListHeaderComponent={
          list.length > 0 ? (
            <Text className="mb-1 px-0.5 font-body text-[12.5px] text-cream-dim">
              {pendingCount > 0
                ? `${pendingCount} invitation${pendingCount > 1 ? "s" : ""} en attente`
                : "Aucune invitation en attente"}
              {" · "}
              {list.length} au total
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View className="mt-24 items-center gap-4 px-8">
            <View
              className="h-[72px] w-[72px] items-center justify-center rounded-full"
              style={{ backgroundColor: colors.surface2 }}
            >
              <MailX size={30} color={colors.creamDim} />
            </View>
            <Text className="text-center font-display text-[17px] tracking-tight text-cream">
              Aucune invitation envoyée
            </Text>
            <Text className="text-center font-body text-[13px] leading-[1.5] text-cream-dim">
              Cherche un joueur par son pseudo ou partage le code du défi pour inviter quelqu'un.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const meta = STATUS_META[item.status];
          const StatusIcon = meta.icon;
          const name =
            `${item.first_name ?? ""} ${item.last_name ?? ""}`.trim() || item.username || "Joueur";
          return (
            <Reveal delay={Math.min(index, 8) * 40}>
              <View
                className="rounded-[16px] border p-3.5"
                style={{ backgroundColor: colors.surface, borderColor: colors.line }}
              >
                <View className="flex-row items-center gap-3">
                  <Avatar
                    uri={item.avatar_url}
                    color={item.avatar_color}
                    icon={item.avatar_icon}
                    seed={item.invited_user_id}
                    name={name}
                    size={44}
                  />
                  <View className="flex-1">
                    <Text numberOfLines={1} className="font-body-bold text-[14px] text-cream">
                      {name}
                    </Text>
                    {item.username ? (
                      <Text numberOfLines={1} className="mt-0.5 font-body text-[11.5px] text-cream-dim">
                        @{item.username}
                      </Text>
                    ) : null}
                  </View>
                  <View
                    className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1.5"
                    style={{ backgroundColor: meta.soft }}
                  >
                    <StatusIcon size={12} color={meta.tint} strokeWidth={2.4} />
                    <Text className="font-body-bold text-[11px]" style={{ color: meta.tint }}>
                      {meta.label}
                    </Text>
                  </View>
                </View>

                {/* Pied : date + action, séparés du haut par un filet. */}
                <View
                  className="mt-3 flex-row items-center justify-between border-t pt-2.5"
                  style={{ borderTopColor: colors.line }}
                >
                  <Text className="font-body text-[11px] text-cream-dim">
                    Envoyée {relativeTime(item.created_at, now)}
                  </Text>
                  {item.status === "pending" ? (
                    <Pressable
                      onPress={() => onCancel(item)}
                      disabled={cancel.isPending}
                      hitSlop={6}
                      className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5 active:opacity-80"
                      style={{ backgroundColor: colors.redSoft, opacity: cancel.isPending ? 0.5 : 1 }}
                    >
                      <X size={12} color={colors.red} strokeWidth={2.6} />
                      <Text className="font-body-bold text-[11.5px]" style={{ color: colors.red }}>
                        Annuler
                      </Text>
                    </Pressable>
                  ) : (
                    <Text className="font-body text-[11px] text-cream-dim">
                      {item.status === "accepted" ? "A rejoint le défi" : "N'a pas rejoint"}
                    </Text>
                  )}
                </View>
              </View>
            </Reveal>
          );
        }}
      />
    </View>
  );
}
