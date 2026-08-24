import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  Share2,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react-native";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { AppBackground } from "@/components/ui/AppBackground";
import { Avatar } from "@/components/ui/Avatar";
import { Confetti } from "@/components/ui/Confetti";
import { GradientButton } from "@/components/ui/GradientButton";
import { GradientNumber } from "@/components/ui/GradientNumber";
import { PopIn } from "@/components/ui/PopIn";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { colors, gradients } from "@/constants/colors";
import {
  challengeWeekCount,
  contributionBreakdown,
  contributionSubLabel,
  reportName,
  totalValidated,
  type Contribution,
  type ReportMember,
  type ReportPenalty,
  type ReportSession,
} from "@/features/challenge-end/report";
import { usePotHistory } from "@/features/cagnotte/queries";
import { useGroup, useGroupMembers, usePot, usePotStatus } from "@/features/groups/queries";
import { useGroupSessions } from "@/features/sessions/queries";
import { useCurrentUser } from "@/lib/auth-store";

/**
 * Clôture du défi — cagnotte débloquée (maquette `sport-motiv-cloture.html`).
 *
 * Écran de célébration après le déblocage : pluie de confettis, trophée qui « pop », grand
 * montant en dégradé qui monte, récap du défi et « qui a rempli la cagnotte ». On arrive ici
 * depuis le bouton « Débloquer » du bilan (`fin-defi`). Données 100 % client (mêmes sources
 * que le bilan). Animations très présentes (demande produit), toutes coupées si
 * `prefers-reduced-motion`.
 */
