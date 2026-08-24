import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Activity,
  CalendarDays,
  Check,
  ChevronLeft,
  Clock,
  ExternalLink,
  FileText,
  HeartPulse,
  MapPin,
  X,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { JustificationViewer } from "@/components/excuses/JustificationViewer";
import { AppBackground } from "@/components/ui/AppBackground";
import { Avatar } from "@/components/ui/Avatar";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { colors, gradients } from "@/constants/colors";
import { kindFromMime } from "@/features/excuses/attachment";
import { EXCUSE_TYPES } from "@/features/excuses/excuse-logic";
import {
  useJustificationSignedUrl,
  useVotableExcuses,
  type VotableExcuse,
} from "@/features/excuses/queries";
import { mapExcuseError, useCastExcuseVote } from "@/features/excuses/mutations";
import { useGroup, useGroupMembers } from "@/features/groups/queries";
import { useProofSignedUrl } from "@/features/sessions/queries";
import { mapVoteError, useCastVote } from "@/features/votes/mutations";
import { useVotableSessions, type VotableSession } from "@/features/votes/queries";
import {
  formatTimeRemaining,
  voteDeadline,
  voteThreshold,
  type VoteDeadlineType,
} from "@/features/votes/vote-logic";
import { useCurrentUser } from "@/lib/auth-store";
import { formatDbDate } from "@/lib/date";
import { formatDuration } from "@/lib/duration";
import { getSportIcon } from "@/lib/sports";

const SWIPE_THRESHOLD = 110;

/** Élément votable du deck : une séance OU une excuse. */
type VItem =
  | { kind: "session"; key: string; name: string; data: VotableSession }
  | { kind: "excuse"; key: string; name: string; data: VotableExcuse };

function personName(p: {
  first_name: string | null;
  username: string | null;
}): string {
  return p.first_name || p.username || "ce membre";
}

function useNow(intervalMs = 60000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function relativeDay(dateStr: string, now: Date): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((today.getTime() - date.getTime()) / 86_400_000);
  if (diff === 0) return "aujourd'hui";
  if (diff === 1) return "hier";
  return formatDbDate(dateStr);
}

