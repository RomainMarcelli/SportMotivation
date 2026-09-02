import { ArrowRight, Flame, Trophy } from "lucide-react-native";
import { useEffect, useMemo } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from "react-native-svg";

import { Avatar } from "@/components/ui/Avatar";
import { CountUp } from "@/components/ui/CountUp";
import { colors } from "@/constants/colors";
import { challengePhaseLabel, type ChallengePhase } from "@/features/groups/challenge-phase";
import type { GroupMemberWithUser } from "@/features/groups/queries";
import { countdownLabel, type WeekStats } from "@/features/home/home-stats";
import { ringSegments } from "@/features/home/ring";
import { formatDbDate } from "@/lib/date";
import { useAppReducedMotion } from "@/hooks/useAppReducedMotion";

const AnimatedPath = Animated.createAnimatedComponent(Path);

const RING = 122;
const VIEWBOX = 128; // repère de la maquette (cx/cy 64, r 52)

/**
 * Anneau **segmenté** : une part par séance de l'objectif, comme la maquette.
 * Chaque part validée se remplit avec un léger décalage (effet de comptage).
 */
function ProgressRing({ stats, replay }: { stats: WeekStats; replay: number }) {
  const segments = useMemo(
    () => ringSegments(stats.target, stats.done),
    [stats.target, stats.done]
  );

  return (
    <View style={{ width: RING, height: RING, alignItems: "center", justifyContent: "center" }}>
      <Svg
        width={RING}
        height={RING}
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        style={{ position: "absolute" }}
      >
        <Defs>
          <SvgGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.coral} />
            <Stop offset="1" stopColor={colors.amber} />
          </SvgGradient>
        </Defs>

        {/* Aucun objectif fixé → un cercle nu plutôt qu'un anneau vide trompeur. */}
        {segments.length === 0 ? (
          <Circle
            cx={64}
            cy={64}
            r={52}
            stroke="rgba(255,238,221,0.09)"
            strokeWidth={11}
            fill="none"
          />
        ) : null}

        {/* Fond : toutes les parts en gris, toujours présentes → l'anneau ne
            « manque » jamais de matière pendant que les parts pleines se tracent. */}
        {segments.map((seg) => (
          <Path
            key={`track-${seg.index}`}
            d={seg.d}
            fill="none"
            strokeWidth={11}
            strokeLinecap="round"
            stroke="rgba(255,238,221,0.09)"
          />
        ))}
        {segments
          .filter((seg) => seg.filled)
          .map((seg) => (
            <RingSegmentPath
              key={`${replay}-${seg.index}`}
              d={seg.d}
              length={seg.length}
              index={seg.index}
            />
          ))}
      </Svg>
      <Text className="font-display text-[27px] tracking-tighter text-cream">
        {stats.done}
        <Text className="text-[18px] text-cream-dim">/{stats.target}</Text>
      </Text>
      <Text className="mt-0.5 font-body text-[10.5px] text-cream-dim">séances</Text>
    </View>
  );
}

/**
 * Une part **validée** de l'anneau, qui se *trace* d'un bout à l'autre.
 *
 * On anime `strokeDashoffset` de la longueur de l'arc (invisible) vers 0
 * (entièrement tracé) : le trait se remplit comme un stylo qui suit le cercle,
 * bien plus fluide qu'un simple fondu d'opacité — c'est lui qui donnait cet
 * effet de clignotement. Les parts partent en cascade, une après l'autre.
 */
function RingSegmentPath({ d, length, index }: { d: string; length: number; index: number }) {
  const reduceMotion = useAppReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      260 + index * 190,
      withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) })
    );
  }, [index, progress, reduceMotion]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - progress.value),
  }));

  return (
    <AnimatedPath
      d={d}
      fill="none"
      strokeWidth={11}
      strokeLinecap="round"
      stroke="url(#ringGrad)"
      strokeDasharray={length}
      animatedProps={animatedProps}
    />
  );
}

type Props = {
  groupName: string;
  challengeEnd: string;
  daysLeft: number;
  /** Phase du défi (dérivée des dates + statut) : pilote l'état « terminé » du héro. */
  phase: ChallengePhase;
  stats: WeekStats;
  potTotal: number | null;
  members: GroupMemberWithUser[];
  /** Préférences d'accueil : masquer la cagnotte / la pile de membres si voulu. */
  showPot?: boolean;
  showMembers?: boolean;
  /** Change de valeur à chaque arrivée sur l'écran → rejoue les animations. */
  replay: number;
  /** Série (streak) de ce défi — bandeau discret sous l'anneau. Nul = pas de série. */
  streak?: { currentStreak: number; currentWeekCompleted: boolean; remainingSessions: number } | null;
};

