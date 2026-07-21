import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { AtSign, ChevronLeft, Palette, User, UserRound } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { AvatarPicker, type AvatarSelection } from "@/components/profile/AvatarPicker";
import { Avatar } from "@/components/ui/Avatar";
import { GradientButton } from "@/components/ui/GradientButton";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { TextField } from "@/components/ui/TextField";
import { AVATAR_COLORS } from "@/constants/avatars";
import { colors } from "@/constants/colors";
import { displayName, fallbackColor } from "@/features/auth/avatar";
import { useUpdateProfile } from "@/features/auth/profile-mutations";
import { completeProfileSchema, type CompleteProfileInput } from "@/features/auth/profile-schemas";
import { useProfile } from "@/hooks/useProfile";
import { useCurrentUser } from "@/lib/auth-store";

/**
 * Modification du profil — identité + avatar.
 *
 * Écran séparé de l'onglet Profil (qui est en lecture seule, comme la maquette) :
 * on n'édite pas par accident en scrollant sa fiche.
 */
export default function ProfileEditScreen() {
  const router = useRouter();
  const user = useCurrentUser();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useFeedback();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [avatar, setAvatar] = useState<AvatarSelection | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<CompleteProfileInput>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: { firstName: "", lastName: "", username: "" },
  });

  useEffect(() => {
    if (!profile) return;
    reset({
      firstName: profile.first_name ?? "",
      lastName: profile.last_name ?? "",
      username: profile.username ?? "",
    });
  }, [profile, reset]);

  const firstNameValue = watch("firstName");

  // État affiché = brouillon du sélecteur s'il y en a un, sinon ce qui est en base.
  const savedColor = profile?.avatar_color ?? fallbackColor(profile?.id ?? user?.id);
  const color = avatar?.color ?? savedColor;
  const icon = avatar ? avatar.icon : profile?.avatar_icon ?? null;
  const imageUri = avatar
    ? avatar.photo?.uri ?? avatar.generatedUrl
    : profile?.avatar_url ?? null;

  const onSave = (data: CompleteProfileInput) => {
    updateProfile.mutate(
      {
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        avatarBase64: avatar?.photo?.base64 ?? null,
        avatarMimeType: avatar?.photo?.mime ?? null,
        generatedAvatarUrl: avatar?.generatedUrl ?? null,
        avatarColor: color,
        avatarIcon: icon,
        clearAvatarImage: avatar?.clearImage ?? false,
        clearAvatarIcon: icon === null,
      },
      {
        onSuccess: () => {
          setAvatar(null);
          toast("Profil mis à jour", "success");
          router.back();
        },
        onError: (e) => toast(e.message, "error"),
      }
    );
  };

  const canSave = isDirty || avatar !== null;

  return (
    <ScreenContainer padded={false} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        {/* Entête collant : on doit toujours pouvoir revenir en arrière. */}
        <View
          className="flex-row items-center gap-3 px-[18px] pb-3 pt-1"
          style={{ backgroundColor: colors.ink }}
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityLabel="Retour"
            className="h-10 w-10 items-center justify-center rounded-chip active:opacity-70"
          >
            <ChevronLeft size={24} color={colors.cream} strokeWidth={2.2} />
          </Pressable>
          <Text className="font-display text-[20px] tracking-tighter text-cream">
            Modifier le profil
          </Text>
        </View>

        <ScrollView
          contentContainerClassName="px-[18px] pb-12"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Reveal delay={20} className="items-center py-4">
            <Pressable onPress={() => setPickerOpen(true)} className="items-center" hitSlop={6}>
              <View style={{ width: 96, height: 96 }}>
                <Avatar
                  uri={imageUri}
                  color={color}
                  icon={imageUri ? null : icon}
                  name={displayName(profile ?? {}) || firstNameValue}
                  size={96}
                />
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: colors.coral,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 3,
                    borderColor: colors.ink,
                  }}
                >
                  <Palette size={14} color={colors.onCoral} strokeWidth={2.6} />
                </View>
              </View>
              <Text className="mt-2.5 font-body-medium text-[12.5px] text-cream-dim">
                Couleur, icône, avatar rigolo ou photo
              </Text>
            </Pressable>
          </Reveal>

          <Reveal delay={60} className="gap-[18px]">
            <Controller
              control={control}
              name="firstName"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Prénom"
                  icon={User}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="words"
                  error={errors.firstName?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="lastName"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Nom (optionnel)"
                  icon={UserRound}
                  value={value ?? ""}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="words"
                  error={errors.lastName?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="username"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Pseudo"
                  icon={AtSign}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="none"
                  error={errors.username?.message}
                />
              )}
            />

            <View>
              <Text className="mb-2 font-body-semibold text-[13px] text-cream-dim">
                Adresse e-mail
              </Text>
              <View
                className="min-h-[52px] justify-center rounded-input border px-4"
                style={{ backgroundColor: colors.surface, borderColor: colors.line }}
              >
                <Text className="font-body text-[14px] text-cream-dim">{user?.email ?? "—"}</Text>
              </View>
              <Text className="mt-1.5 font-body text-[11px] text-cream-dim">
                L'e-mail ne peut pas être modifié.
              </Text>
            </View>
          </Reveal>

          <View className="mt-7">
            <GradientButton
              onPress={handleSubmit(onSave)}
              loading={updateProfile.isPending}
              disabled={!canSave}
            >
              Enregistrer
            </GradientButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AvatarPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={setAvatar}
        value={{
          color: color ?? AVATAR_COLORS[0],
          icon,
          url: avatar ? avatar.generatedUrl : profile?.avatar_url,
          photo: avatar?.photo ?? null,
          name: displayName(profile ?? {}) || firstNameValue,
          seed: profile?.username ?? profile?.id ?? "sportmotiv",
        }}
      />
    </ScreenContainer>
  );
}