function haptic() {
  if (Platform.OS === "web") return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export default function VoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const me = useCurrentUser();
  const { toast } = useFeedback();

  const { data: group } = useGroup(id);
  const { data: members } = useGroupMembers(id);
  const { data: sessions, isLoading: loadingSessions } = useVotableSessions(id, me?.id);
  const { data: excuses, isLoading: loadingExcuses } = useVotableExcuses(id, me?.id);
  const castVote = useCastVote();
  const castExcuseVote = useCastExcuseVote();
  const now = useNow();

  // File d'attente locale : on retire un élément dès qu'on a voté (le refetch des queries le
  // retire aussi, mais plus tard → ce set évite tout « saut » d'une carte).
  const [votedIds, setVotedIds] = useState<Set<string>>(() => new Set());
  const [refuse, setRefuse] = useState<VItem | null>(null);
  const tx = useSharedValue(0);

  const all = useMemo<VItem[]>(() => {
    const s: VItem[] = (sessions ?? []).map((it) => ({
      kind: "session",
      key: `s:${it.session.id}`,
      name: personName(it.session.author),
      data: it,
    }));
    const e: VItem[] = (excuses ?? []).map((it) => ({
      kind: "excuse",
      key: `e:${it.excuse.id}`,
      name: personName(it.excuse.author),
      data: it,
    }));
    return [...s, ...e];
  }, [sessions, excuses]);

  const queue = useMemo(() => all.filter((it) => !votedIds.has(it.key)), [all, votedIds]);
  const current = queue[0];
  const remaining = queue.length;
  const isLoading = loadingSessions || loadingExcuses;

  const otherMembers = Math.max(1, (members?.length ?? 1) - 1);
  const threshold = voteThreshold(otherMembers);
  const deadlineType: VoteDeadlineType = group?.vote_deadline ?? "end_of_week";

  const goBack = () =>
    router.canGoBack() ? router.back() : router.navigate("/groups" as never);

  // « Retour au groupe » : on va VRAIMENT au dashboard du défi (peu importe d'où on
  // vient — notif, accueil…). `replace` pour ne pas empiler l'écran de vote vide.
  const backToGroup = () =>
    id ? router.replace(`/group/${id}` as never) : goBack();

  const commitVote = (item: VItem, value: boolean, comment: string | null) => {
    if (item.kind === "session") {
      castVote.mutate(
        { sessionId: item.data.session.id, groupId: id!, value, comment },
        {
          onSuccess: () =>
            toast(
              value
                ? `Tu as validé la séance de ${item.name}.`
                : `Tu as refusé la séance de ${item.name}.`,
              "success"
            ),
          onError: (e) => toast(mapVoteError(e.message), "error"),
        }
      );
    } else {
      castExcuseVote.mutate(
        { excuseId: item.data.excuse.id, groupId: id!, value, comment },
        {
          onSuccess: () =>
            toast(
              value
                ? `Tu as accepté l'excuse de ${item.name}.`
                : `Tu as refusé l'excuse de ${item.name}.`,
              "success"
            ),
          onError: (e) => toast(mapExcuseError(e.message), "error"),
        }
      );
    }
    setVotedIds((prev) => new Set(prev).add(item.key));
    tx.value = 0;
  };

  /**
   * Validation (bouton ou glissement).
   *
   * Le vote partait AUTREFOIS depuis le rappel de fin d'animation. Quand ce
   * rappel n'arrivait pas — c'est le cas sur le web quand l'onglet perd le focus
   * ou qu'un re-rendu tombe pendant les 220 ms — la carte restait affichée alors
   * que le vote était déjà parti : il fallait re-cliquer. Le vote est maintenant
   * envoyé **immédiatement**, l'animation n'est plus que décorative.
   */
  const validate = () => {
    if (!current) return;
    haptic();
    commitVote(current, true, null);
  };

  // Refus = ouvre la modale d'explication (le commentaire part à l'auteur).
  const requestRefuse = () => {
    if (!current) return;
    haptic();
    tx.value = withSpring(0);
    setRefuse(current);
  };

  const confirmRefuse = (comment: string | null) => {
    const item = refuse;
    setRefuse(null);
    if (item) commitVote(item, false, comment);
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      tx.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        // Même règle que le bouton : on vote dès le relâchement, sans attendre
        // la fin de l'animation de sortie.
        runOnJS(validate)();
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        tx.value = withSpring(0);
        runOnJS(requestRefuse)();
      } else {
        tx.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { rotate: `${tx.value / 22}deg` }],
  }));
  const yesStamp = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, tx.value / SWIPE_THRESHOLD)),
  }));
  const noStamp = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, -tx.value / SWIPE_THRESHOLD)),
  }));

  return (
    <View className="flex-1">
      <AppBackground />
      <ScreenContainer transparent padded={false} edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center gap-3 px-[18px] pb-2 pt-1">
          <Pressable
            onPress={goBack}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-chip border border-line bg-surface active:opacity-80"
          >
            <ChevronLeft size={20} color={colors.cream} />
          </Pressable>
          <View className="flex-1">
            <Text className="font-display text-[18px] tracking-tight text-cream">À valider</Text>
            {group ? (
              <Text className="mt-0.5 font-body text-[11.5px] text-cream-dim">{group.name}</Text>
            ) : null}
          </View>
          {remaining > 0 ? (
            <View className="rounded-full bg-coral-soft px-3 py-1.5">
              <Text className="font-body-bold text-[12px] text-coral">{remaining} restantes</Text>
            </View>
          ) : null}
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.coral} />
          </View>
        ) : !current ? (
          <DoneState onBack={backToGroup} />
        ) : (
          <>
            <View className="flex-1 justify-center px-[18px] pb-1 pt-1">
              <View>
                {/* effet de pile derrière (calé sur la hauteur de la carte) */}
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    top: 14,
                    left: 8,
                    right: 8,
                    bottom: -10,
                    borderRadius: 24,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.line,
                    opacity: 0.5,
                  }}
                />
                <GestureDetector gesture={pan}>
                  <Animated.View style={cardStyle}>
                    {/* tampons */}
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        {
                          position: "absolute",
                          top: 18,
                          left: 18,
                          zIndex: 5,
                          transform: [{ rotate: "-13deg" }],
                          borderWidth: 3,
                          borderColor: colors.mint,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 4,
                        },
                        yesStamp,
                      ]}
                    >
                      <Text style={{ color: colors.mint, fontWeight: "800", fontSize: 22 }}>
                        {current.kind === "excuse" ? "ACCEPTÉE" : "VALIDÉE"}
                      </Text>
                    </Animated.View>
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        {
                          position: "absolute",
                          top: 18,
                          right: 18,
                          zIndex: 5,
                          transform: [{ rotate: "13deg" }],
                          borderWidth: 3,
                          borderColor: colors.red,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 4,
                        },
                        noStamp,
                      ]}
                    >
                      <Text style={{ color: colors.red, fontWeight: "800", fontSize: 22 }}>
                        REFUSÉE
                      </Text>
                    </Animated.View>

                    {current.kind === "session" ? (
                      <VoteCard
                        item={current.data}
                        threshold={threshold}
                        now={now}
                        type={deadlineType}
                      />
                    ) : (
                      <ExcuseVoteCard item={current.data} threshold={threshold} />
                    )}
                  </Animated.View>
                </GestureDetector>
              </View>
            </View>

            {/* Actions */}
            <Reveal delay={120}>
              <View className="flex-row items-center justify-center gap-10 px-[18px] pb-2 pt-3">
                <View className="items-center gap-2">
                  <Pressable
                    onPress={requestRefuse}
                    accessibilityLabel="Refuser"
                    className="h-16 w-16 items-center justify-center rounded-full bg-surface active:opacity-80"
                    style={{ borderWidth: 1.5, borderColor: "rgba(242,85,74,0.5)" }}
                  >
                    <X size={27} color={colors.red} strokeWidth={2.6} />
                  </Pressable>
                  <Text className="font-body-semibold text-[11.5px] text-cream-dim">Refuser</Text>
                </View>
                <View className="items-center gap-2">
                  <Pressable
                    onPress={validate}
                    accessibilityLabel={current.kind === "excuse" ? "Accepter" : "Valider"}
                  >
                    <LinearGradient
                      colors={gradients.green.colors}
                      start={gradients.green.start}
                      end={gradients.green.end}
                      style={{
                        height: 74,
                        width: 74,
                        borderRadius: 37,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Check size={33} color={colors.onMint} strokeWidth={2.8} />
                    </LinearGradient>
                  </Pressable>
                  <Text className="font-body-semibold text-[11.5px] text-cream-dim">
                    {current.kind === "excuse" ? "Accepter" : "Valider"}
                  </Text>
                </View>
              </View>
            </Reveal>
          </>
        )}
      </ScreenContainer>

      <RefuseModal
        visible={refuse !== null}
        name={refuse?.name ?? ""}
        isExcuse={refuse?.kind === "excuse"}
        onCancel={() => setRefuse(null)}
        onConfirm={confirmRefuse}
      />
    </View>
  );
}

