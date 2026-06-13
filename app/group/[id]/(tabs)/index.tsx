import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import {
  AlertCircle,
  Check,
  Copy,
  CalendarDays,
  Dumbbell,
  KeyRound,
  Users,
  Wallet,
} from "lucide-react-native";

import { RoleBadge } from "@/components/groups/RoleBadge";
import { Button } from "@/components/ui/Button";
import { getActivityLabel } from "@/constants/activities";
import { classifyGroupError } from "@/features/groups/errors";
import { useGroup, useGroupMembers } from "@/features/groups/queries";
import { useCurrentUser } from "@/lib/auth-store";
import { formatDbDate } from "@/lib/date";

export default function GroupDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useCurrentUser();
  const { data: group, isLoading, error, refetch, isRefetching } = useGroup(id);
  const { data: members } = useGroupMembers(id);
  const [copied, setCopied] = useState(false);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  if (error || !group) {
    const classified = classifyGroupError(error);
    return (
      <View className="flex-1 items-center justify-center bg-white p-6 dark:bg-neutral-900">
        <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
          <AlertCircle size={28} color="#ef4444" />
        </View>
        <Text className="mb-2 text-center text-base font-medium text-neutral-700 dark:text-neutral-300">
          {classified.message}
        </Text>
        {classified.technical ? (
          <Text className="mb-6 text-center text-xs text-neutral-400">{classified.technical}</Text>
        ) : (
          <View className="mb-6" />
        )}
        <View className="w-full max-w-xs gap-3">
          <Button onPress={() => refetch()} loading={isRefetching}>
            Réessayer
          </Button>
          <Button variant="secondary" onPress={() => router.replace("/" as never)}>
            Retour à l'accueil
          </Button>
        </View>
      </View>
    );
  }

  const activities = Array.isArray(group.accepted_activities)
    ? (group.accepted_activities as string[])
    : [];
  const isAdmin = members?.some((m) => m.user.id === user?.id && m.role === "admin") ?? false;
  const goToInvite = () =>
    router.push({ pathname: "/group/[id]/invite", params: { id: id! } } as never);
  const goToMembers = () =>
    router.push({ pathname: "/group/[id]/members", params: { id: id! } } as never);
  const goToEdit = () =>
    router.push({ pathname: "/group/[id]/edit", params: { id: id! } } as never);
  const copyCode = async () => {
    await Clipboard.setStringAsync(group.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

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

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button onPress={goToInvite}>Inviter</Button>
        </View>
        <View className="flex-1">
          <Button variant="secondary" onPress={goToMembers}>
            Membres
          </Button>
        </View>
      </View>
      {isAdmin ? (
        <Button variant="secondary" onPress={goToEdit}>
          Modifier le groupe
        </Button>
      ) : null}

      <Pressable
        onPress={copyCode}
        className="flex-row items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 active:opacity-70 dark:border-neutral-700 dark:bg-neutral-800"
      >
        <KeyRound size={20} color="#3b82f6" />
        <View className="flex-1">
          <Text className="text-xs text-neutral-500 dark:text-neutral-400">
            Code d'invitation
          </Text>
          <Text className="text-base font-semibold tracking-widest text-neutral-900 dark:text-white">
            {group.invite_code}
          </Text>
        </View>
        {copied ? (
          <View className="flex-row items-center gap-1">
            <Check size={16} color="#16a34a" />
            <Text className="text-xs font-medium text-green-600">Copié</Text>
          </View>
        ) : (
          <Copy size={18} color="#94a3b8" />
        )}
      </Pressable>
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
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Membres ({members?.length ?? 0})
          </Text>
          {isAdmin ? (
            <Text className="text-xs font-medium text-primary-500" onPress={goToMembers}>
              Gérer
            </Text>
          ) : null}
        </View>
        {members?.map((member) => (
          <View key={member.id} className="flex-row items-center justify-between py-1">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-base text-neutral-900 dark:text-white">
                {member.user.first_name} {member.user.last_name}
              </Text>
              <RoleBadge role={member.role} />
            </View>
            <Text className="text-sm text-neutral-500">{member.weeklyTarget}/sem</Text>
          </View>
        ))}
      </View>

      <View className="mt-2 flex-row items-center gap-2 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-700">
        <Dumbbell size={18} color="#94a3b8" />
        <Text className="flex-1 text-xs text-neutral-400">
          Retrouve tes séances dans l'onglet « Séances ». Votes et cagnotte arrivent bientôt.
        </Text>
      </View>
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
