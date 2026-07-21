import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Check, HeartCrack, Ticket } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { Card } from "@/components/ui/Card";
import { CountUp } from "@/components/ui/CountUp";
import { colors, gradients } from "@/constants/colors";
import { mapJokerError, useMonthlyJoker, useUseJoker } from "@/features/jokers/queries";
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
 * Chip « joker » branché sur la table `jokers` (1 par membre et par mois, consommation
 * irréversible via la RPC `use_joker`) + entrée « M'excuser cette semaine » vers l'écran
 * d'excuse. L'EFFET du joker/de l'excuse sur les pénalités = Étape 9.
 */
export function WeekPlanner({ groupId, weeklyTarget }: Props) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const { data: plannedDays } = useWeeklyPlan(groupId);
  const toggleDay = useToggleWeeklyPlanDay(groupId);
  const { data: jokerUsed } = useMonthlyJoker(groupId);
  const useJoker = useUseJoker(groupId);

  // Miroir local pour un compteur réactif immédiat (la mutation persiste en arrière-plan).
  const [days, setDays] = useState<number[]>(plannedDays ?? []);
  useEffect(() => {
    if (plannedDays) setDays(plannedDays);
  }, [plannedDays]);

  const onJoker = async () => {
    if (jokerUsed || useJoker.isPending) return;
    const ok = await confirm({
      title: "Utiliser ton joker ?",
      message:
        "1 joker par mois : il annule une séance manquée sans pénalité ni vote. Action définitive.",
      confirmLabel: "Utiliser",
      cancelLabel: "Annuler",
    });
    if (!ok) return;
    useJoker.mutate(undefined, {
      onSuccess: () => toast("Joker utilisé pour ce mois-ci.", "success"),
      onError: (e) => toast(mapJokerError(e.message), "error"),
    });
  };

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

        <Pressable
          onPress={onJoker}
          disabled={jokerUsed || useJoker.isPending}
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

      {/* Entrée « M'excuser » : justifier une semaine au vote du groupe. */}
      <Pressable
        onPress={() =>
          router.push({ pathname: "/group/[id]/excuse", params: { id: groupId } } as never)
        }
        className="mt-3 flex-row items-center justify-center gap-2 rounded-input border border-line-2 bg-surface-2 py-3 active:opacity-80"
      >
        <HeartCrack size={15} color={colors.creamDim} />
        <Text className="font-body-semibold text-[13px] text-cream">
          M'excuser cette semaine
        </Text>
      </Pressable>
    </Card>
  );
}
