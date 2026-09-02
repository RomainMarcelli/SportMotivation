import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ChevronLeft,
  Coins,
  Compass,
  Crown,
  Dumbbell,
  Flame,
  Lock,
  RotateCcw,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import * as Clipboard from "expo-clipboard";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { AppBackground } from "@/components/ui/AppBackground";
import { Avatar } from "@/components/ui/Avatar";
import { CountUp } from "@/components/ui/CountUp";
import { GradientButton } from "@/components/ui/GradientButton";
import { PopIn } from "@/components/ui/PopIn";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { colors, gradients } from "@/constants/colors";
import { fontFamily } from "@/constants/fonts";
import {
  challengeRangeLabel,
  challengeWeekCount,
  finalRanking,
  myBilan,
  reportName,
  type RankedMember,
  type ReportMember,
  type ReportPenalty,
  type ReportSession,
} from "@/features/challenge-end/report";
import { mapUnlockError, useUnlockPot } from "@/features/challenge-end/mutations";
import { usePotHistory } from "@/features/cagnotte/queries";
import { useGroup, useGroupMembers, usePot, usePotStatus } from "@/features/groups/queries";
import { useGroupSessions } from "@/features/sessions/queries";
import { useAppReducedMotion } from "@/hooks/useAppReducedMotion";
import { useCurrentUser } from "@/lib/auth-store";

/**
 * Bilan de fin de défi (maquette `sport-motiv-fin-defi.html`).
 *
 * Écran de synthèse quand le défi est terminé : podium + classement complet (assiduité et
 * euros versés), « ton bilan » chiffré, et la cagnotte finale à débloquer. Tout le bilan est
 * calculé côté client (`features/challenge-end/report`) à partir de données déjà chargées :
 * aucune RPC de reporting. Seul le déblocage passe par le serveur (`unlock_pot`, SQL 049).
 *
 * Animations (demande produit) : entrée « pop » du trophée, révélations échelonnées section
 * par section, podium dont les marches montent, et compteurs animés. Tout respecte
 * `prefers-reduced-motion`.
 */
