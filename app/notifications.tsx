import { useRouter } from "expo-router";
import { useRef } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { GestureHandlerRootView, Swipeable } from "react-native-gesture-handler";
import Animated, { FadeOutRight, LinearTransition } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Bell,
  CheckCircle2,
  HeartPulse,
  Mail,
  ShieldCheck,
  Trash2,
  Vote,
  Wallet,
  XCircle,
} from "lucide-react-native";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { AppBackground } from "@/components/ui/AppBackground";
import { colors } from "@/constants/colors";
import { useNotifications, type AppNotification } from "@/features/notifications/queries";
import {
  useDeleteAllNotifications,
  useDeleteNotification,
  useMarkAllRead,
  useMarkNotificationRead,
} from "@/features/notifications/mutations";

/** Icône + teinte par type de notification (pastille douce, façon DA). */
function notifVisual(type: string): { icon: typeof Bell; color: string; soft: string } {
  switch (type) {
    case "group_invitation":
      return { icon: Mail, color: colors.coral, soft: colors.coralSoft };
    case "penalty_change_request":
      return { icon: Wallet, color: colors.amber, soft: colors.amberSoft };
    case "vote_pending_excuse":
      return { icon: HeartPulse, color: colors.amber, soft: colors.amberSoft };
    case "vote_pending_session":
      return { icon: Vote, color: colors.coral, soft: colors.coralSoft };
    case "excuse_accepted":
    case "session_validated":
      return { icon: CheckCircle2, color: colors.mint, soft: colors.mintSoft };
    case "excuse_rejected":
    case "session_rejected":
      return { icon: XCircle, color: colors.red, soft: colors.redSoft };
    case "admin_transferred":
      return { icon: ShieldCheck, color: colors.amber, soft: colors.amberSoft };
    default:
      return { icon: Bell, color: colors.creamDim, soft: colors.surface2 };
  }
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
  const deleteOne = useDeleteNotification();
  const deleteAll = useDeleteAllNotifications();
  const { confirm, toast } = useFeedback();

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
    } else if (
      (n.type === "vote_pending_excuse" || n.type === "vote_pending_session") &&
      data.group_id
    ) {
      // Une demande à voter → directement le deck de vote du groupe.
      router.push({ pathname: "/group/[id]/vote", params: { id: data.group_id } } as never);
    } else if (data.group_id) {
      // Résultat (excuse/séance acceptée ou refusée…) → dashboard du groupe.
      router.push({ pathname: "/group/[id]", params: { id: data.group_id } } as never);
    }
  };

  const onDeleteAll = async () => {
    const ok = await confirm({
      title: "Tout effacer",
      message: "Supprimer toutes tes notifications ? Cette action est irréversible.",
      confirmLabel: "Tout effacer",
      destructive: true,
    });
    if (!ok) return;
    deleteAll.mutate(undefined, {
      onSuccess: () => toast("Notifications effacées", "success"),
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

  const hasNotifs = (notifications?.length ?? 0) > 0;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1">
        <AppBackground />
        <SafeAreaView className="flex-1" edges={["bottom"]}>
          {hasNotifs ? (
            <Animated.FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              itemLayoutAnimation={LinearTransition}
              contentContainerClassName="gap-2.5 p-[18px]"
              ListHeaderComponent={
                <View className="mb-1.5 flex-row items-center justify-between">
                  <Pressable onPress={() => markAllRead.mutate()} hitSlop={8}>
                    <Text className="font-body-semibold text-[12px] text-coral">
                      Tout marquer comme lu
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={onDeleteAll}
                    hitSlop={8}
                    className="flex-row items-center gap-1.5"
                    disabled={deleteAll.isPending}
                  >
                    <Trash2 size={13} color={colors.red} />
                    <Text className="font-body-semibold text-[12px]" style={{ color: colors.red }}>
                      Tout effacer
                    </Text>
                  </Pressable>
                </View>
              }
              renderItem={({ item }) => (
                <NotificationRow
                  item={item}
                  onPress={() => onPressNotification(item)}
                  onDelete={() => deleteOne.mutate(item.id)}
                />
              )}
            />
          ) : (
            <View className="flex-1 items-center justify-center gap-4 px-8">
              <View
                className="h-[72px] w-[72px] items-center justify-center rounded-full"
                style={{ backgroundColor: colors.surface2 }}
              >
                <Bell size={32} color={colors.creamDim} />
              </View>
              <Text className="text-center font-display text-[18px] tracking-tight text-cream">
                Rien pour l'instant
              </Text>
              <Text className="text-center font-body text-[13px] leading-[1.5] text-cream-dim">
                Les demandes à voter, résultats de tes excuses et infos du groupe arriveront ici.
              </Text>
            </View>
          )}
        </SafeAreaView>
      </View>
    </GestureHandlerRootView>
  );
}

function NotificationRow({
  item,
  onPress,
  onDelete,
}: {
  item: AppNotification;
  onPress: () => void;
  onDelete: () => void;
}) {
  const swipeRef = useRef<Swipeable>(null);
  const { icon: Icon, color, soft } = notifVisual(item.type);

  const renderRightActions = () => (
    <Pressable
      onPress={() => {
        swipeRef.current?.close();
        onDelete();
      }}
      className="my-0.5 ml-2 w-20 items-center justify-center rounded-2xl active:opacity-80"
      style={{ backgroundColor: colors.red }}
    >
      <Trash2 size={20} color={colors.cream} />
      <Text className="mt-1 font-body-semibold text-[11px]" style={{ color: colors.cream }}>
        Supprimer
      </Text>
    </Pressable>
  );

  return (
    <Animated.View exiting={FadeOutRight.duration(220)}>
      <Swipeable ref={swipeRef} renderRightActions={renderRightActions} overshootRight={false}>
        <Pressable
          onPress={onPress}
          className="flex-row items-start gap-3 rounded-2xl border p-3.5 active:opacity-90"
          style={{
            backgroundColor: item.read ? colors.surface : "rgba(255,106,69,0.07)",
            borderColor: item.read ? colors.line : "rgba(255,106,69,0.32)",
          }}
        >
          <View
            className="h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: soft }}
          >
            <Icon size={19} color={color} strokeWidth={2.1} />
          </View>
          <View className="flex-1">
            <Text className="font-display text-[14px] tracking-tight text-cream">{item.title}</Text>
            <Text className="mt-0.5 font-body text-[12.5px] leading-[1.45] text-cream-dim">
              {item.body}
            </Text>
            <Text className="mt-1.5 font-body text-[10.5px] text-cream-dim" style={{ opacity: 0.7 }}>
              {formatWhen(item.created_at)}
            </Text>
          </View>
          {!item.read ? (
            <View
              className="mt-1 h-2 w-2 rounded-full"
              style={{ backgroundColor: colors.coral }}
            />
          ) : null}
        </Pressable>
      </Swipeable>
    </Animated.View>
  );
}
