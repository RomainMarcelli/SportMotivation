import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertCircle,
  BellRing,
  Camera,
  Check,
  Image as ImageIcon,
  Info,
  Link2,
  MapPin,
  Pencil,
  Plus,
  TriangleAlert,
  Users,
  X,
  Zap,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { StravaProofPicker } from "@/components/sessions/StravaProofPicker";
import { AppBackground } from "@/components/ui/AppBackground";
import { Chip, ChipGroup } from "@/components/ui/Chip";
import { DateField } from "@/components/ui/DateField";
import { GradientButton } from "@/components/ui/GradientButton";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Stepper } from "@/components/ui/Stepper";
import { TextField } from "@/components/ui/TextField";
import { colors } from "@/constants/colors";
import { getActivityLabel } from "@/constants/activities";
import { useGroup } from "@/features/groups/queries";
import { checkProofDate, declarableDateRange, parseExifDate } from "@/features/sessions/dates";
import { useDeclareSession } from "@/features/sessions/mutations";
import { mapSessionError } from "@/features/sessions/proof";
import { buildDeclareSessionSchema, type DeclareSessionInput } from "@/features/sessions/schemas";
import {
  stravaActivityDate,
  stravaDurationToMinutes,
  stravaTypeToActivityId,
  toStravaProofData,
  type StravaActivity,
} from "@/features/sessions/strava";
import { getSportIcon } from "@/lib/sports";
import { isStravaConfigured } from "@/lib/strava";
import type { Json } from "@/types/database.types";

type CapturedPhoto = { uri: string; base64: string; mime: string };
type Geo = { lat: number; lng: number } | null;

const DURATION_PRESETS = [15, 30, 45, 60];

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

