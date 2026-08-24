import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import {
  AlertCircle,
  CalendarClock,
  CalendarDays,
  Clock,
  Coins,
  Info,
  Plus,
  Tag,
  Target,
  Trophy,
  Upload,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ActivityPicker } from "@/components/groups/ActivityPicker";
import { AppBackground } from "@/components/ui/AppBackground";
import { CheckCard } from "@/components/ui/CheckCard";
import { Chip } from "@/components/ui/Chip";
import { DateField } from "@/components/ui/DateField";
import { GradientButton } from "@/components/ui/GradientButton";
import { RecapCard, RecapRow } from "@/components/ui/RecapRow";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Stepper } from "@/components/ui/Stepper";
import { TextField } from "@/components/ui/TextField";
import { colors } from "@/constants/colors";
import { useCreateGroup } from "@/features/groups/mutations";
import {
  createGroupDefaults,
  createGroupFormSchema,
  type CreateGroupFormInput,
} from "@/features/groups/schemas";
import {
  addDuration,
  DURATION_PRESETS,
  DURATION_UNIT_LABELS,
  DURATION_UNITS,
  type DurationUnit,
} from "@/lib/duration";

const DEADLINE_OPTIONS = [
  { value: "same_day" as const, label: "Le jour même" },
  { value: "end_of_week" as const, label: "Jusqu'à dimanche" },
];

const UNIT_OPTIONS = DURATION_UNITS.map((u) => ({
  value: u,
  label: DURATION_UNIT_LABELS[u].charAt(0).toUpperCase() + DURATION_UNIT_LABELS[u].slice(1),
}));

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}
function fmtLong(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(
    d
  );
}

/** Traduit les erreurs serveur connues en message lisible. */
function mapCreateError(message: string): string {
  if (message.includes("groups_min_duration_min_check"))
    return "La durée minimum n'est pas encore acceptée par la base (exécute supabase/sql/016).";
  if (/row-level security|permission/i.test(message))
    return "Accès refusé par la base de données.";
  return message;
}

function FieldLabel({ children }: { children: string }) {
  return (
    <Text className="mb-2.5 font-body-bold text-[12px] uppercase tracking-label text-cream-dim">
      {children}
    </Text>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <View className="mt-2.5 flex-row items-center gap-1.5">
      <Info size={13} color={colors.amber} />
      <Text className="flex-1 font-body text-[11.5px] text-cream-dim">{children}</Text>
    </View>
  );
}

