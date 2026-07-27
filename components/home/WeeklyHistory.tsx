import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { Card } from "@/components/ui/Card";
import { colors, gradients } from "@/constants/colors";
import {
  buildHistory,
  type HistoryGranularity,
  type HomeSession,
} from "@/features/home/home-stats";
import { useAppReducedMotion } from "@/hooks/useAppReducedMotion";

const TRACK_HEIGHT = 92;
const COL_W = 40; // largeur d'une colonne (barre + marge) — sert au centrage du défilement
const BAR_W = 20; // largeur de la barre, centrée dans sa colonne

const FILTERS: { value: HistoryGranularity; label: string }[] = [
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
];

/** Parse une date DB `YYYY-MM-DD` en LOCAL (pas UTC, pour ne pas décaler le jour). */
function parseDbDate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

type Props = {
  sessions: HomeSession[];
  meId: string | undefined;
  now: Date;
  /** Bornes du défi (`YYYY-MM-DD`) : on n'affiche pas de périodes hors du défi. */
  challengeStart: string;
  challengeEnd: string;
  weeklyTarget: number;
  /** Change à chaque arrivée sur l'écran → les barres repoussent depuis le bas. */
  replay: number;
};

/**
 * « Historique » : séances validées, **bornées à la période du défi**, à la
 * granularité choisie (Jour / Semaine / Mois).
 *
 * Avant, on affichait toujours les 6 dernières semaines calendaires — donc des
 * semaines antérieures au début du défi (forcément vides), qui n'apprenaient
 * rien. Ici on part du début du défi ; l'histogramme défile horizontalement et
 * se centre tout seul sur la période en cours (on peut glisser en arrière pour
 * revoir ce qu'on a fait, en avant pour les périodes à venir du défi).
 */
export function WeeklyHistory({
  sessions,
  meId,
  now,
  challengeStart,
  challengeEnd,
  weeklyTarget,
  replay,
}: Props) {
  const [granularity, setGranularity] = useState<HistoryGranularity>("week");
  const scrollRef = useRef<ScrollView>(null);
  const [viewportW, setViewportW] = useState(0);

  const bars = useMemo(
    () =>
      buildHistory(sessions, meId, {
        from: parseDbDate(challengeStart),
        to: parseDbDate(challengeEnd),
        now,
        granularity,
        target: weeklyTarget,
      }),
    [sessions, meId, challengeStart, challengeEnd, now, granularity, weeklyTarget]
  );

  const currentIndex = bars.findIndex((b) => b.current);

  // Centre la période courante à l'arrivée et à chaque changement de filtre.
  // (Un léger délai laisse le contenu se mesurer avant de faire défiler.)
  useEffect(() => {
    if (viewportW === 0 || bars.length === 0) return;
    const x =
      currentIndex >= 0
        ? Math.max(0, currentIndex * COL_W - (viewportW - COL_W) / 2)
        : bars.length * COL_W; // pas de période courante visible → on va à la fin
    const id = setTimeout(() => scrollRef.current?.scrollTo({ x, animated: true }), 60);
    return () => clearTimeout(id);
  }, [viewportW, currentIndex, granularity, bars.length]);

  return (
    <View>
      <View className="mb-2 flex-row items-center justify-between px-0.5">
        <Text className="font-display text-[16px] tracking-tight text-cream">Historique</Text>

        {/* Filtre de granularité — remplace l'ancien libellé « séances par semaine ». */}
        <View className="flex-row rounded-full p-0.5" style={{ backgroundColor: colors.surface }}>
          {FILTERS.map((f) => {
            const active = f.value === granularity;
            return (
              <Pressable
                key={f.value}
                onPress={() => setGranularity(f.value)}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                className="rounded-full px-2.5 py-1 active:opacity-80"
                style={{ backgroundColor: active ? colors.coralSoft : "transparent" }}
              >
                <Text
                  className="font-body-bold text-[11px]"
                  style={{ color: active ? colors.coral : colors.creamDim }}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Card>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={(e) => setViewportW(e.nativeEvent.layout.width)}
        >
          {bars.map((bar, index) => (
            <View key={bar.key} style={{ width: COL_W, alignItems: "center" }}>
              <Text
                className="mb-1.5 font-display text-[11px]"
                style={{ color: bar.done > 0 ? colors.cream : colors.creamDim }}
              >
                {bar.done}
              </Text>
              <Bar
                key={`${replay}-${granularity}-${bar.key}`}
                ratio={bar.ratio}
                done={bar.done}
                index={Math.min(index, 8)}
              />
              <Text
                numberOfLines={1}
                className="mt-1.5 font-body text-[9.5px]"
                style={{ color: bar.current ? colors.coral : colors.creamDim }}
              >
                {bar.label}
              </Text>
            </View>
          ))}
        </ScrollView>
      </Card>
    </View>
  );
}

/** Une colonne. Elle pousse depuis le bas, décalée de gauche à droite. */
function Bar({ ratio, done, index }: { ratio: number; done: number; index: number }) {
  const reduceMotion = useAppReducedMotion();
  // `Math.max(…, 3)` : une période à 0 garde un liseré visible, sinon la colonne
  // disparaît et on croit à un bug d'affichage.
  const target = Math.max(ratio * TRACK_HEIGHT, done > 0 ? 8 : 3);
  const height = useSharedValue(reduceMotion ? target : 0);

  useEffect(() => {
    if (reduceMotion) {
      height.value = target;
      return;
    }
    height.value = 0;
    height.value = withDelay(
      200 + index * 90,
      withTiming(target, { duration: 620, easing: Easing.bezier(0.2, 0.7, 0.2, 1) })
    );
  }, [target, index, height, reduceMotion]);

  const style = useAnimatedStyle(() => ({ height: height.value }));

  return (
    <View
      className="overflow-hidden rounded-lg"
      style={{ width: BAR_W, height: TRACK_HEIGHT, backgroundColor: "rgba(255,238,221,0.05)" }}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View style={[{ borderRadius: 8, opacity: done > 0 ? 1 : 0.25 }, style]}>
          <LinearGradient
            colors={gradients.brand.colors}
            locations={gradients.brand.locations}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
            style={{ flex: 1, borderRadius: 8 }}
          />
        </Animated.View>
      </View>
    </View>
  );
}
