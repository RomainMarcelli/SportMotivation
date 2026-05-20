import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Check } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { Chip, ChipGroup } from "@/components/ui/Chip";
import { DateField } from "@/components/ui/DateField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Stepper } from "@/components/ui/Stepper";
import { TextField } from "@/components/ui/TextField";
import { ACTIVITY_OPTIONS } from "@/constants/activities";
import { useCreateGroup } from "@/features/groups/mutations";
import {
  createGroupDefaults,
  createGroupFormSchema,
  type CreateGroupFormInput,
} from "@/features/groups/schemas";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {title}
      </Text>
      {children}
    </View>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{children}</Text>
  );
}

export default function CreateGroupScreen() {
  const router = useRouter();
  const createGroup = useCreateGroup();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateGroupFormInput>({
    resolver: zodResolver(createGroupFormSchema),
    defaultValues: createGroupDefaults,
  });

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
        weeklyTarget: data.weeklyTarget,
      },
      {
        onSuccess: (group) => {
          router.replace({ pathname: "/group/[id]", params: { id: group.id } } as never);
        },
        onError: (error) => {
          Alert.alert("Création impossible", error.message);
        },
      }
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-neutral-900"
      contentContainerClassName="gap-7 p-6 pb-12"
      keyboardShouldPersistTaps="handled"
    >
      <Section title="Infos du groupe">
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Nom du groupe"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Les Sportifs du dimanche"
              error={errors.name?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Description (optionnel)"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Notre défi de l'été"
              multiline
              error={errors.description?.message}
            />
          )}
        />
      </Section>

      <Section title="Durée du défi">
        <View className="flex-row gap-3">
          <Controller
            control={control}
            name="challengeStart"
            render={({ field: { onChange, value } }) => (
              <DateField
                label="Début"
                value={value}
                onChange={onChange}
                minimumDate={new Date()}
                error={errors.challengeStart?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="challengeEnd"
            render={({ field: { onChange, value } }) => (
              <DateField
                label="Fin"
                value={value}
                onChange={onChange}
                minimumDate={new Date()}
                error={errors.challengeEnd?.message}
              />
            )}
          />
        </View>
      </Section>

      <Section title="Règles du défi">
        <View className="flex-row items-center justify-between">
          <FieldLabel>Pénalité par séance manquée</FieldLabel>
          <Controller
            control={control}
            name="penaltyAmount"
            render={({ field: { onChange, value } }) => (
              <Stepper value={value} onChange={onChange} min={0} max={100} step={1} suffix="€" />
            )}
          />
        </View>

        <View className="gap-2">
          <FieldLabel>Activités acceptées</FieldLabel>
          <Controller
            control={control}
            name="acceptedActivities"
            render={({ field: { onChange, value } }) => (
              <ChipGroup>
                {ACTIVITY_OPTIONS.map((activity) => {
                  const selected = value.includes(activity.id);
                  return (
                    <Chip
                      key={activity.id}
                      label={activity.label}
                      icon={activity.icon}
                      selected={selected}
                      onPress={() =>
                        onChange(
                          selected
                            ? value.filter((id) => id !== activity.id)
                            : [...value, activity.id]
                        )
                      }
                    />
                  );
                })}
              </ChipGroup>
            )}
          />
          {errors.acceptedActivities ? (
            <Text className="text-xs text-red-500">{errors.acceptedActivities.message}</Text>
          ) : null}
        </View>

        <View className="flex-row items-center justify-between">
          <FieldLabel>Durée min. d'une séance</FieldLabel>
          <Controller
            control={control}
            name="minDurationMin"
            render={({ field: { onChange, value } }) => (
              <Stepper value={value} onChange={onChange} min={5} max={180} step={5} suffix="min" />
            )}
          />
        </View>

        <View className="gap-2">
          <FieldLabel>Délai de publication d'une séance</FieldLabel>
          <Controller
            control={control}
            name="publicationDeadline"
            render={({ field: { onChange, value } }) => (
              <SegmentedControl
                value={value}
                onChange={onChange}
                options={[
                  { value: "same_day", label: "Le jour même" },
                  { value: "end_of_week", label: "Jusqu'à dimanche" },
                ]}
              />
            )}
          />
        </View>

        <View className="gap-2">
          <FieldLabel>Délai de vote</FieldLabel>
          <Controller
            control={control}
            name="voteDeadline"
            render={({ field: { onChange, value } }) => (
              <SegmentedControl
                value={value}
                onChange={onChange}
                options={[
                  { value: "same_day", label: "Le jour même" },
                  { value: "end_of_week", label: "Jusqu'à dimanche" },
                ]}
              />
            )}
          />
        </View>

        <View className="flex-row items-center justify-between">
          <FieldLabel>Seuil de blâmes avant pénalité</FieldLabel>
          <Controller
            control={control}
            name="blameThreshold"
            render={({ field: { onChange, value } }) => (
              <Stepper value={value} onChange={onChange} min={1} max={10} step={1} />
            )}
          />
        </View>
      </Section>

      <Section title="Ton engagement">
        <View className="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
          <Text className="text-sm text-amber-800 dark:text-amber-200">
            ⚠ Ton objectif hebdomadaire sera <Text className="font-bold">verrouillé</Text> pour
            toute la durée du défi. Impossible de le modifier ensuite.
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <FieldLabel>Séances par semaine</FieldLabel>
          <Controller
            control={control}
            name="weeklyTarget"
            render={({ field: { onChange, value } }) => (
              <Stepper value={value} onChange={onChange} min={1} max={14} step={1} />
            )}
          />
        </View>
      </Section>

      <Controller
        control={control}
        name="acceptRules"
        render={({ field: { onChange, value } }) => (
          <Pressable
            onPress={() => onChange(!value)}
            className="flex-row items-start gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700"
          >
            <View
              className={`mt-0.5 h-6 w-6 items-center justify-center rounded-md border-2 ${
                value
                  ? "border-primary-500 bg-primary-500"
                  : "border-neutral-300 dark:border-neutral-600"
              }`}
            >
              {value ? <Check size={16} color="#ffffff" /> : null}
            </View>
            <Text className="flex-1 text-sm text-neutral-700 dark:text-neutral-300">
              J'ai lu et j'accepte les règles du défi.
            </Text>
          </Pressable>
        )}
      />
      {errors.acceptRules ? (
        <Text className="-mt-4 text-xs text-red-500">{errors.acceptRules.message}</Text>
      ) : null}

      <Button onPress={handleSubmit(onSubmit)} loading={createGroup.isPending}>
        Créer le groupe
      </Button>
    </ScrollView>
  );
}
