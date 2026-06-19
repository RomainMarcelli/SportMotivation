import { LinearGradient } from "expo-linear-gradient";
import { Check } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { CountUp } from "@/components/ui/CountUp";
import { colors, gradients } from "@/constants/colors";
import { useToggleWeeklyPlanDay, useWeeklyPlan } from "@/features/plans/queries";
import { WEEKDAY_LABELS, todayWeekdayIndex } from "@/features/plans/plan";

type Props = {
  /** Groupe « actif » auquel rattacher le plan de la semaine. */
  groupId: string;
  /** Objectif hebdo du membre dans ce groupe. */
  weeklyTarget: number;
};

/**
 * « Ma semaine » : 7 jours tappables branchés sur `weekly_plans` (plan du membre, semaine
 * en cours). Jour prévu = pastille dégradée + check ; jour libre = pastille pointillée amber ;
 * aujourd'hui = anneau coral. Compteur live (jours prévus / objectif).
 *
 * Le chip « joker » est un PLACEHOLDER local non persistant : aucune table `jokers` n'existe
 * encore — le vrai système de jokers/excuses arrive à l'Étape 8 (`excuses`). TODO Étape 8.
 */
export function WeekPlanner({ groupId, weeklyTarget }: Props) {
  const { data: plannedDays } = useWeeklyPlan(groupId);
  const toggleDay = useToggleWeeklyPlanDay(groupId);

  // Miroir local pour un compteur réactif immédiat (la mutation persiste en arrière-plan).
  const [days, setDays] = useState<number[]>(plannedDays ?? []);
  useEffect(() => {
    if (plannedDays) setDays(plannedDays);
  }, [plannedDays]);

  // TODO Étape 8 — joker masqué jusqu'au système d'excuses (table `excuses`). Réactiver le chip
  // ci-dessous une fois branché sur l'état réel (placeholder non persistant pour l'instant).
  // const [jokerUsed, setJokerUsed] = useState(false);

  const today = todayWeekdayIndex(new Date());

  const onToggle = (index: number) => {
    const current = days;
    setDays((d) => (d.includes(index) ? d.filter((x) => x !== index) : [...d, index].sort()));
    toggleDay.mutate(
      { dayIndex: index, current },
      { onError: () => setDays(current) } // rollback si l'upsert échoue
    );
  };

  return (
    <Card>
      <View className="mb-3.5 flex-row items-center justify-between">
        <Text className="font-display text-[16px] text-cream">Ma semaine</Text>

        {/* TODO Étape 8 — chip joker masqué (placeholder non persistant). À rebrancher sur
            le système d'excuses :
        <Pressable
          onPress={() => setJokerUsed((v) => !v)}
          hitSlop={6}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 9,
            paddingVertical: 5,
            borderRadius: 999,
            backgroundColor: jokerUsed ? colors.surface2 : colors.amberSoft,
          }}
        >
          <Ticket size={13} color={jokerUsed ? colors.creamDim : colors.amber} />
          <Text
            style={{
              fontFamily: "PlusJakartaSans_700Bold",
              fontSize: 11,
              color: jokerUsed ? colors.creamDim : colors.amber,
            }}
          >
            {jokerUsed ? "Joker utilisé" : "1 joker"}
          </Text>
        </Pressable>
        */}
      </View>

      <View className="flex-row justify-between">
        {WEEKDAY_LABELS.map((label, index) => {
          const done = days.includes(index);
          const isToday = index === today;
          return (
            <Pressable
              key={index}
              onPress={() => onToggle(index)}
              hitSlop={4}
              className="items-center gap-2"
            >
              <Text
                className="font-body-semibold text-[11px]"
                style={{ color: isToday ? colors.coral : colors.creamDim }}
              >
                {label}
              </Text>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 11,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: done ? 0 : 1.5,
                  borderStyle: done ? "solid" : "dashed",
                  borderColor: done ? "transparent" : colors.amber,
                  backgroundColor: done ? "transparent" : "rgba(255,178,62,0.10)",
                  ...(isToday ? { shadowColor: colors.coral } : null),
                }}
              >
                {done ? (
                  <LinearGradient
                    {...gradients.brand}
                    style={{
                      position: "absolute",
                      width: 32,
                      height: 32,
                      borderRadius: 11,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check size={16} color={colors.onCoral} strokeWidth={2.8} />
                  </LinearGradient>
                ) : null}
                {isToday && !done ? (
                  <View
                    style={{
                      position: "absolute",
                      top: -3,
                      left: -3,
                      right: -3,
                      bottom: -3,
                      borderRadius: 14,
                      borderWidth: 2,
                      borderColor: colors.coral,
                    }}
                  />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View className="mt-3.5 flex-row items-center justify-between border-t border-line pt-3">
        <View className="flex-row items-center gap-1">
          <CountUp
            to={days.length}
            duration={700}
            className="font-display text-[13px] text-cream"
          />
          <Text className="font-body text-[12px] text-cream-dim"> jours prévus</Text>
        </View>
        <Text className="font-body text-[12px] text-cream-dim">
          objectif <Text className="font-display text-[13px] text-cream">{weeklyTarget}</Text>
        </Text>
      </View>
    </Card>
  );
}