export default function ClotureScreen() {
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

  const goBack = () =>
    router.canGoBack() ? router.back() : router.navigate("/groups" as never);

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
  const seances = totalValidated(reportSessions);
  const contributions = contributionBreakdown(reportMembers, reportPenalties);
  const cagnotteTotal =
    potStatus?.total ?? potAmount ?? reportPenalties.reduce((s, p) => s + p.amount, 0);

  const onShare = async () => {
    await Clipboard.setStringAsync(
      `« ${group.name} » — défi bouclé en ${weeks} semaines, ${seances} séances, cagnotte de ${cagnotteTotal} €. Bravo à tous !`
    );
    toast("Récap copié dans le presse-papier.", "success");
  };

  const onOrganize = () =>
    router.push({ pathname: "/group/[id]/cagnotte", params: { id: id! } } as never);

  return (
    <View className="flex-1">
      <AppBackground />
      <ScreenContainer transparent padded={false} edges={["top"]}>
        {/* Header : back + contexte centré */}
        <View className="flex-row items-center px-[18px] pb-2 pt-1">
          <Pressable
            onPress={goBack}
            hitSlop={10}
            accessibilityLabel="Retour"
            className="h-10 w-10 items-center justify-center rounded-chip border border-line bg-surface active:opacity-70"
          >
            <ChevronLeft size={22} color={colors.cream} strokeWidth={2.2} />
          </Pressable>
          <Text numberOfLines={1} className="flex-1 text-center font-body-semibold text-[12.5px] text-cream-dim">
            {group.name}
          </Text>
          <View className="w-10" />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 28, gap: 18 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero — le conteneur reste pleine largeur (pas d'`items-center` ici) pour que le
              grand nombre en `width:100%` ne se réduise pas à zéro ; chaque bloc se centre lui-même. */}
          <View className="pt-2">
            <View className="items-center">
              <PopIn delay={40}>
                <LinearGradient
                  colors={gradients.brand.colors}
                  locations={gradients.brand.locations}
                  start={gradients.brand.start}
                  end={gradients.brand.end}
                  style={{ width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center" }}
                >
                  <Trophy size={42} color={colors.onCoral} strokeWidth={2.1} />
                </LinearGradient>
              </PopIn>
            </View>

            <Reveal delay={300} className="items-center">
              <Text className="mt-4 font-body-bold text-[11px] uppercase tracking-eyebrow text-coral">
                Défi terminé
              </Text>
            </Reveal>
            <Reveal delay={360} className="items-center">
              <Text className="mt-2 font-display text-[27px] tracking-tight text-cream">
                Bravo, c&apos;est bouclé&nbsp;!
              </Text>
            </Reveal>
            <Reveal delay={420} className="items-center">
              <Text className="mt-1.5 max-w-[260px] text-center font-body text-[13px] text-cream-dim">
                {weeks} semaines de défi, et la cagnotte commune est débloquée.
              </Text>
            </Reveal>

            {/* Montant débloqué — grand nombre en dégradé qui monte. */}
            <Reveal delay={500} className="mt-5 items-center">
              <GradientNumber to={cagnotteTotal} suffix=" €" fontSize={62} duration={1400} />
              <Text className="mt-2 font-body-semibold text-[12px] text-cream-dim">cagnotte débloquée</Text>
            </Reveal>
          </View>

          {/* Récap trio */}
          <Reveal delay={600}>
            <View className="flex-row gap-2.5">
              <TrioStat icon={CalendarDays} tone="amber" value={weeks} caption="semaines" />
              <TrioStat icon={Activity} tone="coral" value={seances} caption="séances" />
              <TrioStat icon={Users} tone="mint" value={members.length} caption="membres" />
            </View>
          </Reveal>

          {/* Qui a rempli la cagnotte */}
          <Reveal delay={680}>
            <View className="mb-1 flex-row items-baseline justify-between px-0.5">
              <Text className="font-display text-[16px] tracking-tight text-cream">
                Qui a rempli la cagnotte
              </Text>
              <Text className="font-body text-[12px] text-cream-dim">pénalités</Text>
            </View>
            {contributions.length > 0 ? (
              <View
                className="rounded-[18px] border px-3.5"
                style={{ backgroundColor: colors.surface, borderColor: colors.line }}
              >
                {contributions.map((c, i) => (
                  <ContribRow
                    key={c.member.userId}
                    contrib={c}
                    meId={me?.id}
                    last={i === contributions.length - 1}
                  />
                ))}
              </View>
            ) : (
              <View
                className="items-center rounded-[18px] border px-4 py-6"
                style={{ backgroundColor: colors.surface, borderColor: colors.line }}
              >
                <Text className="text-center font-body text-[13px] text-cream-dim">
                  Personne n&apos;a écopé de pénalité. Chapeau&nbsp;!
                </Text>
              </View>
            )}
          </Reveal>
        </ScrollView>

        {/* Footer */}
        <View
          style={{
            paddingHorizontal: 18,
            paddingTop: 10,
            paddingBottom: 14,
            backgroundColor: colors.ink,
            borderTopColor: colors.line,
            borderTopWidth: 1,
          }}
        >
          <GradientButton iconRight={ArrowRight} onPress={onOrganize}>
            Organiser la sortie
          </GradientButton>
          <Pressable
            onPress={onShare}
            className="mt-2.5 h-9 flex-row items-center justify-center gap-2 active:opacity-70"
          >
            <Share2 size={15} color={colors.creamDim} />
            <Text className="font-body-semibold text-[12.5px] text-cream-dim">Partager le récap</Text>
          </Pressable>
        </View>
      </ScreenContainer>

      {/* Feu d'artifice, au premier plan (pointerEvents none → n'intercepte aucun tap). */}
      <Confetti />
    </View>
  );
}

/* ------------------------------------------------------------------ trio */

const TONE: Record<string, { soft: string; ink: string }> = {
  amber: { soft: colors.amberSoft, ink: colors.amber },
  coral: { soft: colors.coralSoft, ink: colors.coral },
  mint: { soft: colors.mintSoft, ink: colors.mint },
};

function TrioStat({
  icon: Icon,
  tone,
  value,
  caption,
}: {
  icon: LucideIcon;
  tone: "amber" | "coral" | "mint";
  value: number;
  caption: string;
}) {
  const t = TONE[tone];
  return (
    <View
      className="flex-1 items-center rounded-[16px] border px-2.5 py-3.5"
      style={{ backgroundColor: colors.surface, borderColor: colors.line }}
    >
      <View className="h-[30px] w-[30px] items-center justify-center rounded-[10px]" style={{ backgroundColor: t.soft }}>
        <Icon size={17} color={t.ink} strokeWidth={2.2} />
      </View>
      <Text className="mt-2 font-display text-[20px] tracking-tight text-cream">{value}</Text>
      <Text className="mt-1 font-body text-[10.5px] text-cream-dim">{caption}</Text>
    </View>
  );
}

/* ------------------------------------------------------------- contributions */

function ContribRow({ contrib, meId, last }: { contrib: Contribution; meId: string | undefined; last: boolean }) {
  return (
    <View
      className="flex-row items-center gap-3 py-3"
      style={last ? undefined : { borderBottomWidth: 1, borderBottomColor: colors.line }}
    >
      <Avatar
        uri={contrib.member.avatarUrl}
        color={contrib.member.avatarColor}
        icon={contrib.member.avatarIcon}
        seed={contrib.member.userId}
        name={`${contrib.member.firstName ?? ""} ${contrib.member.lastName ?? ""}`.trim()}
        size={38}
      />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="font-body-semibold text-[14px] text-cream">
          {reportName(contrib.member, meId)}
        </Text>
        <Text className="mt-0.5 font-body text-[11px] text-cream-dim">
          {contributionSubLabel(contrib.missed, contrib.blames)}
        </Text>
      </View>
      <Text className="font-display text-[16px] text-amber">{contrib.total} €</Text>
    </View>
  );
}