/* ---------- Carte de séance ---------- */

function VoteCard({
  item,
  threshold,
  now,
  type,
}: {
  item: VotableSession;
  threshold: number;
  now: Date;
  type: VoteDeadlineType;
}) {
  const { session, yes, no } = item;
  const proof = session.proofs[0];
  const ActivityIcon = getSportIcon(session.activity_type);
  const [zoom, setZoom] = useState(false);

  const photoPath =
    proof && (proof.proof_type === "photo" || proof.proof_type === "external_link")
      ? proof.media_url
      : null;
  const { data: signedUrl } = useProofSignedUrl(photoPath);

  const strava =
    proof?.proof_type === "strava"
      ? (proof.strava_data as { distance_m?: number; moving_time_s?: number } | null)
      : null;

  // Garde-fou : si `published_at` venait à manquer, on retombe sur la date réalisée plutôt
  // que de calculer une deadline invalide. NB : « Expiré » avec un groupe en `same_day` est
  // normal dès le lendemain de la déclaration (le vote ferme en fin de journée).
  const deadlineSource = session.published_at ?? session.performed_at;
  const deadline = voteDeadline(new Date(deadlineSource), session.week_start, type);
  const remainingLabel = formatTimeRemaining(deadline, now);

  const proofBadge =
    proof?.proof_type === "strava"
      ? "Strava"
      : proof?.proof_type === "external_link"
        ? "Lien"
        : "Photo";

  const name = session.author.first_name || session.author.username || "Membre";
  const photo =
    (proof?.proof_type === "photo" || proof?.proof_type === "external_link") && signedUrl
      ? signedUrl
      : null;

  return (
    <View
      className="overflow-hidden rounded-[24px] border bg-surface"
      style={{ borderColor: colors.line2 }}
    >
      {/* Média / preuve */}
      <View style={{ height: 196 }}>
        {proof?.proof_type === "photo" || (proof?.proof_type === "external_link" && signedUrl) ? (
          photo ? (
            <Pressable onPress={() => setZoom(true)} className="h-full w-full active:opacity-90">
              <Image source={{ uri: photo }} style={{ width: "100%", height: "100%" }} />
            </Pressable>
          ) : (
            <View className="h-full w-full items-center justify-center bg-surface-2">
              <ActivityIndicator color={colors.coral} />
            </View>
          )
        ) : proof?.proof_type === "strava" ? (
          <LinearGradient
            colors={["rgba(255,106,69,0.30)", "rgba(255,106,69,0.04)"]}
            style={{ flex: 1, justifyContent: "flex-end" }}
          >
            <View className="flex-row px-3.5 pb-3.5 pt-2">
              <StravaStat
                value={strava?.distance_m ? `${(strava.distance_m / 1000).toFixed(1)} km` : "—"}
                label="distance"
              />
              <StravaStat
                value={
                  strava?.moving_time_s ? formatDuration(strava.moving_time_s / 60) : "—"
                }
                label="durée"
              />
            </View>
          </LinearGradient>
        ) : (
          <View className="h-full w-full items-center justify-center bg-surface-2">
            <ExternalLink size={30} color={colors.creamDim} />
            {proof?.external_url ? (
              <Pressable onPress={() => Linking.openURL(proof.external_url!)} className="mt-2">
                <Text className="font-body-semibold text-[12.5px] text-coral">Voir la preuve</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {/* badge type */}
        <View
          className="absolute right-3 top-3 flex-row items-center gap-1.5 rounded-full px-2.5 py-1.5"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <Text className="font-body-semibold text-[11px] text-cream">{proofBadge}</Text>
        </View>

        {/* géo si dispo */}
        {proof?.latitude != null && proof?.longitude != null ? (
          <View
            className="absolute bottom-3 left-3 flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <MapPin size={13} color={colors.coral} />
            <Text className="font-body-semibold text-[11px] text-cream">Position vérifiée</Text>
          </View>
        ) : null}
      </View>

      {/* Infos */}
      <View className="gap-3 p-4">
        <View className="flex-row items-center gap-3">
          <Avatar
            uri={session.author.avatar_url}
            color={session.author.avatar_color}
            icon={session.author.avatar_icon}
            seed={session.author.id}
            name={`${session.author.first_name ?? ""} ${session.author.last_name ?? ""}`.trim()}
            size={42}
          />
          <View className="flex-1">
            <Text className="font-display text-[16px] tracking-tight text-cream">{name}</Text>
            <Text className="mt-0.5 font-body text-[11.5px] text-cream-dim">
              a déclaré une séance
            </Text>
          </View>
          <View className="items-end">
            <Text className="font-body-bold text-[12.5px] text-amber">{remainingLabel}</Text>
            <Text className="font-body text-[10px] text-cream-dim">pour voter</Text>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-2">
          <MetaPill icon={ActivityIcon} label={session.activity_type} />
          <MetaPill icon={Clock} label={formatDuration(session.duration_min)} />
          <MetaPill icon={CalendarDays} label={relativeDay(session.performed_at, now)} />
        </View>

        {session.comment ? (
          <Text className="font-body text-[13px] leading-[1.45] text-cream" numberOfLines={4}>
            {session.comment}
          </Text>
        ) : null}

        <Tally yes={yes} no={no} threshold={threshold} />
      </View>

      {photo ? <FullscreenImage uri={photo} visible={zoom} onClose={() => setZoom(false)} /> : null}
    </View>
  );
}

/* ---------- Carte d'excuse ---------- */

function ExcuseVoteCard({ item, threshold }: { item: VotableExcuse; threshold: number }) {
  const { excuse, yes, no } = item;
  const [zoom, setZoom] = useState(false);
  const typeInfo = EXCUSE_TYPES.find((t) => t.value === excuse.excuse_type) ?? EXCUSE_TYPES[0];
  const { data: justUrl } = useJustificationSignedUrl(excuse.justification_url);
  // Le type est déduit de l'extension du chemin stocké (`…/xxx.pdf` vs image).
  const justKind = kindFromMime(null, excuse.justification_url ?? "");
  const name = excuse.author.first_name || excuse.author.username || "Membre";

  return (
    <View
      className="overflow-hidden rounded-[24px] border bg-surface"
      style={{ borderColor: colors.line2 }}
    >
      {/* Bandeau : justificatif si présent (image ou PDF), sinon dégradé + icône */}
      <View style={{ height: justUrl ? 196 : 120 }}>
        {justUrl && justKind === "image" ? (
          <Pressable onPress={() => setZoom(true)} className="h-full w-full active:opacity-90">
            <Image source={{ uri: justUrl }} style={{ width: "100%", height: "100%" }} />
          </Pressable>
        ) : justUrl ? (
          <Pressable
            onPress={() => setZoom(true)}
            className="h-full w-full items-center justify-center gap-2 active:opacity-90"
            style={{ backgroundColor: colors.surface2 }}
          >
            <FileText size={38} color={colors.coral} strokeWidth={1.8} />
            <Text className="font-body-semibold text-[12px] text-cream">
              Justificatif PDF · appuie pour l'ouvrir
            </Text>
          </Pressable>
        ) : (
          <LinearGradient
            colors={["rgba(255,178,62,0.28)", "rgba(255,178,62,0.04)"]}
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <HeartPulse size={34} color={colors.amber} strokeWidth={2} />
          </LinearGradient>
        )}

        <View
          className="absolute right-3 top-3 flex-row items-center gap-1.5 rounded-full px-2.5 py-1.5"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          {justUrl ? <FileText size={12} color={colors.cream} /> : null}
          <Text className="font-body-semibold text-[11px] text-cream">Excuse</Text>
        </View>
      </View>

      {/* Infos */}
      <View className="gap-3 p-4">
        <View className="flex-row items-center gap-3">
          <Avatar
            uri={excuse.author.avatar_url}
            color={excuse.author.avatar_color}
            icon={excuse.author.avatar_icon}
            seed={excuse.author.id}
            name={`${excuse.author.first_name ?? ""} ${excuse.author.last_name ?? ""}`.trim()}
            size={42}
          />
          <View className="flex-1">
            <Text className="font-display text-[16px] tracking-tight text-cream">{name}</Text>
            <Text className="mt-0.5 font-body text-[11.5px] text-cream-dim">demande une excuse</Text>
          </View>
        </View>

        <View
          className="flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1"
          style={{ backgroundColor: typeInfo.tone === "ok" ? colors.mintSoft : colors.amberSoft }}
        >
          <Text
            className="font-body-bold text-[11px]"
            style={{ color: typeInfo.tone === "ok" ? colors.mint : colors.amber }}
          >
            {typeInfo.name} · {typeInfo.effect}
          </Text>
        </View>

        <Text className="font-body text-[13px] leading-[1.45] text-cream" numberOfLines={5}>
          {excuse.reason}
        </Text>

        <Tally yes={yes} no={no} threshold={threshold} />
      </View>

      {justUrl ? (
        <JustificationViewer
          visible={zoom}
          onClose={() => setZoom(false)}
          uri={justUrl}
          kind={justKind}
          name={`Justificatif de ${name}`}
        />
      ) : null}
    </View>
  );
}

/* ---------- Sous-composants partagés ---------- */

function Tally({ yes, no, threshold }: { yes: number; no: number; threshold: number }) {
  return (
    <View
      className="mt-1 flex-row items-center gap-3.5 border-t pt-3.5"
      style={{ borderTopColor: colors.line }}
    >
      <View className="flex-row items-center gap-1.5">
        <Check size={16} color={colors.mint} strokeWidth={2.6} />
        <Text className="font-body-bold text-[13px] text-mint">{yes} oui</Text>
      </View>
      <View className="flex-row items-center gap-1.5">
        <X size={16} color={colors.red} strokeWidth={2.6} />
        <Text className="font-body-bold text-[13px] text-red">{no} non</Text>
      </View>
      <Text className="ml-auto font-body text-[10.5px] text-cream-dim">
        majorité à {threshold} voix
      </Text>
    </View>
  );
}

function FullscreenImage({
  uri,
  visible,
  onClose,
}: {
  uri: string;
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        className="flex-1 items-center justify-center px-4"
        style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
      >
        <Image source={{ uri }} style={{ width: "100%", height: "82%" }} resizeMode="contain" />
        <Pressable
          onPress={onClose}
          hitSlop={10}
          className="absolute right-5 top-12 h-11 w-11 items-center justify-center rounded-full active:opacity-80"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
        >
          <X size={22} color={colors.cream} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ---------- Modale d'explication du refus ---------- */

function RefuseModal({
  visible,
  name,
  isExcuse,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  name: string;
  isExcuse: boolean;
  onCancel: () => void;
  onConfirm: (comment: string | null) => void;
}) {
  const [text, setText] = useState("");

  // Repart à vide à chaque ouverture.
  useEffect(() => {
    if (visible) setText("");
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
        <Pressable className="flex-1" onPress={onCancel} />
        <View
          className="rounded-t-[28px] border-x border-t bg-surface px-5 pb-8 pt-5"
          style={{ borderColor: colors.line2 }}
        >
          <View
            className="mb-4 h-1 w-10 self-center rounded-full"
            style={{ backgroundColor: colors.line2 }}
          />
          <Text className="font-display text-[19px] tracking-tight text-cream">
            {isExcuse ? "Refuser cette excuse ?" : "Refuser cette séance ?"}
          </Text>
          <Text className="mt-1.5 font-body text-[13px] leading-[1.5] text-cream-dim">
            Explique à {name || "ce membre"} pourquoi tu refuses. Ce message lui sera transmis.
          </Text>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Ex : la preuve ne correspond pas…"
            placeholderTextColor={colors.creamDim}
            multiline
            className="mt-4 min-h-[92px] rounded-2xl border bg-surface-2 px-4 py-3 font-body text-[14px] text-cream"
            style={{ borderColor: colors.line, textAlignVertical: "top" }}
          />

          <View className="mt-5 gap-2.5">
            <Pressable
              onPress={() => onConfirm(text.trim() || null)}
              className="items-center rounded-2xl py-4 active:opacity-90"
              style={{ backgroundColor: colors.red }}
            >
              <Text className="font-body-bold text-[15px]" style={{ color: colors.cream }}>
                {isExcuse ? "Refuser l'excuse" : "Refuser la séance"}
              </Text>
            </Pressable>
            <Pressable
              onPress={onCancel}
              className="items-center rounded-2xl border border-line-2 bg-surface py-4 active:opacity-80"
            >
              <Text className="font-body-semibold text-[15px] text-cream">Annuler</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function StravaStat({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1">
      <Text className="font-display text-[18px] text-cream">{value}</Text>
      <Text className="mt-0.5 font-body text-[10px]" style={{ color: "rgba(251,238,221,0.7)" }}>
        {label}
      </Text>
    </View>
  );
}

function MetaPill({
  icon: Icon,
  label,
}: {
  icon: typeof Activity;
  label: string;
}) {
  return (
    <View
      className="flex-row items-center gap-1.5 rounded-[10px] border px-2.5 py-1.5"
      style={{ backgroundColor: "rgba(255,238,221,0.05)", borderColor: colors.line }}
    >
      <Icon size={14} color={colors.coral} />
      <Text className="font-body-semibold text-[12px] text-cream">{label}</Text>
    </View>
  );
}

/* ---------- État « à jour » ---------- */

function DoneState({ onBack }: { onBack: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-8">
      <LinearGradient
        colors={gradients.green.colors}
        start={gradients.green.start}
        end={gradients.green.end}
        style={{
          height: 88,
          width: 88,
          borderRadius: 44,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Check size={42} color={colors.onMint} strokeWidth={3} />
      </LinearGradient>
      <Text className="font-display text-[22px] tracking-tight text-cream">Tu es à jour</Text>
      <Text className="text-center font-body text-[13px] leading-[1.5] text-cream-dim">
        Toutes les séances et excuses en attente ont été votées. Reviens plus tard pour les
        prochaines.
      </Text>
      <Pressable
        onPress={onBack}
        className="mt-1 rounded-full border border-line-2 bg-surface px-6 py-3 active:opacity-80"
      >
        <Text className="font-body-semibold text-[14px] text-cream">Retour au groupe</Text>
      </Pressable>
    </View>
  );
}
