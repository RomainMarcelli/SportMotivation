import { CalendarDays, Users } from "lucide-react-native";
import { Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { colors } from "@/constants/colors";
import {
  challengePhase,
  challengePhaseLabel,
  type ChallengePhase,
} from "@/features/groups/challenge-phase";
import { daysUntil, formatDbDate } from "@/lib/date";

// Palette du badge d'aperçu (surface `hero`).
const PREVIEW_VARIANT: Record<ChallengePhase, "mint" | "amber" | "default"> = {
  active: "mint",
  upcoming: "amber",
  ended: "default",
  cancelled: "default",
};

type Props = {
  name: string;
  description?: string | null;
  memberCount: number;
  maxMembers: number;
  challengeStart: string;
  challengeEnd: string;
  /** Statut du groupe ; absent → pas de badge. */
  status?: string;
};

/** Carte d'aperçu d'un défi (adhésion par code ou invitation). DA `hero`. */
export function GroupPreviewCard({
  name,
  description,
  memberCount,
  maxMembers,
  challengeStart,
  challengeEnd,
  status,
}: Props) {
  const now = new Date();
  const left = daysUntil(challengeEnd, now);
  const phase = status ? challengePhase(status, challengeStart, challengeEnd, now) : null;
  return (
    <Card variant="hero">
      <View className="flex-row items-start justify-between gap-3">
        <Text className="flex-1 font-display text-[21px] tracking-tighter text-cream">{name}</Text>
        {phase ? (
          <Badge label={challengePhaseLabel(phase)} variant={PREVIEW_VARIANT[phase]} />
        ) : null}
      </View>
      {description ? (
        <Text className="mt-1.5 font-body text-[13px] leading-5 text-cream-dim">{description}</Text>
      ) : null}
      <View className="mt-3 flex-row items-center gap-2">
        <Users size={14} color={colors.creamDim} />
        <Text className="font-body text-[12.5px] text-cream-dim">
          <Text className="font-body-semibold text-cream">{memberCount}</Text> / {maxMembers} membres
        </Text>
      </View>
      <View className="mt-1.5 flex-row items-center gap-2">
        <CalendarDays size={14} color={colors.creamDim} />
        <Text className="font-body text-[12.5px] text-cream-dim">
          {formatDbDate(challengeStart)} → {formatDbDate(challengeEnd)}
          {left > 0 ? <Text className="font-body-semibold text-cream"> · J-{left}</Text> : null}
        </Text>
      </View>
    </Card>
  );
}
