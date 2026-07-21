import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { AlertCircle, AtSign, Lock, Mail, Palette, ShieldCheck, User } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { AvatarPicker, type AvatarSelection } from "@/components/profile/AvatarPicker";
import { Avatar } from "@/components/ui/Avatar";
import { BrandMark } from "@/components/ui/BrandMark";
import { GradientButton } from "@/components/ui/GradientButton";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { TextField } from "@/components/ui/TextField";
import { AVATAR_COLORS } from "@/constants/avatars";
import { colors } from "@/constants/colors";
import { isGoogleConfigured } from "@/features/auth/google";
import { useSignUp } from "@/features/auth/mutations";
import { useUpdateProfile } from "@/features/auth/profile-mutations";
import { signUpSchema, type SignUpInput } from "@/features/auth/schemas";

export default function SignUpScreen() {
  const router = useRouter();
  const signUp = useSignUp();
  const updateProfile = useUpdateProfile();
  const [avatar, setAvatar] = useState<AvatarSelection>({
    color: AVATAR_COLORS[0],
    icon: null,
    photo: null,
    generatedUrl: null,
    clearImage: true,
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pwdFocused, setPwdFocused] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors, isValid },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    mode: "onChange",
    defaultValues: { firstName: "", username: "", email: "", password: "", confirmPassword: "" },
  });

  const passwordValue = watch("password");
  const firstNameValue = watch("firstName");
  const usernameValue = watch("username");
  const submitting = signUp.isPending || updateProfile.isPending;

  const avatarPreviewUri = avatar.photo?.uri ?? avatar.generatedUrl;

  const handleError = (e: unknown) => {
    const err = e as { code?: string; message?: string };
    const msg = err.message ?? "";
    if (/already registered|already.*exist|user.*exist/i.test(msg)) {
      setError("email", { message: "Cet e-mail est déjà utilisé." });
    } else if (
      err.code === "23505" ||
      /username|pseudo|duplicate|unique|database error saving new user/i.test(msg)
    ) {
      setError("username", { message: "Ce pseudo est déjà pris." });
    } else if (msg) {
      // On affiche le VRAI message : c'est ici que se cachait « SQL non exécuté »,
      // masqué jusqu'ici derrière un « une erreur est survenue » inutile.
      setSubmitError(msg);
    } else {
      setSubmitError("Une erreur est survenue. Réessaie.");
    }
  };

  const onSubmit = async (data: SignUpInput) => {
    setSubmitError(null);
    try {
      const result = await signUp.mutateAsync(data);

      if (result.session) {
        // Confirmation d'e-mail OFF : session active → on écrit le profil + l'avatar.
        await updateProfile.mutateAsync({
          firstName: data.firstName,
          username: data.username,
          avatarBase64: avatar.photo?.base64 ?? null,
          avatarMimeType: avatar.photo?.mime ?? null,
          generatedAvatarUrl: avatar.generatedUrl,
          avatarColor: avatar.color,
          avatarIcon: avatar.icon,
          clearAvatarIcon: avatar.icon === null,
        });
        // Pas de navigation explicite : le root layout bascule sur (tabs) dès que la session est active.
      } else {
        // Confirmation ON (plus tard) : pas de session. Métadonnées déjà envoyées via signUp.
        router.replace("/sign-in");
      }
    } catch (e) {
      handleError(e);
    }
  };

  const clearSubmitError = () => {
    if (submitError) setSubmitError(null);
  };

  return (
    <ScreenContainer transparent padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-[24px] py-8"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Reveal delay={0} className="mb-6 items-center">
            <BrandMark size={56} />
            <Text className="mt-4 text-center font-display text-[26px] tracking-tighter text-cream">
              Crée ton compte
            </Text>
            <Text className="mt-2 text-center font-body text-[13.5px] text-cream-dim">
              Rejoins tes amis et lance ton premier défi.
            </Text>
          </Reveal>

          {/* Avatar : couleur, icône, avatar rigolo ou photo */}
          <Reveal delay={60} className="mb-6 items-center">
            <Pressable onPress={() => setPickerOpen(true)} className="items-center" hitSlop={6}>
              <View style={{ width: 88, height: 88 }}>
                <Avatar
                  uri={avatarPreviewUri}
                  color={avatar.color}
                  icon={avatarPreviewUri ? null : avatar.icon}
                  name={firstNameValue}
                  size={88}
                />
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: colors.coral,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 3,
                    borderColor: colors.ink,
                  }}
                >
                  <Palette size={13} color={colors.onCoral} strokeWidth={2.6} />
                </View>
              </View>
              <Text className="mt-2 font-body-medium text-[12px] text-cream-dim">
                Personnaliser mon avatar
              </Text>
            </Pressable>
          </Reveal>

          <View className="gap-[18px]">
            <Reveal delay={100}>
              <Controller
                control={control}
                name="firstName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Prénom"
                    icon={User}
                    value={value}
                    onBlur={onBlur}
                    onChangeText={(t) => {
                      onChange(t);
                      clearSubmitError();
                    }}
                    placeholder="Romain"
                    autoCapitalize="words"
                    autoComplete="given-name"
                    error={errors.firstName?.message}
                  />
                )}
              />
            </Reveal>

            <Reveal delay={140}>
              <Controller
                control={control}
                name="username"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Pseudo"
                    icon={AtSign}
                    value={value}
                    onBlur={onBlur}
                    onChangeText={(t) => {
                      onChange(t);
                      clearErrors("username");
                      clearSubmitError();
                    }}
                    placeholder="romz"
                    autoCapitalize="none"
                    autoComplete="username"
                    error={errors.username?.message}
                  />
                )}
              />
            </Reveal>

            <Reveal delay={180}>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Adresse e-mail"
                    icon={Mail}
                    value={value}
                    onBlur={onBlur}
                    onChangeText={(t) => {
                      onChange(t);
                      clearErrors("email");
                      clearSubmitError();
                    }}
                    placeholder="ton@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    error={errors.email?.message}
                  />
                )}
              />
            </Reveal>

            <Reveal delay={220}>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Mot de passe"
                    icon={Lock}
                    value={value}
                    onFocus={() => setPwdFocused(true)}
                    onBlur={() => {
                      setPwdFocused(false);
                      onBlur();
                    }}
                    onChangeText={(t) => {
                      onChange(t);
                      clearSubmitError();
                    }}
                    placeholder="8 caractères minimum"
                    secureTextEntry
                    noCopy
                    autoComplete="new-password"
                  />
                )}
              />
              <PasswordStrength
                password={passwordValue}
                visible={pwdFocused || passwordValue.length > 0}
              />
            </Reveal>

            <Reveal delay={260}>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Confirmer le mot de passe"
                    icon={ShieldCheck}
                    value={value}
                    onBlur={onBlur}
                    onChangeText={(t) => {
                      onChange(t);
                      clearSubmitError();
                    }}
                    placeholder="Saisis-le à nouveau"
                    secureTextEntry
                    noPaste
                    autoComplete="new-password"
                    error={errors.confirmPassword?.message}
                  />
                )}
              />
            </Reveal>
          </View>

          <Reveal delay={300} className="mt-7 gap-3.5">
            {submitError ? (
              <View className="flex-row items-center gap-2 rounded-input border border-red/30 bg-red-soft px-3.5 py-3">
                <AlertCircle size={18} color={colors.red} />
                <Text className="flex-1 font-body-medium text-[13px] text-red">{submitError}</Text>
              </View>
            ) : null}

            <GradientButton
              onPress={handleSubmit(onSubmit)}
              loading={submitting}
              disabled={!isValid}
            >
              Créer mon compte
            </GradientButton>

            {isGoogleConfigured ? (
              <>
                <View className="flex-row items-center gap-3">
                  <View className="h-px flex-1 bg-line" />
                  <Text className="font-body text-[12px] text-cream-dim">ou</Text>
                  <View className="h-px flex-1 bg-line" />
                </View>
                <GoogleSignInButton />
              </>
            ) : null}

            <Text className="mt-1 px-2 text-center font-body text-[11px] leading-4 text-cream-dim">
              En créant un compte, tu acceptes nos Conditions d'utilisation et notre Politique de
              confidentialité.
            </Text>
          </Reveal>
        </ScrollView>

        <View className="items-center px-[24px] pb-4 pt-2">
          <Pressable onPress={() => router.push("/sign-in")} hitSlop={8}>
            <Text className="font-body text-[13px] text-cream-dim">
              Déjà un compte ? <Text className="font-body-bold text-coral">Se connecter</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <AvatarPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={setAvatar}
        value={{
          color: avatar.color,
          icon: avatar.icon,
          url: avatar.generatedUrl,
          photo: avatar.photo,
          name: firstNameValue,
          seed: usernameValue || firstNameValue,
        }}
      />
    </ScreenContainer>
  );
}
