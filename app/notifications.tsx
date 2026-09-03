import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, SectionList, Text, TextInput, View } from "react-native";
import { GestureHandlerRootView, Swipeable } from "react-native-gesture-handler";
import Animated, { FadeOutRight, LinearTransition } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Award,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  Dumbbell,
  HeartPulse,
  LogOut,
  Mail,
  PauseCircle,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  Trash2,
  TriangleAlert,
  UserPlus,
  Vote,
  Wallet,
  XCircle,
} from "lucide-react-native";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { useMyInvitationStatuses } from "@/features/groups/invitations";
import {
  useAddActivity,
  useCastActivityVote,
  useGrantSessionLimit,
  useGroupsActivitySets,
  useMyActivityVotes,
  useRejectActivity,
  useStartActivityVote,
} from "@/features/groups/requests";
import { WEB_INPUT_RESET } from "@/lib/web-input";
import { AppBackground } from "@/components/ui/AppBackground";
import { Reveal } from "@/components/ui/Reveal";
import { colors } from "@/constants/colors";
import {
  groupByDay,
  invitationOutcome,
  isVoteDone,
  relativeTime,
  unreadLabel,
} from "@/features/notifications/format";
import {
  useMyVotedTargets,
  useNotifications,
  type AppNotification,
} from "@/features/notifications/queries";
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
    case "member_joined":
      return { icon: UserPlus, color: colors.mint, soft: colors.mintSoft };
    case "member_left":
      return { icon: LogOut, color: colors.creamDim, soft: colors.surface2 };
    case "penalty_change_request":
    case "penalty_applied":
    case "payment_reminder":
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
    case "activity_request":
    case "activity_vote":
      return { icon: Dumbbell, color: colors.coral, soft: colors.coralSoft };
    case "rule_change_request":
      return { icon: SlidersHorizontal, color: colors.amber, soft: colors.amberSoft };
    case "activity_added":
      return { icon: CheckCircle2, color: colors.mint, soft: colors.mintSoft };
    case "activity_rejected":
      return { icon: XCircle, color: colors.creamDim, soft: colors.surface2 };
    case "session_refused_by_member":
      return { icon: XCircle, color: colors.red, soft: colors.redSoft };
    case "blame_received":
      // « Vote manqué » : tu n'as pas voté à temps → +1 blâme (avertissement).
      return { icon: Vote, color: colors.amber, soft: colors.amberSoft };
    case "blame_threshold_reached":
      return { icon: TriangleAlert, color: colors.amber, soft: colors.amberSoft };
    case "suspension_requested":
    case "suspension_set":
      return { icon: PauseCircle, color: colors.amber, soft: colors.amberSoft };
    case "suspension_accepted":
      return { icon: CheckCircle2, color: colors.mint, soft: colors.mintSoft };
    case "suspension_rejected":
      return { icon: XCircle, color: colors.red, soft: colors.redSoft };
    case "session_limit_request":
      return { icon: Plus, color: colors.amber, soft: colors.amberSoft };
    case "session_limit_granted":
      return { icon: CheckCircle2, color: colors.mint, soft: colors.mintSoft };
    case "session_reminder":
      // Rappel hebdo « n'oublie pas tes séances » (cron SQL 045).
      return { icon: Dumbbell, color: colors.amber, soft: colors.amberSoft };
    case "badge_unlocked":
      // Trophée débloqué (SQL 065).
      return { icon: Award, color: colors.amber, soft: colors.amberSoft };
    case "objective_reached":
      // Objectif hebdo atteint — célébration positive (SQL 069).
      return { icon: Target, color: colors.mint, soft: colors.mintSoft };
    default:
      return { icon: Bell, color: colors.creamDim, soft: colors.surface2 };
  }
}

/**
 * Libellé du bouton d'action de la notification, quand elle en appelle une.
 * `null` → la ligne reste purement informative (on ouvre juste le contexte).
 */
