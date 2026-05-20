import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { Camera, ImageIcon } from "lucide-react-native";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { StravaProofPicker } from "@/components/sessions/StravaProofPicker";
import { Button } from "@/components/ui/Button";
import { Chip, ChipGroup } from "@/components/ui/Chip";
import { DateField } from "@/components/ui/DateField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Stepper } from "@/components/ui/Stepper";
import { TextField } from "@/components/ui/TextField";
import { ACTIVITY_OPTIONS } from "@/constants/activities";
import { useDeclareSession } from "@/features/sessions/mutations";
import { mapSessionError } from "@/features/sessions/proof";
import { buildDeclareSessionSchema, type DeclareSessionInput } from "@/features/sessions/schemas";
import {
  stravaDurationToMinutes,
  stravaTypeToActivityId,
  toStravaProofData,
  type StravaActivity,
} from "@/features/sessions/strava";
import { useGroup } from "@/features/groups/queries";
import { isStravaConfigured } from "@/lib/strava";
import type { Json } from "@/types/database.types";

type CapturedPhoto = { uri: string; base64: string; mime: string };

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{children}</Text>
  );
}

export default function DeclareSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: group, isLoading } = useGroup(id);
  const declare = useDeclareSession();
  const { toast } = useFeedback();

  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [strava, setStrava] = useState<{ id: string; data: Json } | null>(null);

  const acceptedActivities = useMemo(
    () => (Array.isArray(group?.accepted_activities) ? (group!.accepted_activities as string[]) : []),
    [group]
  );
  const minDuration = group?.min_duration_min ?? 30;

  const schema = useMemo(
    () => buildDeclareSessionSchema({ minDuration, acceptedActivities }),
    [minDuration, acceptedActivities]
  );

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DeclareSessionInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      activityType: "",
      durationMin: minDuration,
      performedAt: new Date(),
      comment: "",
      proofType: "photo",
    },
  });

  const proofType = watch("proofType");

  if (isLoading || !group) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  const capturePhoto = async (fromCamera: boolean) => {
    const picker = fromCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        toast("Autorise l'accès à la caméra pour prendre une photo.", "error");
        return;
      }
    }
    const result = await picker({
      mediaTypes: ["images"],
      quality: 0.6,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    const asset = result.assets[0];
    setPhoto({ uri: asset.uri, base64: asset.base64!, mime: asset.mimeType ?? "image/jpeg" });
    setValue("photoUri", asset.uri, { shouldValidate: true });

    // Géoloc best-effort (anti-fraude) — peut échouer sur émulateur, on n'en fait pas un bloquant.
    try {
      const locPerm = await Location.requestForegroundPermissionsAsync();
      if (locPerm.granted) {
        const pos = await Location.getCurrentPositionAsync({});
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setValue("latitude", pos.coords.latitude);
        setValue("longitude", pos.coords.longitude);
      }
    } catch {
      // ignore
    }
  };

  const onSelectStrava = (activity: StravaActivity) => {
    const data = toStravaProofData(activity) as unknown as Json;
    setStrava({ id: String(activity.id), data });
    setValue("stravaActivityId", String(activity.id), { shouldValidate: true });
    setValue("stravaData", data);
    // Pré-remplit l'activité et la durée à partir de Strava
    const mappedActivity = stravaTypeToActivityId(activity.sport_type ?? activity.type);
    if (acceptedActivities.includes(mappedActivity)) {
      setValue("activityType", mappedActivity, { shouldValidate: true });
    }
    setValue("durationMin", Math.max(minDuration, stravaDurationToMinutes(activity.moving_time)), {
      shouldValidate: true,
    });
  };

  const onSubmit = (data: DeclareSessionInput) => {
    declare.mutate(
      {
        groupId: id!,
        activityType: data.activityType,
        durationMin: data.durationMin,
        performedAt: data.performedAt,
        comment: data.comment,
        proofType: data.proofType,
        photoBase64: photo?.base64 ?? null,
        photoMime: photo?.mime ?? null,
        latitude: geo?.lat ?? null,
        longitude: geo?.lng ?? null,
        capturedAt: photo ? new Date().toISOString() : null,
        externalUrl: data.externalUrl ?? null,
        externalDescription: data.externalDescription ?? null,
        stravaActivityId: strava?.id ?? null,
        stravaData: strava?.data ?? null,
      },
      {
        onSuccess: () => {
          toast("Séance publiée", "success");
          if (router.canGoBack()) router.back();
          else router.replace({ pathname: "/group/[id]/sessions", params: { id: id! } } as never);
        },
        onError: (e) => toast(mapSessionError(e.message), "error"),
      }
    );
  };

  const proofOptions = [
    { value: "photo" as const, label: "Photo" },
    ...(isStravaConfigured ? [{ value: "strava" as const, label: "Strava" }] : []),
    { value: "external_link" as const, label: "Lien" },
  ];

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-neutral-900"
      contentContainerClassName="gap-6 p-6 pb-12"
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-2">
        <FieldLabel>Type d'activité</FieldLabel>
        <Controller
          control={control}
          name="activityType"
          render={({ field: { onChange, value } }) => (
            <ChipGroup>
              {ACTIVITY_OPTIONS.filter((a) => acceptedActivities.includes(a.id)).map((activity) => (
                <Chip
                  key={activity.id}
                  label={activity.label}
                  icon={activity.icon}
                  selected={value === activity.id}
                  onPress={() => onChange(activity.id)}
                />
              ))}
            </ChipGroup>
          )}
        />
        {errors.activityType ? (
          <Text className="text-xs text-red-500">{errors.activityType.message}</Text>
        ) : null}
      </View>

      <View className="flex-row items-center justify-between">
        <FieldLabel>Durée (min. {minDuration} min)</FieldLabel>
        <Controller
          control={control}
          name="durationMin"
          render={({ field: { onChange, value } }) => (
            <Stepper value={value} onChange={onChange} min={minDuration} max={600} step={5} suffix="min" />
          )}
        />
      </View>
      {errors.durationMin ? (
        <Text className="-mt-4 text-xs text-red-500">{errors.durationMin.message}</Text>
      ) : null}

      <Controller
        control={control}
        name="performedAt"
        render={({ field: { onChange, value } }) => (
          <DateField
            label="Date de la séance"
            value={value}
            onChange={onChange}
            maximumDate={new Date()}
            error={errors.performedAt?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="comment"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Commentaire (optionnel)"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="Petite sortie tranquille"
            multiline
            error={errors.comment?.message}
          />
        )}
      />

      <View className="gap-3">
        <FieldLabel>Preuve</FieldLabel>
        <Controller
          control={control}
          name="proofType"
          render={({ field: { onChange, value } }) => (
            <SegmentedControl options={proofOptions} value={value} onChange={onChange} />
          )}
        />

        {proofType === "photo" ? (
          <PhotoCapture
            photo={photo}
            geo={geo}
            onCamera={() => capturePhoto(true)}
            onGallery={() => capturePhoto(false)}
            error={errors.photoUri?.message}
          />
        ) : null}

        {proofType === "external_link" ? (
          <View className="gap-3">
            <Controller
              control={control}
              name="externalUrl"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Lien de l'activité"
                  value={value ?? ""}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="https://..."
                  autoCapitalize="none"
                  error={errors.externalUrl?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="externalDescription"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Description"
                  value={value ?? ""}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="Décris ta séance"
                  multiline
                  error={errors.externalDescription?.message}
                />
              )}
            />
            <PhotoCapture
              photo={photo}
              geo={geo}
              label="Capture d'écran obligatoire"
              onCamera={() => capturePhoto(true)}
              onGallery={() => capturePhoto(false)}
              error={errors.photoUri?.message}
            />
          </View>
        ) : null}

        {proofType === "strava" ? (
          <View className="gap-2">
            <StravaProofPicker selectedId={strava?.id ?? null} onSelect={onSelectStrava} />
            {errors.stravaActivityId ? (
              <Text className="text-xs text-red-500">{errors.stravaActivityId.message}</Text>
            ) : null}
          </View>
        ) : null}
      </View>

      <Button onPress={handleSubmit(onSubmit)} loading={declare.isPending}>
        Publier la séance
      </Button>
    </ScrollView>
  );
}