export default function FinDefiScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const me = useCurrentUser();
  const { toast } = useFeedback();

  const { data: group } = useGroup(id);
  const { data: members } = useGroupMembers(id);
  const { data: sessions } = useGroupSessions(id);
  const { data: history } = usePotHistory(id);
  const { data: potStatus } = usePotStatus(id);
  const { data: potAmount } = usePot(id);
  const unlock = useUnlockPot(id!);

  const goBack = () =>
    router.canGoBack() ? router.back() : router.navigate("/groups" as never);

  // Tant que l'essentiel n'est pas chargé, on affiche un loader (le bilan doit être complet).
  if (!group || !members || !sessions) {
    return (
      <View className="flex-1">
        <AppBackground />
        <ScreenContainer transparent>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.coral} />
          </View>
        </ScreenContainer>
      </View>
    );
  }

  // Adaptation des données chargées → types RN-free du module de bilan.
  const reportMembers: ReportMember[] = members.map((m) => ({
    userId: m.user.id,
    firstName: m.user.first_name,
    lastName: m.user.last_name,
    username: m.user.username,
    avatarUrl: m.user.avatar_url,
    avatarColor: m.user.avatar_color,
    avatarIcon: m.user.avatar_icon,
    weeklyTarget: m.weeklyTarget,
    role: m.role,
  }));
  const reportSessions: ReportSession[] = sessions.map((s) => ({
    userId: s.author.id,
    status: s.status,
    weekStart: s.week_start,
  }));
  const reportPenalties: ReportPenalty[] = (history ?? []).map((h) => ({
    userId: h.userId,
    penaltyType: h.penaltyType,
    amount: h.amount,
  }));

  const weeks = challengeWeekCount(group.challenge_start, group.challenge_end);
  const ranking = finalRanking(reportMembers, reportSessions, reportPenalties, weeks);
  const myReportMember = reportMembers.find((m) => m.userId === me?.id);
  const bilan = myReportMember
    ? myBilan(myReportMember, reportSessions, reportPenalties, group.challenge_start, group.challenge_end, weeks)
    : null;

  // Montant de la cagnotte : total de `pots` en priorité, repli sur la somme des pénalités.
  const cagnotteTotal =
    potStatus?.total ?? potAmount ?? reportPenalties.reduce((s, p) => s + p.amount, 0);
  const isUnlocked = !!potStatus?.unlockedAt;

  // Déblocage réservé à l'admin/trésorier (le serveur revérifie de toute façon).
  const myRole = members.find((m) => m.user.id === me?.id)?.role;
  const canUnlock = myRole === "admin" || myRole === "treasurer";

  const goCloture = () =>
    router.push({ pathname: "/group/[id]/cloture", params: { id: id! } } as never);

  const onUnlock = () => {
    if (isUnlocked) return goCloture();
    unlock.mutate(undefined, {
      onSuccess: () => goCloture(),
      onError: (e) => toast(mapUnlockError(e.message), "error"),
    });
  };

  const onShareRanking = async () => {
    const lines = ranking.map(
      (r) => `${r.rank}. ${reportName(r.member, me?.id)} — ${r.rate}% (${r.validated} séances)`
    );
    await Clipboard.setStringAsync(`Classement final · ${group.name}\n${lines.join("\n")}`);
    toast("Classement copié dans le presse-papier.", "success");
  };

  const podium = orderPodium(ranking.slice(0, 3));

  return (
    <View className="flex-1">
      <AppBackground />
      <ScreenContainer transparent padded={false} edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center gap-3 px-[18px] pb-2 pt-1">
          <Pressable
            onPress={goBack}
            hitSlop={10}
            accessibilityLabel="Retour"
            className="h-10 w-10 items-center justify-center rounded-chip border border-line bg-surface active:opacity-70"
          >
            <ChevronLeft size={22} color={colors.cream} strokeWidth={2.2} />
          </Pressable>
          <View className="flex-1">
            <Text className="font-display text-[18px] tracking-tight text-cream">Défi terminé</Text>
            <Text numberOfLines={1} className="mt-0.5 font-body text-[11.5px] text-cream-dim">
              {group.name}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24, gap: 22 }}
          showsVerticalScrollIndicator={false}
        >
          {/* En-tête : trophée + titre + plage */}
          <View className="items-center pt-1">
            <PopIn delay={60}>
              <LinearGradient
                colors={gradients.amber.colors}
                start={gradients.amber.start}
                end={gradients.amber.end}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trophy size={30} color={colors.onAmber} strokeWidth={2} />
              </LinearGradient>
            </PopIn>
            <Reveal delay={140} className="items-center">
              <Text className="mt-3.5 font-display text-[26px] tracking-tight text-cream">
                C&apos;est dans la boîte&nbsp;!
              </Text>
              <Text className="mt-2 font-body text-[13px] text-cream-dim">
                {challengeRangeLabel(group.challenge_start, group.challenge_end)}
              </Text>
            </Reveal>
          </View>

          {/* Podium */}
          <Reveal delay={220}>
            <SectionLabel>Classement final</SectionLabel>
            <View className="mt-3 flex-row items-end justify-center gap-2.5">
              {podium.map((entry) =>
                entry ? (
                  <PodiumColumn key={entry.member.userId} entry={entry} meId={me?.id} />
                ) : null
              )}
            </View>
          </Reveal>

          {/* Classement complet */}
          <Reveal delay={300}>
            <SectionLabel>Détail &amp; pénalités</SectionLabel>
            <View
              className="mt-3 rounded-[18px] border px-3.5"
              style={{ backgroundColor: colors.surface, borderColor: colors.line2 }}
            >
              {ranking.map((r, i) => (
                <RankRow
                  key={r.member.userId}
                  entry={r}
                  meId={me?.id}
                  last={i === ranking.length - 1}
                />
              ))}
            </View>
          </Reveal>

          {/* Ton bilan */}
          {bilan ? (
            <Reveal delay={360}>
              <SectionLabel>Ton bilan</SectionLabel>
              <View className="mt-3 gap-2.5">
                <View className="flex-row gap-2.5">
                  <StatTile icon={Dumbbell} to={bilan.validated} caption="séances réussies" />
                  <StatTile icon={Flame} to={bilan.bestStreak} suffix=" sem" caption="meilleure série" />
                </View>
                <View className="flex-row gap-2.5">
                  <StatTile icon={Target} to={bilan.rate} suffix="%" caption="taux de réussite" />
                  <StatTile icon={Coins} to={bilan.paid} suffix=" €" caption="pénalités versées" />
                </View>
              </View>
            </Reveal>
          ) : null}

          {/* Cagnotte finale */}
          <Reveal delay={420}>
            <SectionLabel>La cagnotte</SectionLabel>
            <View
              className="mt-3 overflow-hidden rounded-[18px] border p-4"
              style={{ backgroundColor: colors.surface, borderColor: colors.line2 }}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="font-body-bold text-[12px] uppercase tracking-label text-cream-dim">
                    Cagnotte finale
                  </Text>
                  <CountUp
                    to={cagnotteTotal}
                    suffix=" €"
                    duration={1100}
                    className="mt-1.5 font-display text-[30px] tracking-tight"
                    style={{ color: colors.amber }}
                  />
                </View>
                <Text className="ml-3 max-w-[130px] text-right font-body text-[12px] text-cream-dim">
                  {isUnlocked ? "Débloquée pour la sortie du groupe" : "À débloquer pour la sortie du groupe"}
                </Text>
              </View>

              {canUnlock || isUnlocked ? (
                <AmberButton
                  icon={Lock}
                  label={isUnlocked ? "Voir la célébration" : "Débloquer la cagnotte"}
                  loading={unlock.isPending}
                  onPress={onUnlock}
                />
              ) : (
                <View
                  className="mt-4 h-[50px] flex-row items-center justify-center gap-2 rounded-[14px] border"
                  style={{ borderColor: colors.line2, backgroundColor: colors.surface2 }}
                >
                  <Lock size={16} color={colors.creamDim} />
                  <Text className="font-body-semibold text-[13px] text-cream-dim">
                    En attente du déblocage par l&apos;admin
                  </Text>
                </View>
              )}
            </View>
          </Reveal>

          {/* Découvrir des activités (Phase 7) — prolonger l'aventure hors ligne. */}
          <Reveal delay={450}>
            <Pressable
              onPress={() =>
                router.push({ pathname: "/group/[id]/activites", params: { id: id! } } as never)
              }
              className="flex-row items-center gap-3 overflow-hidden rounded-[18px] border p-4 active:opacity-90"
              style={{ backgroundColor: colors.surface, borderColor: colors.line2 }}
            >
              <View
                className="h-11 w-11 items-center justify-center rounded-[13px]"
                style={{ backgroundColor: colors.coralSoft }}
              >
                <Compass size={22} color={colors.coral} strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="font-display text-[15px] tracking-tight text-cream">
                  Découvrir des activités
                </Text>
                <Text className="mt-0.5 font-body text-[12px] text-cream-dim">
                  Des idées de sorties pour fêter la fin du défi ensemble.
                </Text>
              </View>
              <ChevronLeft size={20} color={colors.creamDim} style={{ transform: [{ rotate: "180deg" }] }} />
            </Pressable>
          </Reveal>

          {/* Relancer / partager */}
          <Reveal delay={520} className="mt-1 gap-3">
            <GradientButton icon={RotateCcw} onPress={() => router.push("/group/create" as never)}>
              Relancer un défi
            </GradientButton>
            <Pressable onPress={onShareRanking} className="active:opacity-70">
              <Text className="text-center font-body text-[12.5px] text-cream-dim">
                ou <Text className="font-body-bold text-cream">partager le classement</Text>
              </Text>
            </Pressable>
          </Reveal>
        </ScrollView>
      </ScreenContainer>
    </View>
  );
}