export default function DeclareSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: group, isLoading } = useGroup(id);
  const declare = useDeclareSession();
  const { toast } = useFeedback();

  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [geo, setGeo] = useState<Geo>(null);
  const [strava, setStrava] = useState<{ id: string; data: Json } | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customDraft, setCustomDraft] = useState("");
  const [customActivities, setCustomActivities] = useState<string[]>([]);
  const [warnData, setWarnData] = useState<DeclareSessionInput | null>(null);

  const acceptedActivities = useMemo(
    () => (Array.isArray(group?.accepted_activities) ? (group!.accepted_activities as string[]) : []),
    [group]
  );
  const minDuration = group?.min_duration_min ?? 0;
  const { min: weekMin, max: weekMax } = useMemo(() => declarableDateRange(new Date()), []);

  const schema = useMemo(
    () => buildDeclareSessionSchema({ minDuration, acceptedActivities }),
    [minDuration, acceptedActivities]
  );

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors, isValid },
  } = useForm<DeclareSessionInput>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      activityType: "",
      durationMin: Math.max(minDuration, 30),
      performedAt: new Date(),
      comment: "",
      proofType: "photo",
      photoTakenAt: null,
      stravaActivityDate: null,
    },
  });

  const proofType = watch("proofType");

  if (isLoading || !group) {
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

  /** Caméra (live, pas de contrôle de date) ou galerie/web (contrôle date EXIF anti-fraude). */
  const capturePhoto = async (source: "camera" | "gallery") => {
    const useCamera = source === "camera" && Platform.OS !== "web";
    try {
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          toast("Autorise l'accès à la caméra pour prendre une photo.", "error");
          return;
        }
      }
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.6, base64: true })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.6,
            base64: true,
            exif: true,
          });
      if (result.canceled || !result.assets[0]?.base64) return;
      const asset = result.assets[0];

      if (!useCamera) {
        // Galerie / web : la date de la photo doit correspondre au jour déclaré.
        const takenAt = parseExifDate(asset.exif as Record<string, unknown> | undefined);
        const check = checkProofDate(takenAt, getValues("performedAt"));
        if (check.reason === "mismatch") {
          toast("Cette photo ne date pas du jour sélectionné.", "error");
          return;
        }
        if (check.reason === "missing") {
          toast(
            Platform.OS === "web"
              ? "Date de la photo non vérifiable ici — assure-toi qu'elle date du jour déclaré."
              : "Date de la photo introuvable — assure-toi qu'elle date du jour déclaré.",
            "info"
          );
        }
        setPhoto({ uri: asset.uri, base64: asset.base64!, mime: asset.mimeType ?? "image/jpeg" });
        setGeo(null);
        setValue("photoUri", asset.uri, { shouldValidate: true });
        setValue("photoTakenAt", takenAt ?? null, { shouldValidate: true });
        setValue("latitude", null);
        setValue("longitude", null);
        return;
      }

      // Caméra : preuve « live », géoloc best-effort (anti-fraude).
      setPhoto({ uri: asset.uri, base64: asset.base64!, mime: asset.mimeType ?? "image/jpeg" });
      setValue("photoUri", asset.uri, { shouldValidate: true });
      setValue("photoTakenAt", null, { shouldValidate: true });
      const locPerm = await Location.requestForegroundPermissionsAsync();
      if (locPerm.granted) {
        const pos = await Location.getCurrentPositionAsync({});
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setValue("latitude", pos.coords.latitude);
        setValue("longitude", pos.coords.longitude);
      }
    } catch {
      toast("Impossible d'ajouter la photo.", "error");
    }
  };

  const onSelectStrava = (activity: StravaActivity) => {
    const activityDate = stravaActivityDate(activity);
    const check = checkProofDate(activityDate, getValues("performedAt"));
    if (check.reason === "mismatch") {
      toast("Cette activité Strava ne date pas du jour sélectionné.", "error");
      return;
    }
    const data = toStravaProofData(activity) as unknown as Json;
    setStrava({ id: String(activity.id), data });
    setValue("stravaActivityId", String(activity.id), { shouldValidate: true });
    setValue("stravaData", data);
    setValue("stravaActivityDate", activityDate, { shouldValidate: true });
    const mappedName = getActivityLabel(stravaTypeToActivityId(activity.sport_type ?? activity.type));
    if (acceptedActivities.includes(mappedName)) {
      setValue("activityType", mappedName, { shouldValidate: true });
      setCustomMode(false);
    }
    setValue("durationMin", Math.max(minDuration, stravaDurationToMinutes(activity.moving_time)), {
      shouldValidate: true,
    });
  };

  const doDeclare = (data: DeclareSessionInput) => {
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
          else router.replace({ pathname: "/group/[id]", params: { id: id! } } as never);
        },
        onError: (e) => toast(mapSessionError(e.message), "error"),
      }
    );
  };

  // Avant d'envoyer : si l'activité n'est pas dans la liste du groupe → avertissement.
  const submit = handleSubmit((data) => {
    if (!acceptedActivities.includes(data.activityType)) {
      setWarnData(data);
      return;
    }
    doDeclare(data);
  });

  const proofOptions = [
    { value: "photo" as const, label: "Photo", icon: Camera },
    ...(isStravaConfigured ? [{ value: "strava" as const, label: "Strava", icon: Zap }] : []),
    { value: "external_link" as const, label: "Lien", icon: Link2 },
  ];

  const presets = DURATION_PRESETS.filter((p) => p >= minDuration);

  return (
    <View className="flex-1">
      <AppBackground />
      <ScreenContainer transparent padded={false} edges={[]}>
        <ScrollView
          contentContainerClassName="gap-5 px-[18px] pt-2"
          contentContainerStyle={{ paddingBottom: 116 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Contexte groupe */}
          <View className="flex-row items-center gap-2">
            <View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: colors.amber }} />
            <Text className="font-body text-[12px] text-cream-dim">{group.name}</Text>
          </View>

          {/* Activité */}
          <Reveal delay={40}>
            <FieldLabel>Activité</FieldLabel>
            <Controller
              control={control}
              name="activityType"
              render={({ field: { onChange, value } }) => {
                const validateCustom = () => {
                  const name = customDraft.trim();
                  if (!name) return;
                  // On ajoute le sport saisi à la liste des chips (s'il n'y est pas déjà).
                  if (!acceptedActivities.includes(name) && !customActivities.includes(name)) {
                    setCustomActivities((prev) => [...prev, name]);
                  }
                  onChange(name); // sélectionné
                  setCustomMode(false);
                  setCustomDraft("");
                };

                return (
                  <>
                    <ChipGroup>
                      {[...acceptedActivities, ...customActivities].map((name) => (
                        <Chip
                          key={name}
                          label={name}
                          icon={getSportIcon(name)}
                          selected={!customMode && value === name}
                          onPress={() => {
                            setCustomMode(false);
                            onChange(name);
                          }}
                        />
                      ))}
                      <Chip
                        label="Autre"
                        icon={Plus}
                        selected={customMode}
                        onPress={() => {
                          setCustomMode(true);
                          setCustomDraft("");
                          // Rien n'est sélectionné tant que la saisie n'est pas validée.
                          onChange("");
                        }}
                      />
                    </ChipGroup>

                    {customMode ? (
                      <View className="mt-2.5 flex-row items-center gap-2">
                        <View className="flex-1">
                          <TextField
                            icon={getSportIcon(customDraft || "autre")}
                            value={customDraft}
                            onChangeText={setCustomDraft}
                            placeholder="Précise ton sport (ex. Boxe Thaï)"
                            autoCapitalize="sentences"
                            returnKeyType="done"
                            onSubmitEditing={validateCustom}
                          />
                        </View>
                        <Pressable
                          onPress={validateCustom}
                          disabled={customDraft.trim().length === 0}
                          className="h-[52px] w-[52px] items-center justify-center rounded-[14px] active:opacity-80"
                          style={{
                            backgroundColor:
                              customDraft.trim().length === 0 ? colors.surface2 : colors.coral,
                          }}
                        >
                          <Check
                            size={22}
                            color={
                              customDraft.trim().length === 0 ? colors.creamDim : colors.onCoral
                            }
                            strokeWidth={2.6}
                          />
                        </Pressable>
                      </View>
                    ) : null}
                  </>
                );
              }}
            />
            <Hint>Activités autorisées par le groupe — « Autre » pour un sport non listé</Hint>
          </Reveal>

          {/* Durée */}
          <Reveal delay={100}>
            <FieldLabel>Durée</FieldLabel>
            <Controller
              control={control}
              name="durationMin"
              render={({ field: { onChange, value } }) => (
                <>
                  <Stepper
                    value={value}
                    onChange={onChange}
                    min={minDuration}
                    max={600}
                    step={5}
                    unit="minutes"
                  />
                  {presets.length > 0 ? (
                    <View className="mt-2.5 flex-row gap-2">
                      {presets.map((p) => {
                        const on = value === p;
                        return (
                          <Pressable
                            key={p}
                            onPress={() => onChange(p)}
                            className="flex-1 items-center rounded-xl border py-2.5 active:opacity-80"
                            style={
                              on
                                ? { backgroundColor: colors.coralSoft, borderColor: "transparent" }
                                : { backgroundColor: colors.surface, borderColor: colors.line }
                            }
                          >
                            <Text
                              className="font-body-semibold text-[12px]"
                              style={{ color: on ? colors.coral : colors.creamDim }}
                            >
                              {p}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </>
              )}
            />
            <Hint>{minDuration > 0 ? `Minimum ${minDuration} min pour ce groupe` : "Aucun minimum"}</Hint>
            {errors.durationMin ? (
              <Text className="mt-1.5 font-body text-[12px] text-red">
                {errors.durationMin.message}
              </Text>
            ) : null}
          </Reveal>

          {/* Date */}
          <Reveal delay={160}>
            <FieldLabel>Date</FieldLabel>
            <Controller
              control={control}
              name="performedAt"
              render={({ field: { onChange, value } }) => (
                <DateField
                  variant="card"
                  label="Date"
                  value={value}
                  onChange={onChange}
                  minimumDate={weekMin}
                  maximumDate={weekMax}
                  error={errors.performedAt?.message}
                />
              )}
            />
            <Hint>Uniquement cette semaine (lundi → aujourd'hui)</Hint>
          </Reveal>

          {/* Preuve */}
          <Reveal delay={220}>
            <FieldLabel>Preuve</FieldLabel>
            <Controller
              control={control}
              name="proofType"
              render={({ field: { onChange, value } }) => (
                <SegmentedControl options={proofOptions} value={value} onChange={onChange} />
              )}
            />

            <View className="mt-3.5">
              {proofType === "photo" ? (
                <PhotoCapture
                  photo={photo}
                  geo={geo}
                  onCapture={() => capturePhoto("camera")}
                  onGallery={() => capturePhoto("gallery")}
                  error={errors.photoUri?.message}
                />
              ) : null}

              {proofType === "external_link" ? (
                <View className="gap-2.5">
                  <Controller
                    control={control}
                    name="externalUrl"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextField
                        icon={Link2}
                        value={value ?? ""}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        placeholder="https://lien-vers-ta-séance"
                        autoCapitalize="none"
                        keyboardType="url"
                        error={errors.externalUrl?.message}
                      />
                    )}
                  />
                  <PhotoCapture
                    photo={photo}
                    geo={geo}
                    compact
                    onCapture={() => capturePhoto("camera")}
                    onGallery={() => capturePhoto("gallery")}
                    error={errors.photoUri?.message}
                  />
                  <Controller
                    control={control}
                    name="externalDescription"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextField
                        value={value ?? ""}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        placeholder="Décris ta séance"
                        multiline
                        error={errors.externalDescription?.message}
                      />
                    )}
                  />
                  <Hint>Capture d'écran obligatoire pour un lien externe</Hint>
                </View>
              ) : null}

              {proofType === "strava" ? (
                <View className="gap-2">
                  <StravaProofPicker selectedId={strava?.id ?? null} onSelect={onSelectStrava} />
                  {errors.stravaActivityId ? (
                    <Text className="font-body text-[12px] text-red">
                      {errors.stravaActivityId.message}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          </Reveal>

          {/* Commentaire */}
          <Reveal delay={300}>
            <FieldLabel>Commentaire (optionnel)</FieldLabel>
            <Controller
              control={control}
              name="comment"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="Un petit mot sur ta séance…"
                  multiline
                  error={errors.comment?.message}
                />
              )}
            />
          </Reveal>

          {declare.isError ? (
            <View className="flex-row items-center gap-2 rounded-input border border-red/30 bg-red-soft px-3.5 py-3">
              <AlertCircle size={18} color={colors.red} />
              <Text className="flex-1 font-body-medium text-[13px] text-red">
                {mapSessionError(declare.error.message)}
              </Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Footer (au-dessus de la tab bar fournie par le layout group) */}
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
            icon={Check}
            onPress={submit}
            loading={declare.isPending}
            disabled={!isValid}
          >
            Valider la séance
          </GradientButton>
          <View className="mt-2 flex-row items-center justify-center gap-1.5">
            <Users size={13} color={colors.creamDim} />
            <Text className="font-body text-[11px] text-cream-dim">Soumise au vote du groupe</Text>
          </View>
        </View>
      </ScreenContainer>

      <ActivityWarningModal
        visible={warnData !== null}
        activity={warnData?.activityType ?? ""}
        onContinue={() => {
          const data = warnData;
          setWarnData(null);
          if (data) doDeclare(data);
        }}
        onChange={() => setWarnData(null)}
        onNotifyAdmin={() => {
          setWarnData(null);
          // TODO Étape 11 (notifications) : envoyer une demande d'ajout d'activité à l'admin.
          toast("On préviendra l'admin d'ajouter cette activité (bientôt).", "info");
        }}
      />
    </View>
  );
}

/* ---------- Avertissement activité hors liste ---------- */

function ActivityWarningModal({
  visible,
  activity,
  onContinue,
  onChange,
  onNotifyAdmin,
}: {
  visible: boolean;
  activity: string;
  onContinue: () => void;
  onChange: () => void;
  onNotifyAdmin: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onChange}>
      <Pressable
        onPress={onChange}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderWidth: 1,
            borderColor: colors.line2,
            padding: 22,
            paddingBottom: 30,
            gap: 16,
          }}
        >
          <View className="flex-row items-center gap-3">
            <View
              className="h-11 w-11 items-center justify-center rounded-hero"
              style={{ backgroundColor: colors.amberSoft }}
            >
              <TriangleAlert size={22} color={colors.amber} />
            </View>
            <View className="flex-1">
              <Text className="font-display text-[17px] tracking-tight text-cream">
                Sport non listé
              </Text>
              <Text className="mt-0.5 font-body text-[12.5px] text-cream-dim">
                « {activity || "Ce sport"} » ne fait pas partie des activités du groupe.
              </Text>
            </View>
          </View>

          <View className="gap-2.5">
            <GradientButton icon={Check} onPress={onContinue}>
              Continuer quand même
            </GradientButton>

            <Pressable
              onPress={onChange}
              className="h-[50px] flex-row items-center justify-center gap-2 rounded-input border border-line-2 bg-surface-2 active:opacity-80"
            >
              <Pencil size={17} color={colors.cream} />
              <Text className="font-display text-[14px] text-cream">Changer d'activité</Text>
            </Pressable>

            <Pressable
              onPress={onNotifyAdmin}
              className="h-[50px] flex-row items-center justify-center gap-2 rounded-input active:opacity-70"
            >
              <BellRing size={16} color={colors.creamDim} />
              <Text className="font-body-semibold text-[13px] text-cream-dim">
                Prévenir l'admin de l'ajouter
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ---------- Capture photo ---------- */

function PhotoCapture({
  photo,
  geo,
  compact,
  onCapture,
  onGallery,
  error,
}: {
  photo: CapturedPhoto | null;
  geo: Geo;
  compact?: boolean;
  onCapture: () => void;
  onGallery: () => void;
  error?: string;
}) {
  const fileLabel = Platform.OS === "web" ? "Choisir un fichier" : "Choisir dans la galerie";
  const [zoom, setZoom] = useState(false);

  if (photo) {
    return (
      <View>
        <View className="overflow-hidden rounded-[18px] border border-line-2">
          <Pressable onPress={() => setZoom(true)} accessibilityLabel="Agrandir la photo">
            <Image
              source={{ uri: photo.uri }}
              style={{ height: compact ? 130 : 172, width: "100%" }}
            />
          </Pressable>
          {geo ? (
            <View
              className="absolute bottom-2.5 left-2.5 flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
              pointerEvents="none"
            >
              <MapPin size={12} color={colors.coral} />
              <Text className="font-body-medium text-[11px] text-cream">Position enregistrée</Text>
            </View>
          ) : null}
          <View className="flex-row items-center justify-between bg-surface px-3.5 py-3">
            <View className="flex-row items-center gap-1.5">
              <Check size={14} color={geo ? colors.mint : colors.creamDim} strokeWidth={2.6} />
              <Text
                className="font-body-medium text-[12px]"
                style={{ color: geo ? colors.mint : colors.creamDim }}
              >
                {geo ? "Position enregistrée" : "Photo ajoutée"}
              </Text>
            </View>
            <Pressable onPress={onCapture} hitSlop={6}>
              <Text className="font-body-bold text-[12.5px] text-coral">Reprendre</Text>
            </Pressable>
          </View>
        </View>
        {error ? <Text className="mt-1.5 font-body text-[12px] text-red">{error}</Text> : null}

        {/* Aperçu plein écran */}
        <Modal visible={zoom} transparent animationType="fade" onRequestClose={() => setZoom(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.94)" }}>
            <Image
              source={{ uri: photo.uri }}
              resizeMode="contain"
              style={{ flex: 1, width: "100%" }}
            />
            <Pressable
              onPress={() => setZoom(false)}
              accessibilityLabel="Fermer"
              style={{
                position: "absolute",
                top: 50,
                right: 20,
                height: 44,
                width: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 22,
                backgroundColor: "rgba(255,238,221,0.12)",
              }}
            >
              <X size={24} color={colors.cream} strokeWidth={2.4} />
            </Pressable>
          </View>
        </Modal>
      </View>
    );
  }

  if (compact) {
    return (
      <View>
        <Pressable
          onPress={onCapture}
          className="flex-row items-center justify-center gap-2 rounded-[14px] border border-dashed border-line-2 py-3.5 active:opacity-80"
          style={{ backgroundColor: "rgba(255,238,221,0.03)" }}
        >
          <ImageIcon size={18} color={colors.creamDim} />
          <Text className="font-body-semibold text-[13px] text-cream-dim">
            Ajouter une capture d'écran
          </Text>
        </Pressable>
        {error ? <Text className="mt-1.5 font-body text-[12px] text-red">{error}</Text> : null}
      </View>
    );
  }

  return (
    <View>
      {/* Grande zone = prise de photo en direct (caméra) */}
      <Pressable
        onPress={onCapture}
        className="items-center gap-3 rounded-[18px] border-[1.5px] border-dashed border-line-2 px-4 py-8 active:opacity-90"
      >
        <View
          className="h-[60px] w-[60px] items-center justify-center rounded-full"
          style={{ backgroundColor: colors.coral }}
        >
          <Camera size={27} color={colors.onCoral} strokeWidth={2.1} />
        </View>
        <Text className="font-display text-[15px] text-cream">Prendre une photo</Text>
        <Text className="font-body text-[11.5px] text-cream-dim">
          Appuie pour ouvrir l'appareil photo
        </Text>
      </Pressable>

      {/* Bouton DA = choisir un fichier / la galerie (vérif date EXIF) */}
      <Pressable
        onPress={onGallery}
        className="mt-2.5 h-[50px] flex-row items-center justify-center gap-2 rounded-input border border-line-2 bg-surface active:opacity-80"
      >
        <ImageIcon size={17} color={colors.cream} />
        <Text className="font-body-semibold text-[13.5px] text-cream">{fileLabel}</Text>
      </Pressable>

      {error ? <Text className="mt-1.5 font-body text-[12px] text-red">{error}</Text> : null}
    </View>
  );
}
