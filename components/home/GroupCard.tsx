import { CalendarDays, ChevronRight, Crown, Target, Users } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { colors } from "@/constants/colors";
import type { MyGroup } from "@/features/groups/queries";
import { daysUntil, formatDbDate } from "@/lib/date";

type GroupStatus = MyGroup["group"]["status"];

const STATUS_BADGE: Record<GroupStatus, { label: string; variant: "coral" | "amber" | "mint" | "default" }> = {
  active: { label: "En cours", variant: "coral" },
  setup: { label: "À venir", variant: "amber" },
  completed: { label: "Terminé", variant: "mint" },
  cancelled: { label: "Annulé", variant: "default" },
};

/** Sous-titre temporel : compte à rebours si le défi est en cours, sinon plage de dates. */
function timing(group: MyGroup["group"], now: Date): string {
  if (group.status === "active") {
    const left = daysUntil(group.challenge_end, now);
    if (left > 0) return `J-${left} · fin le ${formatDbDate(group.challenge_end)}`;
    if (left === 0) return `Dernier jour · ${formatDbDate(group.challenge_end)}`;
    return `Terminé le ${formatDbDate(group.challenge_end)}`;
  }
  if (group.status === "setup") return `Démarre le ${formatDbDate(group.challenge_start)}`;
  return `${formatDbDate(group.challenge_start)} → ${formatDbDate(group.challenge_end)}`;
}

type Props = {
  item: MyGroup;
  onPress: () => void;
};

/** Carte DA d'un groupe dans la liste d'accueil. Réutilise la query `useMyGroups`. */
export function GroupCard({ item, onPress }: Props) {
  const { group, role, weeklyTarget, memberCount } = item;
  const badge = STATUS_BADGE[group.status] ?? STATUS_BADGE.active;

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
          <Badge label={badge.label} variant={badge.variant} />
        </View>

        <View className="mt-2.5 flex-row items-center gap-2">
          <CalendarDays size={14} color={colors.creamDim} />
          <Text className="flex-1 font-body text-[12.5px] text-cream-dim">
            {timing(group, new Date())}
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