function PhotoCapture({
  photo,
  geo,
  label,
  onCamera,
  onGallery,
  error,
}: {
  photo: CapturedPhoto | null;
  geo: { lat: number; lng: number } | null;
  label?: string;
  onCamera: () => void;
  onGallery: () => void;
  error?: string;
}) {
  return (
    <View className="gap-2">
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      {photo ? (
        <Image source={{ uri: photo.uri }} className="h-48 w-full rounded-xl" resizeMode="cover" />
      ) : null}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button variant="secondary" onPress={onCamera}>
            {photo ? "Reprendre" : "Prendre une photo"}
          </Button>
        </View>
        <Pressable
          onPress={onGallery}
          className="items-center justify-center rounded-xl border border-neutral-200 px-4 dark:border-neutral-700"
        >
          <ImageIcon size={20} color="#94a3b8" />
        </Pressable>
      </View>
      <View className="flex-row items-center gap-2">
        <Camera size={14} color="#94a3b8" />
        <Text className="text-xs text-neutral-400">
          {geo
            ? `Position enregistrée (${geo.lat.toFixed(3)}, ${geo.lng.toFixed(3)})`
            : "Position non disponible (normal sur émulateur)"}
        </Text>
      </View>
      {error ? <Text className="text-xs text-red-500">{error}</Text> : null}
    </View>
  );
}
