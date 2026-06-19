import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, Lock } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { AppBackground } from "@/components/ui/AppBackground";
import { Button } from "@/components/ui/Button";
import { CheckCard } from "@/components/ui/CheckCard";
import { GradientButton } from "@/components/ui/GradientButton";
import { Note } from "@/components/ui/Note";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Stepper } from "@/components/ui/Stepper";
import { colors } from "@/constants/colors";
import { GroupPreviewCard } from "@/features/groups/GroupPreviewCard";
import {
  useAcceptInvitation,
  useGroupPreviewById,
  useRefuseInvitation,
} from "@/features/groups/invitations";
import { RulesRecap } from "@/features/groups/RulesRecap";
import { buildRulesSnapshotFromPreview } from "@/features/groups/rules-snapshot";

function FieldLabel({ children }: { children: string }) {
  return (
    <Text className="mb-2.5 font-body-bold text-[12px] uppercase tracking-label text-cream-dim">
      {children}
    </Text>
  );
}

export default function AcceptInviteScreen() {
  const { invitationId, groupId } = useLocalSearchParams<{
    invitationId: string;
    groupId: string;
  }>();
  const router = useRouter();
  const { data: preview, isLoading, error } = useGroupPreviewById(groupId);
  const accept = useAcceptInvitation();
  const refuse = useRefuseInvitation();
  const { toast } = useFeedback();

  const [weeklyTarget, setWeeklyTarget] = useState(3);
  const [penalty, setPenalty] = useState<number | null>(null);
  const [accepted, setAccepted] = useState(false);

  if (isLoading) {
    return (
      <View className="flex-1">
        <AppBackground />
        <ScreenContainer transparent>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.coral} />
          </View>
        </ScreenContainer>
      </View>
    );
  }

  if (error || !preview) {
    return (
      <View className="flex-1">
        <AppBackground />
        <ScreenContainer transparent>
          <View className="flex-1 items-center justify-center gap-6 px-2">
            <Text className="text-center font-body text-[14px] text-cream-dim">
              Cette invitation n'est plus valide.
            </Text>
            <View className="w-full max-w-[280px]">
              <Button variant="secondary" onPress={() => router.back()}>
                Retour
              </Button>
            </View>
          </View>
        </ScreenContainer>
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
        onSuccess: (gid) =>
          router.replace({ pathname: "/group/[id]", params: { id: gid } } as never),
        onError: (e) => toast(e.message, "error"),
      }
    );
  };

  const onRefuse = () => {
    refuse.mutate(invitationId!, {
      onSuccess: () => router.back(),
      onError: (e) => toast(e.message, "error"),
    });
  };

  return (
    <View className="flex-1">
      <AppBackground />
      <ScreenContainer transparent padded={false} edges={["bottom"]}>
        <ScrollView
          contentContainerClassName="gap-[18px] px-[18px] pb-10 pt-3"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Reveal delay={0}>
            <Text className="font-body text-[13px] text-cream-dim">Tu es invité à rejoindre</Text>
            <View className="mt-3">
              <GroupPreviewCard
                name={preview.name}
                description={preview.description}
                memberCount={preview.member_count}
                maxMembers={preview.max_members}
                challengeStart={preview.challenge_start}
                challengeEnd={preview.challenge_end}
              />
            </View>
          </Reveal>

          <Reveal delay={80}>
            <FieldLabel>Les règles du défi</FieldLabel>
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
          </Reveal>

          <Reveal delay={140}>
            <FieldLabel>Ton objectif hebdomadaire</FieldLabel>
            <Stepper
              value={weeklyTarget}
              onChange={setWeeklyTarget}
              min={1}
              max={14}
              unit="séances / semaine"
            />
            <View className="mt-2.5">
              <Note icon={Lock} tone="amber">
                Ton objectif sera <Text className="font-body-bold">verrouillé</Text> dès que tu
                rejoins.
              </Note>
            </View>
          </Reveal>

          <Reveal delay={180}>
            <FieldLabel>Ta pénalité par séance manquée</FieldLabel>
            <Stepper
              value={effectivePenalty}
              onChange={setPenalty}
              min={0}
              max={100}
              suffix="€"
              unit={`défaut : ${preview.penalty_amount} €`}
            />
          </Reveal>

          <Reveal delay={220}>
            <CheckCard checked={accepted} onToggle={() => setAccepted(!accepted)}>
              <Text className="font-body text-[12.5px] leading-5 text-cream-dim">
                J'ai lu et j'accepte les règles du défi.
              </Text>
            </CheckCard>
          </Reveal>

          <Reveal delay={260} className="mt-1 gap-3">
            <GradientButton
              icon={Check}
              onPress={onAccept}
              disabled={!accepted}
              loading={accept.isPending}
            >
              Accepter et rejoindre
            </GradientButton>
            <Button variant="ghost" onPress={onRefuse} loading={refuse.isPending}>
              Refuser l'invitation
            </Button>
          </Reveal>
        </ScrollView>
      </ScreenContainer>
    </View>
  );
}
