import { useRouter } from "expo-router";
import { ChevronLeft, Lock } from "lucide-react-native";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { AppBackground } from "@/components/ui/AppBackground";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { colors } from "@/constants/colors";
import { BADGE_CATEGORY_LABEL } from "@/constants/badges";
import {
  badgeTally,
  buildBadgeViews,
  groupBadgesByCategory,
  type BadgeView,
} from "@/features/badges/badge-logic";
import { useTrophies } from "@/features/badges/queries";

/** Date courte à la française (« 15 août 2026 »). */
function longDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(iso)
  );
}

/**
 * Écran Trophées : badges débloqués et à débloquer (avec progression), regroupés par
 * catégorie. Un badge est GLOBAL au compte et définitivement acquis. Rendu DA maison
 * (pastilles + icônes lucide) — l'architecture (catalogue central) permettra de
 * remplacer les visuels par des illustrations dédiées plus tard.
 */
export default function TrophiesScreen() {
  const router = useRouter();
  const { data, isLoading } = useTrophies();

  const views = useMemo(
    () => buildBadgeViews(data?.unlocked ?? {}, data?.ctx ?? { validatedSessions: 0, bestStreak: 0 }),
    [data]
  );
  const groups = useMemo(() => groupBadgesByCategory(views), [views]);
  const tally = useMemo(() => badgeTally(views), [views]);

  return (
    <View className="flex-1">
      <AppBackground />
      <ScreenContainer transparent padded={false} edges={["top"]}>
        {/* Header maison : back + titre + compteur. */}
        <View className="flex-row items-center gap-3 px-[18px] pb-3 pt-1">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.navigate("/profile" as never))}
            hitSlop={10}
            accessibilityLabel="Retour"
            className="h-10 w-10 items-center justify-center rounded-chip border border-line bg-surface active:opacity-70"
          >
            <ChevronLeft size={22} color={colors.cream} strokeWidth={2.2} />
          </Pressable>
          <View className="flex-1">
            <Text className="font-display text-[20px] tracking-tighter text-cream">Trophées</Text>
            <Text className="mt-0.5 font-body text-[11.5px] text-cream-dim">
              {tally.unlocked} / {tally.total} débloqués
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.coral} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32, gap: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {groups.map((group, gi) => (
              <View key={group.category} className="mt-2">
                <Text className="mb-2 px-0.5 font-body-bold text-[12px] uppercase tracking-label text-cream-dim">
                  {BADGE_CATEGORY_LABEL[group.category]}
                </Text>
                <View className="gap-2.5">
                  {group.badges.map((b, i) => (
                    <Reveal key={b.key} delay={Math.min(gi * 60 + i * 40, 300)}>
                      <BadgeCard badge={b} />
                    </Reveal>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </ScreenContainer>
    </View>
  );
}

function BadgeCard({ badge }: { badge: BadgeView }) {
  const Icon = badge.icon;
  const unlocked = badge.unlocked;
  const p = badge.progress;

  return (
    <View
      className="flex-row items-center gap-3.5 rounded-[16px] border p-3.5"
      style={{
        backgroundColor: colors.surface,
        borderColor: unlocked ? "rgba(255,178,62,0.28)" : colors.line,
        opacity: unlocked ? 1 : 0.92,
      }}
    >
      {/* Pastille : teintée si débloqué, grise + cadenas sinon. */}
      <View
        className="h-[46px] w-[46px] items-center justify-center rounded-[14px]"
        style={{ backgroundColor: unlocked ? `${badge.tint}22` : colors.surface2 }}
      >
        {unlocked ? (
          <Icon size={23} color={badge.tint} strokeWidth={2.1} />
        ) : (
          <Lock size={19} color={colors.creamDim} strokeWidth={2.1} />
        )}
      </View>

      <View className="flex-1">
        <Text
          className="font-display text-[15px] tracking-tight"
          style={{ color: unlocked ? colors.cream : colors.creamDim }}
        >
          {badge.title}
        </Text>
        <Text className="mt-0.5 font-body text-[11.5px] text-cream-dim">{badge.description}</Text>

        {unlocked ? (
          <Text className="mt-1 font-body-semibold text-[11px]" style={{ color: colors.mint }}>
            Débloqué le {longDate(badge.unlockedAt!)}
          </Text>
        ) : p ? (
          // Progression pour les badges à seuil (séances / série).
          <View className="mt-2">
            <View
              className="h-1.5 overflow-hidden rounded-full"
              style={{ backgroundColor: colors.surface2 }}
            >
              <View
                style={{
                  width: `${Math.round(p.ratio * 100)}%`,
                  height: "100%",
                  borderRadius: 999,
                  backgroundColor: badge.tint,
                }}
              />
            </View>
            <Text className="mt-1 font-body text-[10.5px] text-cream-dim">
              {p.current} / {p.target}
            </Text>
          </View>
        ) : (
          <Text className="mt-1 font-body text-[11px] text-cream-dim">À débloquer</Text>
        )}
      </View>
    </View>
  );
}