/* ------------------------------------------------------------------ podium */

/** Réordonne le top 3 pour l'affichage : [2ᵉ (gauche), 1ᵉ (centre), 3ᵉ (droite)]. */
function orderPodium(top: RankedMember[]): (RankedMember | null)[] {
  return [top[1] ?? null, top[0] ?? null, top[2] ?? null];
}

const PEDESTAL: Record<number, { height: number; color: string; bg: string }> = {
  1: { height: 80, color: colors.amber, bg: "rgba(255,178,62,0.28)" },
  2: { height: 60, color: colors.cream, bg: "rgba(255,238,221,0.14)" },
  3: { height: 46, color: colors.coral, bg: "rgba(255,106,69,0.26)" },
};

function PodiumColumn({ entry, meId }: { entry: RankedMember; meId: string | undefined }) {
  const first = entry.rank === 1;
  const ped = PEDESTAL[entry.rank] ?? PEDESTAL[3];
  const avatarSize = first ? 60 : 50;

  return (
    <View className="max-w-[106px] flex-1 items-center">
      <View style={{ position: "relative" }}>
        {first ? (
          <View style={{ position: "absolute", top: -16, left: 0, right: 0, alignItems: "center", zIndex: 2 }}>
            <Crown size={22} color={colors.amber} fill={colors.amber} />
          </View>
        ) : null}
        {/* Anneau de mise en valeur pour le 1ᵉ (rappel du halo de la maquette). */}
        <View
          style={{
            borderRadius: avatarSize / 2 + 3,
            borderWidth: first ? 3 : 0,
            borderColor: "rgba(255,178,62,0.5)",
          }}
        >
          <Avatar
            uri={entry.member.avatarUrl}
            color={entry.member.avatarColor}
            icon={entry.member.avatarIcon}
            seed={entry.member.userId}
            name={`${entry.member.firstName ?? ""} ${entry.member.lastName ?? ""}`.trim()}
            size={avatarSize}
          />
        </View>
      </View>
      <Text numberOfLines={1} className="mt-2 font-display text-[13px] text-cream">
        {reportName(entry.member, meId)}
      </Text>
      <Text className="mt-0.5 font-body text-[11.5px] text-cream-dim">{entry.rate}%</Text>
      <Pedestal rank={entry.rank} height={ped.height} color={ped.color} bg={ped.bg} />
    </View>
  );
}

