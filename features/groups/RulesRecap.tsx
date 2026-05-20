import { Text, View } from "react-native";

import { getActivityLabel } from "@/constants/activities";
import { formatDbDate } from "@/lib/date";

type DeadlineType = "same_day" | "end_of_week";

export type RulesRecapProps = {
  challengeStart: string;
  challengeEnd: string;
  penaltyAmount: number;
  acceptedActivities: string[];
  minDurationMin: number;
  publicationDeadline: DeadlineType | string;
  voteDeadline: DeadlineType | string;
  blameThreshold: number;
  maxExcuses: number | null;
};

const deadlineLabel = (value: string) =>
  value === "same_day" ? "le jour même (23h59)" : "jusqu'au dimanche 23h59";

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-4 py-1.5">
      <Text className="flex-1 text-sm text-neutral-500 dark:text-neutral-400">{label}</Text>
      <Text className="flex-1 text-right text-sm font-medium text-neutral-900 dark:text-white">
        {value}
      </Text>
    </View>
  );
}

/** Récapitulatif lisible des règles d'un défi (utilisé avant acceptation). */
export function RulesRecap(props: RulesRecapProps) {
  return (
    <View className="gap-1 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
      <Line
        label="Défi"
        value={`${formatDbDate(props.challengeStart)} → ${formatDbDate(props.challengeEnd)}`}
      />
      <Line label="Pénalité / séance manquée" value={`${props.penaltyAmount} €`} />
      <Line
        label="Activités acceptées"
        value={props.acceptedActivities.map(getActivityLabel).join(", ")}
      />
      <Line label="Durée min. d'une séance" value={`${props.minDurationMin} min`} />
      <Line label="Publication d'une séance" value={deadlineLabel(props.publicationDeadline)} />
      <Line label="Délai de vote" value={deadlineLabel(props.voteDeadline)} />
      <Line label="Seuil de blâmes" value={`${props.blameThreshold} séances rejetées`} />
      <Line
        label="Excuses autorisées"
        value={props.maxExcuses === null ? "illimitées" : String(props.maxExcuses)}
      />
    </View>
  );
}
