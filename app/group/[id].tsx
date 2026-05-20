import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { CalendarDays, KeyRound, Users, Wallet } from "lucide-react-native";

import { getActivityLabel } from "@/constants/activities";
import { useGroup, useGroupMembers } from "@/features/groups/queries";
import { formatDbDate } from "@/lib/date";

export default function GroupDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: group, isLoading, error } = useGroup(id);
  const { data: members } = useGroupMembers(id);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  if (error || !group) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6 dark:bg-neutral-900">
        <Text className="text-center text-base text-neutral-500">
          Impossible de charger ce groupe.
        </Text>
      </View>
    );
  }

  const activities = Array.isArray(group.accepted_activities)
    ? (group.accepted_activities as string[])
    : [];

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-neutral-900"
      contentContainerClassName="gap-5 p-6"
    >
      <View>
        <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{group.name}</Text>
        {group.description ? (
          <Text className="mt-1 text-base text-neutral-500 dark:text-neutral-400">
            {group.description}
          </Text>
        ) : null}
      </View>

      <InfoRow
        icon={<KeyRound size={20} color="#3b82f6" />}
        label="Code d'invitation"
        value={group.invite_code}
      />
      <InfoRow
        icon={<CalendarDays size={20} color="#3b82f6" />}
        label="Défi"
        value={`${formatDbDate(group.challenge_start)} → ${formatDbDate(group.challenge_end)}`}
      />
      <InfoRow
        icon={<Wallet size={20} color="#3b82f6" />}
        label="Pénalité / séance manquée"
        value={`${group.penalty_amount} €`}
      />
      <InfoRow
        icon={<Users size={20} color="#3b82f6" />}
        label="Membres"
        value={`${members?.length ?? "…"} / ${group.max_members}`}
      />

      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Activités acceptées
        </Text>
        <Text className="text-base text-neutral-700 dark:text-neutral-300">
          {activities.map(getActivityLabel).join(", ")}
        </Text>
      </View>

      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Membres ({members?.length ?? 0})
        </Text>
        {members?.map((member) => (
          <View key={member.id} className="flex-row items-center justify-between py-1">
            <Text className="text-base text-neutral-900 dark:text-white">
              {member.user.first_name} {member.user.last_name}
              {member.role === "admin" ? " 👑" : ""}
            </Text>
            <Text className="text-sm text-neutral-500">{member.weeklyTarget}/sem</Text>
          </View>
        ))}
      </View>

      <Text className="mt-4 text-center text-xs text-neutral-400">
        Dashboard complet à venir (Phase 2.E) — séances, votes, cagnotte.
      </Text>
    </ScrollView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
      {icon}
      <View className="flex-1">
        <Text className="text-xs text-neutral-500 dark:text-neutral-400">{label}</Text>
        <Text className="text-base font-semibold text-neutral-900 dark:text-white">{value}</Text>
      </View>
    </View>
  );
}