function actionLabel(type: string): string | null {
  switch (type) {
    case "group_invitation":
      return "Voir l'invitation";
    case "penalty_change_request":
      return "Répondre";
    case "vote_pending_session":
    case "vote_pending_excuse":
      return "Voter";
    case "rule_change_request":
      return "Modifier le défi";
    default:
      return null;
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { data: notifications, isLoading } = useNotifications();
  const { data: votedTargets } = useMyVotedTargets();
  const { data: invitationStatuses } = useMyInvitationStatuses();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();
  const deleteOne = useDeleteNotification();
  const deleteAll = useDeleteAllNotifications();
  const { confirm, toast } = useFeedback();

  const now = useMemo(() => new Date(), []);
  const sections = useMemo(() => groupByDay(notifications ?? [], now), [notifications, now]);
  const unread = (notifications ?? []).filter((n) => !n.read).length;

  // Sports déjà présents dans les défis cités par une demande d'ajout : sert à
  // afficher « ajouté » sur une demande déjà traitée, même après rechargement.
  const activityRequestGroupIds = useMemo(
    () =>
      (notifications ?? [])
        .filter((n) => n.type === "activity_request")
        .map((n) => (n.data as Record<string, string> | null)?.group_id)
        .filter((id): id is string => typeof id === "string"),
    [notifications]
  );
  const { data: activitySets } = useGroupsActivitySets(activityRequestGroupIds);
  const { data: activityVotes } = useMyActivityVotes();

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
    } else if (n.type === "rule_change_request" && data.group_id) {
      // Une règle vaut pour tout le monde : on n'y touche pas d'un tap, on
      // amène l'admin sur l'écran de modification pour qu'il décide.
      router.push({ pathname: "/group/[id]/edit", params: { id: data.group_id } } as never);
    } else if (
      (n.type === "vote_pending_excuse" || n.type === "vote_pending_session") &&
      data.group_id &&
      !isVoteDone(n, votedTargets)
    ) {
      // Une demande à voter → directement le deck de vote du groupe. Déjà voté :
      // on tombe dans le cas suivant (dashboard), pas sur un deck vide.
      router.push({ pathname: "/group/[id]/vote", params: { id: data.group_id } } as never);
    } else if (
      (n.type === "payment_reminder" || n.type === "penalty_applied") &&
      data.group_id
    ) {
      // Relance de cagnotte / pénalité appliquée (clôture hebdo) → droit sur l'écran
      // Cagnotte (le solde à régler et le détail des pénalités y sont).
      router.push({ pathname: "/group/[id]/cagnotte", params: { id: data.group_id } } as never);
    } else if (
      // Les valeurs d'enum suspension_* ne sont pas encore dans les types générés
      // (SQL 052) → on compare en `string`, comme pour les RPC pas encore typées.
      ["suspension_requested", "suspension_set", "suspension_accepted", "suspension_rejected"].includes(
        n.type as string
      ) &&
      data.group_id
    ) {
      // Suspension → l'écran dédié : l'admin y accepte/refuse la demande, le joueur
      // y voit son statut (pas de bouton dans la notif, la décision se prend là-bas).
      router.push({ pathname: "/group/[id]/suspensions", params: { id: data.group_id } } as never);
    } else if (
      (n.type === "session_refused_by_member" || n.type === "session_rejected") &&
      data.group_id &&
      data.session_id
    ) {
      // Refus d'une séance → on ouvre directement la FICHE de la séance concernée
      // (le détail du refus + tous les commentaires des votants y sont), plutôt que
      // le dashboard du groupe. `openSession` est lu par l'écran du groupe pour
      // rouvrir la fiche à l'arrivée (retour Romain : « voir le pourquoi »).
      router.push({
        pathname: "/group/[id]",
        params: { id: data.group_id, openSession: data.session_id },
      } as never);
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

  const hasNotifs = (notifications?.length ?? 0) > 0;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1">
        <AppBackground />
        <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
          {/* Entête maison : le header natif ne peut pas porter le compteur ni les actions. */}
          <View className="px-[18px] pb-3 pt-1">
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => router.back()}
                hitSlop={10}
                accessibilityLabel="Retour"
                className="h-10 w-10 items-center justify-center rounded-chip active:opacity-70"
              >
                <ChevronLeft size={24} color={colors.cream} strokeWidth={2.2} />
              </Pressable>
              <Text className="flex-1 font-display text-[22px] tracking-tighter text-cream">
                Notifications
              </Text>
              {hasNotifs ? (
                <Pressable
                  onPress={onDeleteAll}
                  hitSlop={8}
                  disabled={deleteAll.isPending}
                  accessibilityLabel="Tout effacer"
                  className="h-10 w-10 items-center justify-center rounded-chip border active:opacity-70"
                  style={{ backgroundColor: colors.surface, borderColor: colors.line }}
                >
                  <Trash2 size={17} color={colors.creamDim} />
                </Pressable>
              ) : null}
            </View>

            {/* Compteur + action de masse. Hors de la liste : l'action reste
                atteignable même après avoir fait défiler tout le flux. */}
            {unread > 0 ? (
              <View className="mt-2.5 flex-row items-center justify-between gap-3 pl-0.5">
                <View
                  className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1.5"
                  style={{ backgroundColor: colors.coralSoft }}
                >
                  <View
                    style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.coral }}
                  />
                  <Text className="font-body-bold text-[10.5px] tracking-eyebrow text-coral">
                    {unreadLabel(unread)}
                  </Text>
                </View>

                <Pressable
                  onPress={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                  hitSlop={8}
                  accessibilityLabel="Tout marquer comme lu"
                  className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 active:opacity-70"
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.line2,
                    opacity: markAllRead.isPending ? 0.5 : 1,
                  }}
                >
                  <CheckCheck size={14} color={colors.cream} strokeWidth={2.2} />
                  <Text className="font-body-semibold text-[12px] text-cream">Tout marquer lu</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={colors.coral} />
            </View>
          ) : hasNotifs ? (
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              // Espacements en style inline : le `gap` du conteneur d'une
              // SectionList n'est pas appliqué sur le web, les lignes se
              // touchaient. Une marge par ligne se comporte pareil partout.
              contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32 }}
              showsVerticalScrollIndicator={false}
              stickySectionHeadersEnabled={false}
              renderSectionHeader={({ section }) => (
                <Text
                  className="px-0.5 font-display text-[13px] text-cream-dim"
                  style={{ marginTop: 10, marginBottom: 8 }}
                >
                  {section.title}
                </Text>
              )}
              renderItem={({ item, index }) => (
                <NotificationRow
                  item={item}
                  now={now}
                  delay={Math.min(index, 6) * 40}
                  voteDone={isVoteDone(item, votedTargets)}
                  invitation={invitationOutcome(item, invitationStatuses)}
                  activitySets={activitySets}
                  activityVotes={activityVotes}
                  onMarkRead={() => {
                    if (!item.read) markRead.mutate(item.id);
                  }}
                  onPress={() => onPressNotification(item)}
                  onDelete={() => deleteOne.mutate(item.id)}
                />
              )}
            />
          ) : (
            <View className="flex-1 items-center justify-center gap-4 px-8 pb-20">
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

/** Petite pastille d'état non cliquable (« Sport ajouté », « Ton vote : Pour »…). */
function StatePill({ label, tone }: { label: string; tone: "mint" | "neutral" | "red" }) {
  const map = {
    mint: { bg: colors.mintSoft, fg: colors.mint, Icon: Check },
    neutral: { bg: colors.surface2, fg: colors.creamDim, Icon: Check },
    red: { bg: colors.redSoft, fg: colors.red, Icon: XCircle },
  } as const;
  const { bg, fg, Icon } = map[tone];
  return (
    <View className="mt-2.5 flex-row">
      <View
        className="flex-row items-center gap-1.5 rounded-[10px] px-3 py-2"
        style={{ backgroundColor: bg }}
      >
        <Icon size={14} color={fg} strokeWidth={2.8} />
        <Text className="font-body-bold text-[12.5px]" style={{ color: fg }}>
          {label}
        </Text>
      </View>
    </View>
  );
}

function NotificationRow({
  item,
  now,
  delay,
  voteDone,
  invitation,
  activitySets,
  activityVotes,
  onMarkRead,
  onPress,
  onDelete,
}: {
  item: AppNotification;
  now: Date;
  delay: number;
  /** Vote déjà donné → on montre l'état, on ne redemande pas l'action. */
  voteDone: boolean;
  /** Invitation déjà acceptée ou refusée. */
  invitation: "accepted" | "refused" | null;
  /** Sports déjà présents par défi — pour l'état « ajouté » d'une demande d'ajout. */
  activitySets: Record<string, Set<string>> | undefined;
  /** Mes votes sur les propositions d'ajout de sport (proposalId → oui/non). */
  activityVotes: Record<string, boolean> | undefined;
  /** Marque la notification lue (une action = une lecture). */
  onMarkRead: () => void;
  onPress: () => void;
  onDelete: () => void;
}) {
  const swipeRef = useRef<Swipeable>(null);
  const { toast } = useFeedback();
  const { icon: Icon, color, soft } = notifVisual(item.type);
  const action = actionLabel(item.type);

  const reqData = (item.data ?? {}) as Record<string, string>;
  const groupId = reqData.group_id ?? "";

  // Actions possibles selon le type. Les hooks sont inconditionnels (React), mais
  // ne partent qu'au clic du bouton correspondant.
  const addActivity = useAddActivity(groupId);
  const rejectActivity = useRejectActivity(groupId);
  const startVote = useStartActivityVote(groupId);
  const castVote = useCastActivityVote();
  const grantLimit = useGrantSessionLimit(groupId);

  // États locaux : réponse immédiate + persistance douce (l'écran ne se remonte pas).
  const [justAdded, setJustAdded] = useState(false);
  const [localOutcome, setLocalOutcome] = useState<"refused" | "vote_started" | "granted" | null>(
    null
  );
  const [localVote, setLocalVote] = useState<boolean | null>(null);
  const [refuseOpen, setRefuseOpen] = useState(false);
  const [refuseComment, setRefuseComment] = useState("");

  const isActivityRequest = item.type === "activity_request";
  const isActivityVote = item.type === "activity_vote";
  const isLimitRequest = item.type === "session_limit_request";

  const alreadyAdded =
    isActivityRequest &&
    !!reqData.activity &&
    (justAdded || !!activitySets?.[groupId]?.has(reqData.activity.trim().toLowerCase()));

  // Vote de sport : ma décision (persistée) ou celle de cette session.
  const myVote = isActivityVote
    ? (localVote ?? activityVotes?.[reqData.proposal_id ?? ""] ?? null)
    : null;

  const acted = () => onMarkRead(); // toute action vaut lecture

  const onAddActivity = () => {
    if (!reqData.activity) return;
    acted();
    addActivity.mutate(
      { activity: reqData.activity, requesterId: reqData.requester_id ?? null },
      {
        onSuccess: () => {
          setJustAdded(true);
          toast(`« ${reqData.activity} » ajouté au défi.`, "success");
        },
        onError: (e) => toast(e.message, "error"),
      }
    );
  };

  const onRefuseActivity = () => {
    if (!reqData.activity) return;
    acted();
    rejectActivity.mutate(
      {
        activity: reqData.activity,
        requesterId: reqData.requester_id ?? null,
        comment: refuseComment.trim() || undefined,
      },
      {
        onSuccess: () => {
          setLocalOutcome("refused");
          setRefuseOpen(false);
          toast("Demande refusée. Le joueur est prévenu.", "success");
        },
        onError: (e) => toast(e.message, "error"),
      }
    );
  };

  const onStartVote = () => {
    if (!reqData.activity) return;
    acted();
    startVote.mutate(
      { activity: reqData.activity, requesterId: reqData.requester_id ?? null },
      {
        onSuccess: () => {
          setLocalOutcome("vote_started");
          toast("Vote lancé : le groupe décide.", "success");
        },
        onError: (e) => toast(e.message, "error"),
      }
    );
  };

  const onCastVote = (value: boolean) => {
    if (!reqData.proposal_id) return;
    acted();
    setLocalVote(value);
    castVote.mutate(
      { proposalId: reqData.proposal_id, value },
      {
        onError: (e) => {
          setLocalVote(null);
          toast(e.message, "error");
        },
      }
    );
  };

  const onGrantLimit = () => {
    if (!reqData.requester_id || !reqData.day) return;
    acted();
    grantLimit.mutate(
      { userId: reqData.requester_id, day: reqData.day },
      {
        onSuccess: () => {
          setLocalOutcome("granted");
          toast("Séance supplémentaire accordée.", "success");
        },
        onError: (e) => toast(e.message, "error"),
      }
    );
  };

  const renderRightActions = () => (
    <Pressable
      onPress={() => {
        swipeRef.current?.close();
        onDelete();
      }}
      className="ml-2 w-20 items-center justify-center rounded-2xl active:opacity-80"
      style={{ backgroundColor: colors.red }}
    >
      <Trash2 size={20} color={colors.cream} />
      <Text className="mt-1 font-body-semibold text-[11px]" style={{ color: colors.cream }}>
        Supprimer
      </Text>
    </Pressable>
  );

  return (
    <Animated.View
      exiting={FadeOutRight.duration(220)}
      layout={LinearTransition}
      style={{ marginBottom: 10 }}
    >
      <Reveal delay={delay}>
        <Swipeable ref={swipeRef} renderRightActions={renderRightActions} overshootRight={false}>
          <Pressable
            onPress={onPress}
            className="flex-row gap-3 rounded-2xl border p-3.5 active:opacity-90"
            style={{
              backgroundColor: colors.surface,
              // Non lue = bordure plus marquée, comme la maquette. Pas de fond
              // teinté : sur une liste entière il devenait vite criard.
              borderColor: item.read ? colors.line : colors.line2,
            }}
          >
            <View
              className="h-[42px] w-[42px] items-center justify-center rounded-xl"
              style={{ backgroundColor: soft }}
            >
              <Icon size={20} color={color} strokeWidth={2} />
            </View>

            <View className="flex-1 pr-3">
              <Text className="font-body-bold text-[13.5px] leading-[19px] text-cream">
                {item.title}
              </Text>
              <Text className="mt-0.5 font-body text-[12.5px] leading-[17px] text-cream-dim">
                {item.body}
              </Text>
              <Text className="mt-1 font-body text-[11px] text-cream-dim" style={{ opacity: 0.75 }}>
                {relativeTime(item.created_at, now)}
              </Text>

              {isActivityRequest ? (
                alreadyAdded ? (
                  <StatePill label="Sport ajouté" tone="mint" />
                ) : localOutcome === "refused" ? (
                  <StatePill label="Demande refusée" tone="red" />
                ) : localOutcome === "vote_started" ? (
                  <StatePill label="Vote lancé au groupe" tone="neutral" />
                ) : refuseOpen ? (
                  // Refus : commentaire facultatif, puis envoi.
                  <View className="mt-2.5 gap-2">
                    <TextInput
                      value={refuseComment}
                      onChangeText={setRefuseComment}
                      placeholder="Un mot pour expliquer (facultatif)…"
                      placeholderTextColor="rgba(183,161,139,0.5)"
                      multiline
                      style={[
                        {
                          minHeight: 40,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: colors.line2,
                          backgroundColor: colors.surface2,
                          color: colors.cream,
                          fontFamily: "PlusJakartaSans_400Regular",
                          fontSize: 12.5,
                          paddingHorizontal: 12,
                          paddingVertical: 9,
                        },
                        WEB_INPUT_RESET,
                      ]}
                    />
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={onRefuseActivity}
                        disabled={rejectActivity.isPending}
                        className="flex-row items-center gap-1.5 rounded-[10px] px-3.5 py-2 active:opacity-80"
                        style={{
                          backgroundColor: colors.red,
                          opacity: rejectActivity.isPending ? 0.6 : 1,
                        }}
                      >
                        <Text
                          className="font-body-bold text-[12px]"
                          style={{ color: colors.cream }}
                        >
                          Envoyer le refus
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setRefuseOpen(false)}
                        className="items-center justify-center rounded-[10px] px-3 py-2 active:opacity-70"
                        style={{ backgroundColor: colors.surface2 }}
                      >
                        <Text className="font-body-semibold text-[12px] text-cream-dim">
                          Annuler
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View className="mt-2.5 gap-2">
                    <Pressable
                      onPress={onAddActivity}
                      disabled={addActivity.isPending}
                      className="flex-row items-center justify-center gap-1.5 rounded-[10px] px-4 py-2.5 active:opacity-80"
                      style={{
                        backgroundColor: colors.coral,
                        opacity: addActivity.isPending ? 0.6 : 1,
                      }}
                    >
                      <Plus size={14} color={colors.onCoral} strokeWidth={2.6} />
                      <Text
                        className="font-body-bold text-[12.5px]"
                        style={{ color: colors.onCoral }}
                      >
                        Ajouter « {reqData.activity} »
                      </Text>
                    </Pressable>
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => setRefuseOpen(true)}
                        className="flex-1 items-center justify-center rounded-[10px] border py-2 active:opacity-80"
                        style={{ backgroundColor: colors.surface2, borderColor: colors.line }}
                      >
                        <Text className="font-body-semibold text-[12px] text-cream-dim">
                          Refuser
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={onStartVote}
                        disabled={startVote.isPending}
                        className="flex-1 flex-row items-center justify-center gap-1.5 rounded-[10px] border py-2 active:opacity-80"
                        style={{
                          backgroundColor: colors.amberSoft,
                          borderColor: "rgba(255,178,62,0.3)",
                        }}
                      >
                        <Vote size={13} color={colors.amber} />
                        <Text
                          className="font-body-semibold text-[12px]"
                          style={{ color: colors.amber }}
                        >
                          Lancer un vote
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )
              ) : isActivityVote ? (
                myVote !== null ? (
                  <StatePill
                    label={myVote ? "Ton vote : Pour" : "Ton vote : Contre"}
                    tone={myVote ? "mint" : "neutral"}
                  />
                ) : (
                  <View className="mt-2.5 flex-row gap-2">
                    <Pressable
                      onPress={() => onCastVote(true)}
                      disabled={castVote.isPending}
                      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-[10px] py-2.5 active:opacity-80"
                      style={{ backgroundColor: colors.mint }}
                    >
                      <Check size={14} color={colors.onMint} strokeWidth={2.8} />
                      <Text
                        className="font-body-bold text-[12.5px]"
                        style={{ color: colors.onMint }}
                      >
                        Pour
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => onCastVote(false)}
                      disabled={castVote.isPending}
                      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-[10px] border py-2.5 active:opacity-80"
                      style={{ backgroundColor: colors.surface2, borderColor: colors.line }}
                    >
                      <XCircle size={14} color={colors.creamDim} />
                      <Text className="font-body-bold text-[12.5px] text-cream-dim">Contre</Text>
                    </Pressable>
                  </View>
                )
              ) : isLimitRequest ? (
                localOutcome === "granted" ? (
                  <StatePill label="Séance accordée" tone="mint" />
                ) : (
                  <View className="mt-2.5 flex-row">
                    <Pressable
                      onPress={onGrantLimit}
                      disabled={grantLimit.isPending}
                      className="flex-row items-center gap-1.5 rounded-[10px] px-4 py-2 active:opacity-80"
                      style={{
                        backgroundColor: colors.coral,
                        opacity: grantLimit.isPending ? 0.6 : 1,
                      }}
                    >
                      <Check size={14} color={colors.onCoral} strokeWidth={2.6} />
                      <Text
                        className="font-body-bold text-[12.5px]"
                        style={{ color: colors.onCoral }}
                      >
                        Accorder une séance
                      </Text>
                    </Pressable>
                  </View>
                )
              ) : action && invitation ? (
                // L'invitation a déjà été tranchée : « Voir l'invitation »
                // ouvrirait un écran qui n'a plus rien à proposer.
                <View className="mt-2.5 flex-row">
                  <View
                    className="flex-row items-center gap-1.5 rounded-[10px] px-3 py-2"
                    style={{
                      backgroundColor:
                        invitation === "accepted" ? colors.mintSoft : colors.surface2,
                    }}
                  >
                    {invitation === "accepted" ? (
                      <Check size={14} color={colors.mint} strokeWidth={2.8} />
                    ) : (
                      <XCircle size={14} color={colors.creamDim} />
                    )}
                    <Text
                      className="font-body-bold text-[12.5px]"
                      style={{ color: invitation === "accepted" ? colors.mint : colors.creamDim }}
                    >
                      {invitation === "accepted" ? "Tu as rejoint le défi" : "Invitation refusée"}
                    </Text>
                  </View>
                </View>
              ) : action && voteDone ? (
                // Vote déjà donné : un bouton « Voter » ici renverrait sur un deck
                // vide. On affiche l'état, en vert, non cliquable.
                <View className="mt-2.5 flex-row">
                  <View
                    className="flex-row items-center gap-1.5 rounded-[10px] px-3 py-2"
                    style={{ backgroundColor: colors.mintSoft }}
                  >
                    <Check size={14} color={colors.mint} strokeWidth={2.8} />
                    <Text className="font-body-bold text-[12.5px]" style={{ color: colors.mint }}>
                      Ton vote est enregistré
                    </Text>
                  </View>
                </View>
              ) : action ? (
                <View className="mt-2.5 flex-row">
                  <Pressable
                    onPress={onPress}
                    className="rounded-[10px] px-4 py-2 active:opacity-80"
                    style={{ backgroundColor: colors.coral }}
                  >
                    <Text
                      className="font-body-bold text-[12.5px]"
                      style={{ color: colors.onCoral }}
                    >
                      {action}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            {!item.read ? (
              <View
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  width: 9,
                  height: 9,
                  borderRadius: 5,
                  backgroundColor: colors.coral,
                }}
              />
            ) : null}
          </Pressable>
        </Swipeable>
      </Reveal>
    </Animated.View>
  );
}
