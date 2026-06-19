import {
  CalendarDays,
  Clock,
  Coins,
  ShieldCheck,
  Tag,
  Timer,
  TriangleAlert,
  Upload,
} from "lucide-react-native";

import { RecapCard, RecapRow } from "@/components/ui/RecapRow";
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
  value === "same_day" ? "Le jour même" : "Jusqu'à dimanche";

/** Récapitulatif lisible des règles d'un défi (DA), utilisé avant acceptation. */
export function RulesRecap(props: RulesRecapProps) {
  const activitiesLabel =
    props.acceptedActivities.length <= 2
      ? props.acceptedActivities.map(getActivityLabel).join(", ") || "—"
      : `${props.acceptedActivities.length} activités`;

  return (
    <RecapCard>
      <RecapRow
        icon={CalendarDays}
        label="Période"
        value={`${formatDbDate(props.challengeStart)} → ${formatDbDate(props.challengeEnd)}`}
      />
      <RecapRow icon={Coins} label="Pénalité / séance" value={`${props.penaltyAmount} €`} />
      <RecapRow icon={Tag} label="Activités" value={activitiesLabel} />
      <RecapRow icon={Clock} label="Durée minimum" value={`${props.minDurationMin} min`} />
      <RecapRow
        icon={Upload}
        label="Publication"
        value={deadlineLabel(props.publicationDeadline)}
      />
      <RecapRow icon={Timer} label="Délai de vote" value={deadlineLabel(props.voteDeadline)} />
      <RecapRow
        icon={TriangleAlert}
        label="Seuil de blâmes"
        value={`${props.blameThreshold} blâmes`}
      />
      <RecapRow
        icon={ShieldCheck}
        label="Excuses"
        value={props.maxExcuses === null ? "Illimitées" : String(props.maxExcuses)}
        last
      />
    </RecapCard>
  );
}
