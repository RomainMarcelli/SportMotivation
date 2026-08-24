import { CalendarDays, ChevronRight, Crown, Target, Users } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { colors } from "@/constants/colors";
import {
  challengePhase,
  challengePhaseLabel,
  challengeTiming,
  type ChallengePhase,
} from "@/features/groups/challenge-phase";
import type { MyGroup } from "@/features/groups/queries";

// Couleur du badge selon la phase (dérivée des dates, cf. `challenge-phase.ts`).
const PHASE_VARIANT: Record<ChallengePhase, "coral" | "amber" | "mint" | "default"> = {
  upcoming: "amber",
  active: "coral",
  ended: "mint",
  cancelled: "default",
};

type Props = {
  item: MyGroup;
  onPress: () => void;
};

/** Carte DA d'un groupe dans la liste d'accueil. Réutilise la query `useMyGroups`. */
export function GroupCard({ item, onPress }: Props) {
  const { group, role, weeklyTarget, memberCount } = item;
  const now = new Date();
  const phase = challengePhase(group.status, group.challenge_start, group.challenge_end, now);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <Card>
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 flex-row items-center gap-1.5">
            <Text
              numberOfLines={1}
              className="shrink font-display text-[17px] tracking-tight text-cream"
            >
              {group.name}
            </Text>
            {role === "admin" ? <Crown size={15} color={colors.amber} /> : null}
          </View>
          <Badge label={challengePhaseLabel(phase)} variant={PHASE_VARIANT[phase]} />
        </View>

        <View className="mt-2.5 flex-row items-center gap-2">
          <CalendarDays size={14} color={colors.creamDim} />
          <Text className="flex-1 font-body text-[12.5px] text-cream-dim">
            {challengeTiming(group.status, group.challenge_start, group.challenge_end, now)}
          </Text>
        </View>

        <View className="mt-3 flex-row items-center justify-between border-t border-line pt-3">
          <View className="flex-row items-center gap-1.5">
            <Target size={15} color={colors.coral} />
            <Text className="font-body-semibold text-[12.5px] text-cream">
              {weeklyTarget} séance{weeklyTarget > 1 ? "s" : ""}
              <Text className="font-body text-cream-dim"> / sem.</Text>
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Users size={14} color={colors.creamDim} />
            {/* L'effectif, pas la capacité : « max 12 » n'apprenait rien sur qui
                est dans le défi. La capacité reste visible à côté. */}
            <Text className="font-body-semibold text-[12.5px] text-cream">
              {memberCount > 0 ? memberCount : "—"}
              <Text className="font-body text-cream-dim">
                {" "}
                membre{memberCount > 1 ? "s" : ""} · max {group.max_members}
              </Text>
            </Text>
            <ChevronRight size={18} color={colors.creamDim} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