/**
 * Bandeau « série » discret (DA existante) : flamme ambre + nombre de semaines, et
 * une ligne d'état (objectif atteint / séances restantes pour la conserver).
 */
function StreakBanner({
  currentStreak,
  currentWeekCompleted,
  remainingSessions,
}: {
  currentStreak: number;
  currentWeekCompleted: boolean;
  remainingSessions: number;
}) {
  return (
    <View
      className="mt-3 flex-row items-center gap-3 rounded-[14px] border px-3.5 py-2.5"
      style={{ backgroundColor: colors.amberSoft, borderColor: "rgba(255,178,62,0.28)" }}
    >
      <Flame size={19} color={colors.amber} strokeWidth={2.2} />
      <View className="flex-1">
        <Text className="font-display text-[14px] tracking-tight text-cream">
          Série de {currentStreak} semaine{currentStreak > 1 ? "s" : ""}
        </Text>
        <Text
          className="mt-0.5 font-body text-[11px]"
          style={{ color: currentWeekCompleted ? colors.mint : colors.creamDim }}
        >
          {currentWeekCompleted
            ? "Objectif de la semaine atteint"
            : `Encore ${remainingSessions} séance${remainingSessions > 1 ? "s" : ""} pour la conserver`}
        </Text>
      </View>
    </View>
  );
}

/**
 * Hero « défi en cours » de l'accueil (maquette `sport-motiv-accueil.html`) :
 * statut + compte à rebours, nom du défi, anneau de progression hebdo, puis
 * cagnotte et pile de membres.
 */
