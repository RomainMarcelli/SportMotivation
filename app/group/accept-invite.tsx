import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { AlertTriangle, Check } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { Stepper } from "@/components/ui/Stepper";
import { RulesRecap } from "@/features/groups/RulesRecap";
import {
  useAcceptInvitation,
  useGroupPreviewById,
  useRefuseInvitation,
} from "@/features/groups/invitations";
import { buildRulesSnapshotFromPreview } from "@/features/groups/rules-snapshot";

export default function AcceptInviteScreen() {
  const { invitationId, groupId } = useLocalSearchParams<{
    invitationId: string;
    groupId: string;
  }>();
  const router = useRouter();
  const { data: preview, isLoading, error } = useGroupPreviewById(groupId);
  const accept = useAcceptInvitation();
  const refuse = useRefuseInvitation();

  const [weeklyTarget, setWeeklyTarget] = useState(3);
  const [penalty, setPenalty] = useState<number | null>(null);
  const [accepted, setAccepted] = useState(false);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  if (error || !preview) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6 dark:bg-neutral-900">
        <Text className="text-center text-base text-neutral-500 dark:text-neutral-400">
          Cette invitation n'est plus valide.
        </Text>
        <View className="mt-6 w-full max-w-xs">
          <Button variant="secondary" onPress={() => router.back()}>
            Retour
          </Button>
        </View>
      </View>
    );
  }

  const effectivePenalty = penalty ?? preview.penalty_amount;

  const onAccept = () => {
    accept.mutate(
      {
        invitationId: invitationId!,
        weeklyTarget,
        penaltyAmount: effectivePenalty,
        rulesSnapshot: buildRulesSnapshotFromPreview(preview),
      },
      {
        onSuccess: (gid) => router.replace({ pathname: "/group/[id]", params: { id: gid } } as never),
        onError: (e) => Alert.alert("Impossible de rejoindre", e.message),
      }
    );
  };

  const onRefuse = () => {
    refuse.mutate(invitationId!, {
      onSuccess: () => router.back(),
      onError: (e) => Alert.alert("Erreur", e.message),
    });
  };

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-neutral-900"
      contentContainerClassName="gap-6 p-6 pb-12"
      keyboardShouldPersistTaps="handled"
    >
      <View>
        <Text className="text-sm text-neutral-500 dark:text-neutral-400">Tu es invité à rejoindre</Text>
        <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{preview.name}</Text>
        <Text className="mt-1 text-sm text-neutral-400">
          {preview.member_count} / {preview.max_members} membres
        </Text>
      </View>

      <RulesRecap
        challengeStart={preview.challenge_start}
        challengeEnd={preview.challenge_end}
        penaltyAmount={preview.penalty_amount}
        acceptedActivities={preview.accepted_activities}
        minDurationMin={preview.min_duration_min}
        publicationDeadline={preview.publication_deadline}
        voteDeadline={preview.vote_deadline}
        blameThreshold={preview.blame_threshold}
        maxExcuses={preview.max_excuses}
      />

      <View className="gap-3">
        <View className="flex-row items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
          <AlertTriangle size={18} color="#f59e0b" />
          <Text className="flex-1 text-sm text-amber-800 dark:text-amber-200">
            Ton objectif hebdomadaire sera <Text className="font-bold">verrouillé</Text>.
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Séances par semaine
          </Text>
          <Stepper value={weeklyTarget} onChange={setWeeklyTarget} min={1} max={14} />
        </View>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Ta pénalité / séance manquée
            </Text>
            <Text className="text-xs text-neutral-400">Défaut : {preview.penalty_amount} €</Text>
          </View>
          <Stepper value={effectivePenalty} onChange={setPenalty} min={0} max={100} suffix="€" />
        </View>
      </View>

      <Pressable
        onPress={() => setAccepted(!accepted)}
        className="flex-row items-start gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700"
      >
        <View
          className={`mt-0.5 h-6 w-6 items-center justify-center rounded-md border-2 ${
            accepted ? "border-primary-500 bg-primary-500" : "border-neutral-300 dark:border-neutral-600"
          }`}
        >
          {accepted ? <Check size={16} color="#ffffff" /> : null}
        </View>
        <Text className="flex-1 text-sm text-neutral-700 dark:text-neutral-300">
          J'ai lu et j'accepte les règles du défi.
        </Text>
      </Pressable>

      <View className="gap-3">
        <Button onPress={onAccept} disabled={!accepted} loading={accept.isPending}>
          Accepter et rejoindre
        </Button>
        <Button variant="ghost" onPress={onRefuse} loading={refuse.isPending}>
          Refuser l'invitation
        </Button>
      </View>
    </ScrollView>
  );
}