export default function CreateGroupScreen() {
  const router = useRouter();
  const createGroup = useCreateGroup();
  const today = useMemo(() => startOfDay(new Date()), []);

  const [durMode, setDurMode] = useState<"preset" | "custom">("preset");
  const [presetMonths, setPresetMonths] = useState(3);
  const [customValue, setCustomValue] = useState(6);
  const [customUnit, setCustomUnit] = useState<DurationUnit>("mois");

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<CreateGroupFormInput>({
    resolver: zodResolver(createGroupFormSchema),
    mode: "onChange",
    defaultValues: {
      ...createGroupDefaults,
      challengeStart: today,
      challengeEnd: addDuration(today, 3, "mois"),
    },
  });

  const v = watch();
  const start = v.challengeStart ?? today;

  // Recalcule la date de fin dès que la date de début ou la durée change.
  useEffect(() => {
    const end =
      durMode === "preset"
        ? addDuration(start, presetMonths, "mois")
        : addDuration(start, customValue, customUnit);
    setValue("challengeEnd", end, { shouldValidate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start.getTime(), durMode, presetMonths, customValue, customUnit]);

  const onSubmit = (data: CreateGroupFormInput) => {
    createGroup.mutate(
      {
        name: data.name,
        description: data.description,
        challengeStart: data.challengeStart,
        challengeEnd: data.challengeEnd,
        penaltyAmount: data.penaltyAmount,
        acceptedActivities: data.acceptedActivities,
        minDurationMin: data.minDurationMin,
        publicationDeadline: data.publicationDeadline,
        voteDeadline: data.voteDeadline,
        blameThreshold: data.blameThreshold,
        maxExcuses: data.maxExcuses,
        maxSessionsPerDay: data.maxSessionsPerDay,
        weeklyTarget: data.weeklyTarget,
      },
      {
        onSuccess: (group) =>
          router.replace({ pathname: "/group/[id]", params: { id: group.id } } as never),
      }
    );
  };

  const startLabel = isSameDay(start, today) ? "aujourd'hui" : fmtLong(start);

  return (
    <View className="flex-1">
      <AppBackground />
      <ScreenContainer transparent padded={false} edges={["bottom"]}>
        <ScrollView
          contentContainerClassName="gap-[18px] px-[18px] pb-10 pt-2"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Reveal delay={0}>
            <Text className="font-body text-[13px] text-cream-dim">Tu en seras l'admin.</Text>
          </Reveal>

          {/* Nom */}
          <Reveal delay={40}>
            <FieldLabel>Nom du défi</FieldLabel>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  icon={Trophy}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Défi de l'été"
                  error={errors.name?.message}
                />
              )}
            />
          </Reveal>

          {/* Durée */}
          <Reveal delay={80}>
            <FieldLabel>Durée du défi</FieldLabel>
            <View className="flex-row flex-wrap gap-2">
              {DURATION_PRESETS.map((m) => (
                <Chip
                  key={m}
                  label={`${m} mois`}
                  selected={durMode === "preset" && presetMonths === m}
                  onPress={() => {
                    setDurMode("preset");
                    setPresetMonths(m);
                  }}
                />
              ))}
              <Chip
                label="Autre"
                selected={durMode === "custom"}
                onPress={() => setDurMode("custom")}
              />
            </View>

            {durMode === "custom" ? (
              <View className="mt-2.5 gap-2.5">
                <Stepper
                  value={customValue}
                  onChange={setCustomValue}
                  min={1}
                  max={365}
                  unit={DURATION_UNIT_LABELS[customUnit]}
                />
                <SegmentedControl
                  value={customUnit}
                  onChange={setCustomUnit}
                  options={UNIT_OPTIONS}
                />
              </View>
            ) : null}
          </Reveal>

          {/* Date de début */}
          <Reveal delay={120}>
            <FieldLabel>Date de début</FieldLabel>
            <View className="flex-row items-end gap-2.5">
              <Controller
                control={control}
                name="challengeStart"
                render={({ field: { onChange, value } }) => (
                  <DateField
                    label="Début"
                    value={value}
                    onChange={(d) => onChange(startOfDay(d))}
                    minimumDate={today}
                    error={errors.challengeStart?.message}
                  />
                )}
              />
              <Pressable
                onPress={() => setValue("challengeStart", today, { shouldValidate: true })}
                className="h-[50px] items-center justify-center rounded-input border border-line-2 bg-surface px-4 active:opacity-80"
              >
                <Text className="font-display text-[13px] text-cream">Aujourd'hui</Text>
              </Pressable>
            </View>
            <Hint>
              Démarre {startLabel} · se termine le{" "}
              <Text className="font-body-semibold text-cream">{fmtLong(v.challengeEnd ?? start)}</Text>
            </Hint>
          </Reveal>

          {/* Objectif par défaut */}
          <Reveal delay={160}>
            <FieldLabel>Objectif par défaut</FieldLabel>
            <Controller
              control={control}
              name="weeklyTarget"
              render={({ field: { onChange, value } }) => (
                <Stepper
                  value={value}
                  onChange={onChange}
                  min={1}
                  max={14}
                  unit="séances / semaine"
                />
              )}
            />
            <Hint>Chaque membre pourra ajuster le sien.</Hint>
          </Reveal>

          {/* Pénalité */}
          <Reveal delay={200}>
            <FieldLabel>Pénalité par séance manquée</FieldLabel>
            <Controller
              control={control}
              name="penaltyAmount"
              render={({ field: { onChange, value } }) => (
                <Stepper
                  value={value}
                  onChange={onChange}
                  min={0}
                  max={100}
                  suffix="€"
                  unit="vers la cagnotte"
                />
              )}
            />
            <Hint>Pénalité par défaut — chaque membre pourra ajuster la sienne ensuite.</Hint>
          </Reveal>

          {/* Durée minimum */}
          <Reveal delay={240}>
            <FieldLabel>Durée minimum d'une séance</FieldLabel>
            <Controller
              control={control}
              name="minDurationMin"
              render={({ field: { onChange, value } }) => (
                <Stepper
                  value={value}
                  onChange={onChange}
                  min={0}
                  max={180}
                  step={5}
                  unit="minutes"
                  zeroLabel="Aucun minimum"
                />
              )}
            />
          </Reveal>

          {/* Activités */}
          <Reveal delay={280}>
            <FieldLabel>Activités autorisées</FieldLabel>
            <Controller
              control={control}
              name="acceptedActivities"
              render={({ field: { onChange, value } }) => (
                <ActivityPicker value={value} onChange={onChange} />
              )}
            />
            {errors.acceptedActivities ? (
              <Text className="mt-2 font-body text-[12px] text-red">
                {errors.acceptedActivities.message}
              </Text>
            ) : null}
          </Reveal>

          {/* Publication */}
          <Reveal delay={320}>
            <FieldLabel>Publier une séance</FieldLabel>
            <Controller
              control={control}
              name="publicationDeadline"
              render={({ field: { onChange, value } }) => (
                <SegmentedControl value={value} onChange={onChange} options={DEADLINE_OPTIONS} />
              )}
            />
          </Reveal>

          {/* Délai de vote */}
          <Reveal delay={350}>
            <FieldLabel>Délai de vote</FieldLabel>
            <Controller
              control={control}
              name="voteDeadline"
              render={({ field: { onChange, value } }) => (
                <SegmentedControl value={value} onChange={onChange} options={DEADLINE_OPTIONS} />
              )}
            />
          </Reveal>

          {/* Seuil de blâmes */}
          <Reveal delay={380}>
            <FieldLabel>Seuil de blâmes avant pénalité</FieldLabel>
            <Controller
              control={control}
              name="blameThreshold"
              render={({ field: { onChange, value } }) => (
                <Stepper value={value} onChange={onChange} min={1} max={10} unit="blâmes" />
              )}
            />
          </Reveal>

          {/* Séances max par jour (0 = sans limite) */}
          <Reveal delay={395}>
            <FieldLabel>Séances max par jour</FieldLabel>
            <Controller
              control={control}
              name="maxSessionsPerDay"
              render={({ field: { onChange, value } }) => (
                <Stepper
                  value={value ?? 0}
                  onChange={(n) => onChange(n === 0 ? null : n)}
                  min={0}
                  max={20}
                  unit="par jour"
                  zeroLabel="Sans limite"
                />
              )}
            />
          </Reveal>

          {/* Récap */}
          <Reveal delay={410}>
            <FieldLabel>Récap des règles</FieldLabel>
            <RecapCard>
              <RecapRow
                icon={CalendarDays}
                label="Période"
                value={`${isSameDay(start, today) ? "auj." : fmtLong(start)} → ${fmtLong(
                  v.challengeEnd ?? start
                )}`}
              />
              <RecapRow icon={Target} label="Objectif" value={`${v.weeklyTarget} / sem.`} />
              <RecapRow icon={Coins} label="Pénalité" value={`${v.penaltyAmount} €`} />
              <RecapRow
                icon={Clock}
                label="Durée minimum"
                value={v.minDurationMin === 0 ? "Aucun" : `${v.minDurationMin} min`}
              />
              <RecapRow
                icon={CalendarClock}
                label="Séances / jour"
                value={v.maxSessionsPerDay ? `${v.maxSessionsPerDay} max` : "Sans limite"}
              />
              <RecapRow
                icon={Tag}
                label="Activités"
                value={
                  v.acceptedActivities.length > 0 ? `${v.acceptedActivities.length} choisies` : "—"
                }
              />
              <RecapRow
                icon={Upload}
                label="Publication"
                value={v.publicationDeadline === "same_day" ? "Le jour même" : "Jusqu'à dimanche"}
                last
              />
            </RecapCard>
          </Reveal>

          {/* Accept */}
          <Reveal delay={440}>
            <Controller
              control={control}
              name="acceptRules"
              render={({ field: { onChange, value } }) => (
                <CheckCard checked={value} onToggle={() => onChange(!value)}>
                  <Text className="font-body text-[12.5px] leading-5 text-cream-dim">
                    Je comprends que ces règles seront{" "}
                    <Text className="font-body-semibold text-cream">figées</Text> au lancement du
                    défi.
                  </Text>
                </CheckCard>
              )}
            />
          </Reveal>

          {createGroup.isError ? (
            <View className="flex-row items-center gap-2 rounded-input border border-red/30 bg-red-soft px-3.5 py-3">
              <AlertCircle size={18} color={colors.red} />
              <Text className="flex-1 font-body-medium text-[13px] text-red">
                {mapCreateError(createGroup.error.message)}
              </Text>
            </View>
          ) : null}

          <Reveal delay={470} className="mt-1 gap-2.5">
            <GradientButton
              icon={Plus}
              onPress={handleSubmit(onSubmit)}
              loading={createGroup.isPending}
              disabled={!isValid}
            >
              Créer le défi
            </GradientButton>
            <Text className="text-center font-body text-[11px] text-cream-dim">
              Tu pourras inviter tes amis juste après.
            </Text>
          </Reveal>
        </ScrollView>
      </ScreenContainer>
    </View>
  );
}
