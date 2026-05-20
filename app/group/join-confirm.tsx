import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { AlertTriangle, Check } from "lucide-react-native";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { Button } from "@/components/ui/Button";
import { Stepper } from "@/components/ui/Stepper";
import { RulesRecap } from "@/features/groups/RulesRecap";
import { useGroupPreview, useJoinGroup } from "@/features/groups/join";
import { buildRulesSnapshotFromPreview } from "@/features/groups/rules-snapshot";

export default function JoinConfirmScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { data: preview, isLoading, error } = useGroupPreview(code);
  const join = useJoinGroup();
  const { toast } = useFeedback();

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
          Aucun groupe trouvé avec le code « {code} ».
        </Text>
        <View className="mt-6 w-full max-w-xs">
          <Button variant="secondary" onPress={() => router.back()}>
            Réessayer
          </Button>
        </View>
      </View>
    );
  }

  const isFull = preview.member_count >= preview.max_members;
  const effectivePenalty = penalty ?? preview.penalty_amount;

  const onJoin = () => {
    join.mutate(
      {
        code: code!,
        weeklyTarget,
        penaltyAmount: effectivePenalty,
        rulesSnapshot: buildRulesSnapshotFromPreview(preview),
      },
      {
        onSuccess: (groupId) => {
          toast(`Tu as rejoint « ${preview.name} »`, "success");
          router.replace({ pathname: "/group/[id]", params: { id: groupId } } as never);
        },
        onError: (err) => {
          // Déjà membre : on emmène simplement l'utilisateur sur le groupe.
          if (err.message.includes("déjà partie") && preview) {
            router.replace({ pathname: "/group/[id]", params: { id: preview.id } } as never);
            return;
          }
          toast(err.message, "error");
        },
      }
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-neutral-900"
      contentContainerClassName="gap-6 p-6 pb-12"
      keyboardShouldPersistTaps="handled"
    >
      <View>
        <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{preview.name}</Text>
        {preview.description ? (
          <Text className="mt-1 text-base text-neutral-500 dark:text-neutral-400">
            {preview.description}
          </Text>
        ) : null}
        <Text className="mt-1 text-sm text-neutral-400">
          {preview.member_count} / {preview.max_members} membres
        </Text>
      </View>

      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Règles du défi
        </Text>
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
      </View>

      <View className="gap-3">
        <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Ton engagement
        </Text>
        <View className="flex-row items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
          <AlertTriangle size={18} color="#f59e0b" />
          <Text className="flex-1 text-sm text-amber-800 dark:text-amber-200">
            Ton objectif hebdomadaire sera <Text className="font-bold">verrouillé</Text> pour
            toute la durée du défi. Impossible de le modifier ensuite.
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
            <Text className="text-xs text-neutral-400">
              Défaut du groupe : {preview.penalty_amount} € — libre à toi
            </Text>
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

      {isFull ? (
        <Text className="text-center text-sm text-red-500">Ce groupe est complet.</Text>
      ) : null}

      <Button
        onPress={onJoin}
        disabled={!accepted || isFull}
        loading={join.isPending}
      >
        Rejoindre le groupe
      </Button>
    </ScrollView>
  );
}
