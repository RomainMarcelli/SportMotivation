import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowRight, Check, Lock, Users } from "lucide-react-native";
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
import { useGroupPreview, useJoinGroup } from "@/features/groups/join";
import { useMyGroups } from "@/features/groups/queries";
import { RulesRecap } from "@/features/groups/RulesRecap";
import { buildRulesSnapshotFromPreview } from "@/features/groups/rules-snapshot";

function FieldLabel({ children }: { children: string }) {
  return (
    <Text className="mb-2.5 font-body-bold text-[12px] uppercase tracking-label text-cream-dim">
      {children}
    </Text>
  );
}

export default function JoinConfirmScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { data: preview, isLoading, error } = useGroupPreview(code);
  const { data: myGroups } = useMyGroups();
  const join = useJoinGroup();
  const { toast } = useFeedback();

  // Déjà membre ? On bloque AVANT le formulaire (le serveur refuse aussi, ceinture + bretelles).
  const alreadyMember =
    !!preview && (myGroups ?? []).some((g) => g.group.id === preview.id);

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
              Aucun groupe trouvé avec le code « {code} ».
            </Text>
            <View className="w-full max-w-[280px]">
              <Button variant="secondary" onPress={() => router.back()}>
                Réessayer
              </Button>
            </View>
          </View>
        </ScreenContainer>
      </View>
    );
  }

  if (alreadyMember) {
    return (
      <View className="flex-1">
        <AppBackground />
        <ScreenContainer transparent>
          <View className="flex-1 items-center justify-center gap-4 px-6">
            <View
              className="h-[72px] w-[72px] items-center justify-center rounded-full"
              style={{ backgroundColor: colors.amberSoft }}
            >
              <Users size={34} color={colors.amber} strokeWidth={2} />
            </View>
            <Text className="text-center font-display text-[20px] tracking-tight text-cream">
              Tu es déjà membre
            </Text>
            <Text className="text-center font-body text-[13px] leading-[1.5] text-cream-dim">
              Tu fais déjà partie de « {preview.name} » — impossible de le rejoindre une deuxième
              fois.
            </Text>
            <View className="mt-1 w-full max-w-[300px] gap-2.5">
              <GradientButton
                iconRight={ArrowRight}
                onPress={() =>
                  router.replace({ pathname: "/group/[id]", params: { id: preview.id } } as never)
                }
              >
                Ouvrir le groupe
              </GradientButton>
              <Button variant="secondary" onPress={() => router.back()}>
                Retour
              </Button>
            </View>
          </View>
        </ScreenContainer>
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
    <View className="flex-1">
      <AppBackground />
      <ScreenContainer transparent padded={false} edges={["bottom"]}>
        <ScrollView
          contentContainerClassName="gap-[18px] px-[18px] pb-10 pt-3"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Reveal delay={0}>
            <View
              className="flex-row items-center gap-3 rounded-[14px] border p-3"
              style={{ backgroundColor: colors.mintSoft, borderColor: "rgba(95,224,168,0.28)" }}
            >
              <View
                className="h-[26px] w-[26px] items-center justify-center rounded-full"
                style={{ backgroundColor: colors.mint }}
              >
                <Check size={15} color={colors.onMint} strokeWidth={3} />
              </View>
              <Text className="flex-1 font-body text-[12.5px] text-cream">
                Défi trouvé · code{" "}
                <Text className="font-display tracking-wider text-cream">{code}</Text>
              </Text>
            </View>
          </Reveal>

          <Reveal delay={60}>
            <GroupPreviewCard
              name={preview.name}
              description={preview.description}
              memberCount={preview.member_count}
              maxMembers={preview.max_members}
              challengeStart={preview.challenge_start}
              challengeEnd={preview.challenge_end}
              status={preview.status}
            />
          </Reveal>

          <Reveal delay={120}>
            <FieldLabel>Les règles du défi</FieldLabel>
            <RulesRecap
              challengeStart={preview.challenge_start}
              challengeEnd={preview.challenge_end}
              // Suit le sélecteur ci-dessous : le tableau des règles doit montrer
              // l'engagement qu'on s'apprête à prendre, pas une valeur générique.
              weeklyTarget={weeklyTarget}
              penaltyAmount={preview.penalty_amount}
              acceptedActivities={preview.accepted_activities}
              minDurationMin={preview.min_duration_min}
              publicationDeadline={preview.publication_deadline}
              voteDeadline={preview.vote_deadline}
              blameThreshold={preview.blame_threshold}
              maxExcuses={preview.max_excuses}
            />
          </Reveal>

          <Reveal delay={180}>
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
                Ce nombre te sera propre et sera{" "}
                <Text className="font-body-bold">verrouillé</Text> dès que tu rejoins. Impossible
                d'en changer pendant le défi.
              </Note>
            </View>
          </Reveal>

          <Reveal delay={220}>
            <FieldLabel>Ta pénalité par séance manquée</FieldLabel>
            <Stepper
              value={effectivePenalty}
              onChange={setPenalty}
              min={0}
              max={100}
              suffix="€"
              unit={`défaut du groupe : ${preview.penalty_amount} €`}
            />
          </Reveal>

          <Reveal delay={260}>
            <CheckCard checked={accepted} onToggle={() => setAccepted(!accepted)}>
              <Text className="font-body text-[12.5px] leading-5 text-cream-dim">
                J'accepte les règles du défi. Mon objectif de{" "}
                <Text className="font-body-semibold text-cream">
                  {weeklyTarget} séances / semaine
                </Text>{" "}
                sera figé jusqu'à la fin.
              </Text>
            </CheckCard>
          </Reveal>

          {isFull ? (
            <Text className="text-center font-body-medium text-[13px] text-red">
              Ce groupe est complet.
            </Text>
          ) : null}

          <Reveal delay={300} className="mt-1">
            <GradientButton
              iconRight={ArrowRight}
              onPress={onJoin}
              disabled={!accepted || isFull}
              loading={join.isPending}
            >
              Rejoindre le défi
            </GradientButton>
          </Reveal>
        </ScrollView>
      </ScreenContainer>
    </View>
  );
}
