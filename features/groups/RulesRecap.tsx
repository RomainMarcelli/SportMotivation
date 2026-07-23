import {
  CalendarClock,
  CalendarDays,
  Clock,
  Coins,
  ShieldCheck,
  Tag,
  Target,
  Timer,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { RecapCard, RecapRow } from "@/components/ui/RecapRow";
import { activitiesDisplay, getActivityIcon, getActivityLabel } from "@/constants/activities";
import { colors } from "@/constants/colors";
import { formatDbDate } from "@/lib/date";

type DeadlineType = "same_day" | "end_of_week";

export type RulesRecapProps = {
  challengeStart: string;
  challengeEnd: string;
  /**
   * Pénalité **effectivement appliquée au lecteur** : la pénalité est réglable
   * par membre (cf. `group_members.penalty_amount`), afficher celle du groupe
   * montrait un montant que l'intéressé n'avait jamais choisi.
   */
  penaltyAmount: number;
  /** Objectif hebdo du membre. Absent = on masque la ligne. */
  weeklyTarget?: number | null;
  acceptedActivities: string[];
  minDurationMin: number;
  publicationDeadline: DeadlineType | string;
  voteDeadline: DeadlineType | string;
  blameThreshold: number;
  maxExcuses: number | null;
  /** Séances max par jour et par membre. `null`/absent = sans limite. */
  maxSessionsPerDay?: number | null;
};

const deadlineLabel = (value: string) =>
  value === "same_day" ? "Le jour même" : "Jusqu'à dimanche";

/** « 5 € », « 7,50 € » — jamais « 7.5 € ». */
function euros(amount: number): string {
  return Number.isInteger(amount)
    ? `${amount} €`
    : `${amount.toFixed(2).replace(".", ",")} €`;
}

/** Récapitulatif lisible des règles d'un défi (DA), utilisé avant acceptation. */
export function RulesRecap(props: RulesRecapProps) {
  const [activitiesOpen, setActivitiesOpen] = useState(false);
  const activities = activitiesDisplay(props.acceptedActivities);

  return (
    <>
      <RecapCard>
        <RecapRow
          icon={CalendarDays}
          label="Période"
          value={`${formatDbDate(props.challengeStart)} → ${formatDbDate(props.challengeEnd)}`}
        />
        {typeof props.weeklyTarget === "number" ? (
          <RecapRow
            icon={Target}
            label="Séances / semaine"
            value={`${props.weeklyTarget} séance${props.weeklyTarget > 1 ? "s" : ""}`}
          />
        ) : null}
        <RecapRow icon={Coins} label="Pénalité / séance" value={euros(props.penaltyAmount)} />
        {/* Peu d'activités et courtes → tout en clair, sans popup. Trop nombreuses
            ou trop longues → résumé « +N » cliquable qui ouvre la liste complète. */}
        <RecapRow
          icon={Tag}
          label="Activités"
          value={activities.label}
          badge={activities.mode === "popup" && activities.extra > 0 ? `+${activities.extra}` : undefined}
          onPress={activities.mode === "popup" ? () => setActivitiesOpen(true) : undefined}
        />
        <RecapRow icon={Clock} label="Durée minimum" value={`${props.minDurationMin} min`} />
        {props.maxSessionsPerDay !== undefined ? (
          <RecapRow
            icon={CalendarClock}
            label="Séances / jour"
            value={props.maxSessionsPerDay ? `${props.maxSessionsPerDay} max` : "Sans limite"}
          />
        ) : null}
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

      <ActivitiesSheet
        visible={activitiesOpen}
        activities={props.acceptedActivities}
        onClose={() => setActivitiesOpen(false)}
      />
    </>
  );
}

/** Liste complète des activités acceptées, en feuille basse. */
function ActivitiesSheet({
  visible,
  activities,
  onClose,
}: {
  visible: boolean;
  activities: string[];
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Fermer" />
        <View
          className="rounded-t-[28px] border-x border-t px-5 pb-8 pt-5"
          style={{ backgroundColor: colors.surface, borderColor: colors.line2 }}
        >
          <View
            className="mb-4 h-1 w-10 self-center rounded-full"
            style={{ backgroundColor: colors.line2 }}
          />
          <View className="mb-1 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="font-display text-[18px] tracking-tight text-cream">
                Activités acceptées
              </Text>
              <Text className="mt-0.5 font-body text-[12px] text-cream-dim">
                {activities.length} activité{activities.length > 1 ? "s" : ""} comptent pour ce
                défi.
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityLabel="Fermer"
              className="h-9 w-9 items-center justify-center rounded-chip active:opacity-70"
              style={{ backgroundColor: colors.surface2 }}
            >
              <X size={17} color={colors.creamDim} />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {activities.map((id) => {
                const Icon = getActivityIcon(id);
                return (
                  <View
                    key={id}
                    className="flex-row items-center gap-2 rounded-full border px-3 py-2"
                    style={{ backgroundColor: colors.surface2, borderColor: colors.line }}
                  >
                    <Icon size={15} color={colors.coral} />
                    <Text className="font-body-semibold text-[13px] text-cream">
                      {getActivityLabel(id)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