/** Marche du podium — monte de 0 à sa hauteur (échelonnée par rang), façon « ça se remplit ». */
function Pedestal({ rank, height, color, bg }: { rank: number; height: number; color: string; bg: string }) {
  const reduceMotion = useAppReducedMotion();
  const grow = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      grow.value = 1;
      return;
    }
    // Le podium se dresse après l'apparition du bloc : la 1ᵉ marche en dernier (effet « champion »).
    const delay = 260 + (3 - rank) * 90;
    grow.value = withDelay(delay, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
  }, [rank, reduceMotion, grow]);

  const style = useAnimatedStyle(() => ({ height: grow.value * height }));

  return (
    <Animated.View
      style={[
        {
          width: "100%",
          marginTop: 11,
          borderTopLeftRadius: 13,
          borderTopRightRadius: 13,
          borderWidth: 1,
          borderColor: bg,
          backgroundColor: bg,
          alignItems: "center",
          paddingTop: 8,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: fontFamily.displayExtrabold, fontSize: 21, color }}>{rank}</Text>
    </Animated.View>
  );
}

/* ------------------------------------------------------------ classement liste */

const RANK_COLOR: Record<number, string> = {
  1: colors.amber,
  2: colors.cream,
  3: colors.coral,
};

function RankRow({ entry, meId, last }: { entry: RankedMember; meId: string | undefined; last: boolean }) {
  return (
    <View
      className="flex-row items-center gap-3 py-3"
      style={last ? undefined : { borderBottomWidth: 1, borderBottomColor: colors.line }}
    >
      <Text
        style={{ width: 20, textAlign: "center", fontFamily: fontFamily.displayExtrabold, fontSize: 15, color: RANK_COLOR[entry.rank] ?? colors.creamDim }}
      >
        {entry.rank}
      </Text>
      <Avatar
        uri={entry.member.avatarUrl}
        color={entry.member.avatarColor}
        icon={entry.member.avatarIcon}
        seed={entry.member.userId}
        name={`${entry.member.firstName ?? ""} ${entry.member.lastName ?? ""}`.trim()}
        size={38}
      />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="font-display text-[14px] text-cream">
          {reportName(entry.member, meId)}
        </Text>
        <Text className="mt-0.5 font-body text-[11.5px] text-cream-dim">
          {entry.validated} séance{entry.validated > 1 ? "s" : ""} réussie{entry.validated > 1 ? "s" : ""}
        </Text>
      </View>
      <View className="items-end">
        <Text className="font-display text-[15px] text-cream">{entry.rate}%</Text>
        <Text className="mt-0.5 font-body text-[11px] text-cream-dim">{entry.contributed} € versés</Text>
      </View>
    </View>
  );
}

/* --------------------------------------------------------------- ton bilan */

function StatTile({
  icon: Icon,
  to,
  suffix,
  caption,
}: {
  icon: LucideIcon;
  to: number;
  suffix?: string;
  caption: string;
}) {
  return (
    <View
      className="flex-1 rounded-[16px] border p-3.5"
      style={{ backgroundColor: colors.surface, borderColor: colors.line }}
    >
      <View className="h-[30px] w-[30px] items-center justify-center rounded-[9px]" style={{ backgroundColor: colors.surface2 }}>
        <Icon size={16} color={colors.amber} strokeWidth={2} />
      </View>
      <CountUp
        to={to}
        suffix={suffix}
        duration={1100}
        className="mt-2.5 font-display text-[23px] tracking-tight text-cream"
      />
      <Text className="mt-1 font-body text-[11.5px] text-cream-dim">{caption}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ divers */

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="px-0.5 font-body-bold text-[12px] uppercase tracking-label text-cream-dim">
      {children}
    </Text>
  );
}

/** Bouton dégradé ambre (déblocage) — pastille CTA de la carte cagnotte. */
function AmberButton({
  icon: Icon,
  label,
  loading,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      className="mt-4 h-[50px] flex-row items-center justify-center gap-2.5 overflow-hidden rounded-[14px] active:opacity-90"
      style={{ opacity: loading ? 0.7 : 1 }}
    >
      <LinearGradient
        colors={gradients.amber.colors}
        start={gradients.amber.start}
        end={gradients.amber.end}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {loading ? (
        <ActivityIndicator color={colors.onAmber} />
      ) : (
        <>
          <Icon size={17} color={colors.onAmber} strokeWidth={2.2} />
          <Text style={{ fontFamily: fontFamily.displayExtrabold, color: colors.onAmber }} className="text-[14.5px]">
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
