import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowRight,
  Check,
  HeartPulse,
  Info,
  Minus,
  Paperclip,
  Umbrella,
  X,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { AppBackground } from "@/components/ui/AppBackground";
import { Avatar } from "@/components/ui/Avatar";
import { GradientButton } from "@/components/ui/GradientButton";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { colors } from "@/constants/colors";
import { EXCUSE_MOTIFS, EXCUSE_TYPES, type ExcuseType } from "@/features/excuses/excuse-logic";
import { useMyWeekExcuse } from "@/features/excuses/queries";
import { mapExcuseError, useSubmitExcuse } from "@/features/excuses/mutations";
import { useGroup, useGroupMembers } from "@/features/groups/queries";
import { useCurrentUser } from "@/lib/auth-store";

type Attachment = { uri: string; base64: string; mime: string };

const TYPE_ICONS: Record<ExcuseType, typeof Umbrella> = {
  standard: Umbrella,
  major: HeartPulse,
};

function FieldLabel({ children }: { children: string }) {
  return (
    <Text className="font-body-bold text-[12px] uppercase tracking-label text-cream-dim">
      {children}
    </Text>
  );
}

export default function ExcuseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const me = useCurrentUser();
  const { toast } = useFeedback();

  const { data: group, isLoading } = useGroup(id);
  const { data: members } = useGroupMembers(id);
  const { data: existing, isLoading: loadingExisting } = useMyWeekExcuse(id);
  const submit = useSubmitExcuse();

  const [type, setType] = useState<ExcuseType>("standard");
  const [reason, setReason] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);

  const motifs = EXCUSE_MOTIFS[type];
  const otherMembers = useMemo(
    () => (members ?? []).filter((m) => m.user.id !== me?.id),
    [members, me?.id]
  );

  const goBack = () =>
    router.canGoBack() ? router.back() : router.navigate("/groups" as never);

  const pickJustification = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.6,
        base64: true,
      });
      if (result.canceled || !result.assets[0]?.base64) return;
      const asset = result.assets[0];
      setAttachment({
        uri: asset.uri,
        base64: asset.base64!,
        mime: asset.mimeType ?? "image/jpeg",
      });
    } catch {
      toast("Impossible d'ajouter le justificatif.", "error");
    }
  };

  const doSubmit = () => {
    submit.mutate(
      {
        groupId: id!,
        excuseType: type,
        reason: reason.trim(),
        justificationBase64: attachment?.base64 ?? null,
        justificationMime: attachment?.mime ?? null,
      },
      {
        onSuccess: () => {
          toast("Excuse soumise au vote du groupe.", "success");
          goBack();
        },
        onError: (e) => toast(mapExcuseError(e.message), "error"),
      }
    );
  };

  if (isLoading || !group || loadingExisting) {
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

  // Déjà une excuse cette semaine (anti-doublon côté UI).
  if (existing) {
    return (
      <View className="flex-1">
        <AppBackground />
        <ScreenContainer transparent>
          <View className="flex-1 items-center justify-center gap-4 px-8">
            <View
              className="h-[72px] w-[72px] items-center justify-center rounded-full"
              style={{ backgroundColor: existing.status === "accepted" ? colors.mintSoft : colors.amberSoft }}
            >
              {existing.status === "accepted" ? (
                <Check size={34} color={colors.mint} strokeWidth={2.6} />
              ) : (
                <Info size={34} color={colors.amber} strokeWidth={2.2} />
              )}
            </View>
            <Text className="text-center font-display text-[20px] tracking-tight text-cream">
              {existing.status === "accepted"
                ? "Ton excuse est acceptée"
                : "Excuse déjà soumise cette semaine"}
            </Text>
            <Text className="text-center font-body text-[13px] leading-[1.5] text-cream-dim">
              {existing.status === "accepted"
                ? "Le groupe a validé ton excuse pour cette semaine."
                : "Le groupe vote actuellement ton excuse. Reviens la semaine prochaine pour une nouvelle."}
            </Text>
            <Pressable
              onPress={goBack}
              className="mt-1 rounded-full border border-line-2 bg-surface px-6 py-3 active:opacity-80"
            >
              <Text className="font-body-semibold text-[14px] text-cream">Retour</Text>
            </Pressable>
          </View>
        </ScreenContainer>
      </View>
    );
  }

  const canSubmit = reason.trim().length > 0;

  return (
    <View className="flex-1">
      <AppBackground />
      <ScreenContainer transparent padded={false} edges={[]}>
        <ScrollView
          contentContainerClassName="gap-[18px] px-[18px] pt-2"
          contentContainerStyle={{ paddingBottom: 124 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Contexte groupe */}
          <View className="flex-row items-center gap-2">
            <View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: colors.amber }} />
            <Text className="font-body text-[12px] text-cream-dim">
              {group.name} · semaine en cours
            </Text>
          </View>

          {/* Type d'excuse */}
          <Reveal delay={40}>
            <FieldLabel>Type d'excuse</FieldLabel>
            <View className="mt-3 gap-2.5">
              {EXCUSE_TYPES.map((t) => {
                const Icon = TYPE_ICONS[t.value];
                const on = type === t.value;
                return (
                  <Pressable
                    key={t.value}
                    onPress={() => {
                      setType(t.value);
                      setReason("");
                    }}
                    className="flex-row items-start gap-3 rounded-2xl border p-3.5 active:opacity-90"
                    style={
                      on
                        ? { backgroundColor: colors.coralSoft, borderColor: "transparent" }
                        : { backgroundColor: colors.surface, borderColor: colors.line }
                    }
                  >
                    <View
                      className="h-[42px] w-[42px] items-center justify-center rounded-xl"
                      style={{ backgroundColor: on ? "rgba(255,106,69,0.20)" : colors.surface2 }}
                    >
                      <Icon size={21} color={on ? colors.coral : colors.creamDim} strokeWidth={2} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-display text-[15.5px] tracking-tight text-cream">
                        {t.name}
                      </Text>
                      <Text className="mt-1 font-body text-[12px] leading-[1.45] text-cream-dim">
                        {t.desc}
                      </Text>
                      <View
                        className="mt-2.5 flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1"
                        style={{
                          backgroundColor: t.tone === "ok" ? colors.mintSoft : colors.amberSoft,
                        }}
                      >
                        {t.tone === "ok" ? (
                          <Check size={12} color={colors.mint} strokeWidth={2.8} />
                        ) : (
                          <Minus size={12} color={colors.amber} strokeWidth={2.8} />
                        )}
                        <Text
                          className="font-body-bold text-[11px]"
                          style={{ color: t.tone === "ok" ? colors.mint : colors.amber }}
                        >
                          {t.effect}
                        </Text>
                      </View>
                    </View>
                    <View
                      className="mt-0.5 h-[22px] w-[22px] items-center justify-center rounded-full border-2"
                      style={{ borderColor: on ? colors.coral : colors.line2 }}
                    >
                      {on ? (
                        <View
                          style={{
                            height: 11,
                            width: 11,
                            borderRadius: 6,
                            backgroundColor: colors.coral,
                          }}
                        />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Reveal>

          {/* Motif */}
          <Reveal delay={120}>
            <View className="flex-row items-baseline justify-between">
              <FieldLabel>Motif</FieldLabel>
              <Text className="font-body text-[11px] text-cream-dim">obligatoire</Text>
            </View>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {motifs.map((m) => {
                const on = reason.trim() === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setReason(on ? "" : m)}
                    className="flex-row items-center rounded-[13px] border px-3 py-2 active:opacity-80"
                    style={
                      on
                        ? { backgroundColor: colors.coralSoft, borderColor: "transparent" }
                        : { backgroundColor: colors.surface, borderColor: colors.line }
                    }
                  >
                    <Text
                      className="font-body-semibold text-[13px]"
                      style={{ color: on ? colors.coral : colors.creamDim }}
                    >
                      {m}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Explique en quelques mots ce qui t'empêche de tenir ton objectif cette semaine…"
              placeholderTextColor="rgba(183,161,139,0.55)"
              multiline
              className="mt-3 min-h-[98px] rounded-[14px] border bg-surface px-3.5 py-3 font-body text-[14px] text-cream"
              style={{ borderColor: colors.line, textAlignVertical: "top" }}
            />
          </Reveal>

          {/* Justificatif */}
          <Reveal delay={200}>
            <View className="flex-row items-baseline justify-between">
              <FieldLabel>Justificatif</FieldLabel>
              <Text
                className="font-body text-[11px]"
                style={{ color: type === "major" ? colors.amber : colors.creamDim }}
              >
                {type === "major" ? "Recommandé" : "Facultatif"}
              </Text>
            </View>

            {attachment ? (
              <View
                className="mt-3 flex-row items-center gap-3 rounded-[14px] border bg-surface p-3"
                style={{ borderColor: colors.line2 }}
              >
                <View
                  className="h-[42px] w-[42px] items-center justify-center rounded-[10px]"
                  style={{ backgroundColor: colors.mintSoft }}
                >
                  <Check size={20} color={colors.mint} strokeWidth={2.4} />
                </View>
                <View className="flex-1">
                  <Text className="font-body-semibold text-[13px] text-cream">Justificatif ajouté</Text>
                  <Text className="mt-0.5 font-body text-[11px] text-cream-dim">Prêt à envoyer</Text>
                </View>
                <Pressable
                  onPress={() => setAttachment(null)}
                  hitSlop={6}
                  className="h-8 w-8 items-center justify-center rounded-[9px] active:opacity-80"
                  style={{ backgroundColor: colors.surface2 }}
                >
                  <X size={15} color={colors.creamDim} strokeWidth={2.4} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={pickJustification}
                className="mt-3 items-center gap-2.5 rounded-2xl border-[1.5px] border-dashed px-4 py-6 active:opacity-90"
                style={{ borderColor: colors.line2, backgroundColor: "rgba(255,238,221,0.02)" }}
              >
                <View
                  className="h-11 w-11 items-center justify-center rounded-xl"
                  style={{ backgroundColor: colors.surface2 }}
                >
                  <Paperclip size={22} color={colors.cream} strokeWidth={2} />
                </View>
                <Text className="font-display text-[13.5px] text-cream">
                  Ajouter une photo
                </Text>
                <Text className="font-body text-[11px] text-cream-dim">
                  {Platform.OS === "web" ? "JPG ou PNG" : "Depuis ta galerie"}
                </Text>
              </Pressable>
            )}
          </Reveal>

          {/* Info vote */}
          <Reveal delay={280}>
            <View
              className="rounded-2xl border bg-surface p-3.5"
              style={{ borderColor: colors.line }}
            >
              <View className="flex-row items-start gap-2.5">
                <Info size={16} color={colors.amber} strokeWidth={2} style={{ marginTop: 1 }} />
                <Text className="flex-1 font-body text-[12px] leading-[1.5] text-cream-dim">
                  Ton excuse est{" "}
                  <Text className="font-body-semibold text-cream">soumise au vote du groupe</Text> à
                  la majorité simple. Tu ne votes pas sur ta propre excuse.
                </Text>
              </View>
              {otherMembers.length > 0 ? (
                <View
                  className="mt-3 flex-row items-center gap-3 border-t pt-3"
                  style={{ borderTopColor: colors.line }}
                >
                  <View className="flex-row">
                    {otherMembers.slice(0, 5).map((m, i) => (
                      <View key={m.id} style={{ marginLeft: i === 0 ? 0 : -9 }}>
                        <Avatar
                          uri={m.user.avatar_url}
                          name={`${m.user.first_name ?? ""} ${m.user.last_name ?? ""}`.trim()}
                          size={30}
                        />
                      </View>
                    ))}
                  </View>
                  <Text className="font-body text-[12px] text-cream-dim">
                    <Text className="font-body-semibold text-cream">
                      {otherMembers.length} membre{otherMembers.length > 1 ? "s" : ""}
                    </Text>{" "}
                    voteront
                  </Text>
                </View>
              ) : null}
            </View>
          </Reveal>
        </ScrollView>

        {/* Footer collant */}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.ink,
            borderTopColor: colors.line,
            borderTopWidth: 1,
            paddingHorizontal: 18,
            paddingTop: 10,
            paddingBottom: 12,
          }}
        >
          <GradientButton
            icon={ArrowRight}
            onPress={doSubmit}
            loading={submit.isPending}
            disabled={!canSubmit}
          >
            Soumettre au vote
          </GradientButton>
          <Text className="mt-2 text-center font-body text-[11px] text-cream-dim">
            {canSubmit ? "Le groupe votera à la majorité simple." : "Ajoute un motif pour soumettre."}
          </Text>
        </View>
      </ScreenContainer>
    </View>
  );
}