export function ChallengeHero({
  groupName,
  challengeEnd,
  daysLeft,
  phase,
  stats,
  potTotal,
  members,
  showPot = true,
  showMembers = true,
  replay,
  streak,
}: Props) {
  const shown = members.slice(0, 3);
  const extra = members.length - shown.length;

  // Défi terminé → on bascule TOUT le héro en état « terminé » : plus de badge
  // « EN COURS », plus d'anneau ni de « Encore X pour valider » (retour Romain :
  // ces éléments d'un défi actif ne doivent plus s'afficher une fois le défi fini).
  const ended = phase === "ended";
  // Teinte du bandeau de statut selon la phase (le libellé vient de `challenge-phase`).
  const TONE: Record<ChallengePhase, { dot: string; text: string; bg: string }> = {
    upcoming: { dot: colors.amber, text: colors.amber, bg: colors.amberSoft },
    active: { dot: colors.coral, text: colors.coral, bg: colors.coralSoft },
    ended: { dot: colors.mint, text: colors.mint, bg: colors.mintSoft },
    cancelled: { dot: colors.creamDim, text: colors.creamDim, bg: "rgba(255,238,221,0.07)" },
  };
  const tone = TONE[phase];

  // Justification du bloc du bas selon ce qui reste affiché (cagnotte à gauche,
  // membres à droite) : si un seul est visible, on l'aligne du bon côté.
  const bottomJustify =
    showPot && showMembers ? "space-between" : showPot ? "flex-start" : "flex-end";

  return (
    <View
      className="overflow-hidden rounded-hero border p-4"
      style={{ backgroundColor: colors.surface, borderColor: colors.line2 }}
    >
      <View className="flex-row items-start justify-between">
        <View
          className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1.5"
          style={{ backgroundColor: tone.bg }}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tone.dot }} />
          <Text
            className="font-body-bold text-[10.5px] tracking-eyebrow"
            style={{ color: tone.text }}
          >
            {challengePhaseLabel(phase).toUpperCase()}
          </Text>
        </View>
        <View className="items-end">
          <Text
            className="font-display text-[20px] tracking-tighter"
            style={{ color: colors.amber }}
          >
            {ended ? "Terminé" : countdownLabel(daysLeft)}
          </Text>
          <Text className="mt-0.5 font-body text-[10.5px] text-cream-dim">
            fin le {formatDbDate(challengeEnd)}
          </Text>
        </View>
      </View>

      <Text
        numberOfLines={1}
        className="mt-3.5 font-display text-[24px] tracking-tighter text-cream"
      >
        {groupName}
      </Text>

      {ended ? (
        /* Défi terminé : bilan à la place de l'anneau de progression hebdo. */
        <View
          className="mt-3.5 flex-row items-center gap-3 rounded-[16px] border p-3.5"
          style={{ backgroundColor: colors.amberSoft, borderColor: "rgba(255,178,62,0.35)" }}
        >
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-surface">
            <Trophy size={20} color={colors.amber} strokeWidth={2.1} />
          </View>
          <View className="flex-1">
            <Text className="font-display text-[15px] tracking-tight text-cream">
              Défi terminé
            </Text>
            <Text className="mt-0.5 font-body text-[11.5px] text-cream-dim">
              Classement final et cagnotte à débloquer
            </Text>
          </View>
        </View>
      ) : (
        <>
          <View className="mt-3 flex-row items-center gap-4">
            <ProgressRing stats={stats} replay={replay} />
            <View className="flex-1">
              <Text className="font-body-bold text-[10px] tracking-eyebrow text-cream-dim">
                CETTE SEMAINE
              </Text>
              <Text className="mt-1.5 font-display text-[16px] tracking-tight text-cream">
                Objectif : {stats.target} séance{stats.target > 1 ? "s" : ""}
              </Text>
              <View className="mt-2 flex-row items-center gap-1.5">
                <ArrowRight size={14} color={stats.remaining === 0 ? colors.mint : colors.coral} />
                <Text
                  className="flex-1 font-body-bold text-[13px]"
                  style={{ color: stats.remaining === 0 ? colors.mint : colors.coral }}
                >
                  {stats.remaining === 0
                    ? "Objectif atteint"
                    : `Encore ${stats.remaining} pour valider`}
                </Text>
              </View>
              {stats.pending > 0 ? (
                <Text className="mt-1.5 font-body text-[11.5px] text-cream-dim">
                  {stats.pending} en attente de vote
                </Text>
              ) : null}
            </View>
          </View>

          {/* Série du défi (masquée tant qu'aucune semaine n'a été réussie). */}
          {streak && streak.currentStreak > 0 ? (
            <StreakBanner
              currentStreak={streak.currentStreak}
              currentWeekCompleted={streak.currentWeekCompleted}
              remainingSessions={streak.remainingSessions}
            />
          ) : null}
        </>
      )}

      {showPot || showMembers ? (
        <>
          <View className="my-3.5 h-px" style={{ backgroundColor: colors.line }} />

          <View className="flex-row items-end" style={{ justifyContent: bottomJustify }}>
            {showPot ? (
              <View>
                <Text className="font-body text-[11.5px] text-cream-dim">Cagnotte du groupe</Text>
                {/* Chiffre nu en ambre : le dégradé de la maquette est un `background-clip:text`,
                    impossible tel quel en RN — une pastille dégradée alourdissait le bloc. */}
                <CountUp
                  key={replay}
                  to={Math.round(potTotal ?? 0)}
                  suffix=" €"
                  className="mt-1 font-display text-[30px] tracking-tighter"
                  style={{ color: colors.amber, lineHeight: 32 }}
                />
                <Text className="mt-1.5 font-body text-[10.5px] text-cream-dim">
                  {ended ? "à débloquer maintenant" : "débloquée à la fin du défi"}
                </Text>
              </View>
            ) : null}

            {showMembers ? (
              <View className="items-end">
                <View className="flex-row">
                  {shown.map((m, i) => (
                    <View
                      key={m.id}
                      style={{
                        marginLeft: i === 0 ? 0 : -9,
                        borderRadius: 16,
                        borderWidth: 2,
                        borderColor: colors.surface,
                      }}
                    >
                      <Avatar
                        uri={m.user.avatar_url}
                        color={m.user.avatar_color}
                        icon={m.user.avatar_icon}
                        seed={m.user.id}
                        name={`${m.user.first_name ?? ""} ${m.user.last_name ?? ""}`.trim()}
                        size={30}
                      />
                    </View>
                  ))}
                  {extra > 0 ? (
                    <View
                      className="items-center justify-center"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        marginLeft: -9,
                        borderWidth: 2,
                        borderColor: colors.surface,
                        backgroundColor: colors.surface2,
                      }}
                    >
                      <Text className="font-body-bold text-[10px] text-cream-dim">+{extra}</Text>
                    </View>
                  ) : null}
                </View>
                {/* Liste vide = pas encore chargée (on est forcément membre de son
                    propre défi) : mieux vaut ne rien dire qu'annoncer « 0 membre ». */}
                {members.length > 0 ? (
                  <Text className="mt-1.5 font-body text-[11px] text-cream-dim">
                    {members.length} membre{members.length > 1 ? "s" : ""}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        </>
      ) : null}
    </View>
  );
}
