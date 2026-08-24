import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { AlertCircle, ChevronLeft, KeyRound, Lock, ShieldCheck } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { AppBackground } from "@/components/ui/AppBackground";
import { GradientButton } from "@/components/ui/GradientButton";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { TextField } from "@/components/ui/TextField";
import { colors } from "@/constants/colors";
import {
  mapPasswordError,
  passwordChangeSchema,
  useChangePassword,
  type PasswordChangeInput,
} from "@/features/auth/security";
import { useCurrentUser } from "@/lib/auth-store";

/** Changement de mot de passe : ancien vérifié, nouveau confirmé. */
export default function ChangePasswordScreen() {
  const router = useRouter();
  const user = useCurrentUser();
  const changePassword = useChangePassword();
  const { toast } = useFeedback();

  const [error, setError] = useState<string | null>(null);
  const [pwdFocused, setPwdFocused] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeSchema),
    mode: "onChange",
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const newPasswordValue = watch("newPassword");

  const onSubmit = (data: PasswordChangeInput) => {
    setError(null);
    if (!user?.email) {
      setError("Adresse e-mail introuvable sur ce compte.");
      return;
    }
    changePassword.mutate(
      {
        email: user.email,
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      },
      {
        onSuccess: () => {
          toast("Mot de passe modifié", "success");
          router.back();
        },
        onError: (e) => setError(mapPasswordError(e.message)),
      }
    );
  };

  return (
    <View className="flex-1">
      <AppBackground />
      <ScreenContainer transparent padded={false} edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <View className="flex-row items-center gap-2 px-[18px] pb-3 pt-1">
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              accessibilityLabel="Retour"
              className="h-10 w-10 items-center justify-center rounded-chip active:opacity-70"
            >
              <ChevronLeft size={24} color={colors.cream} strokeWidth={2.2} />
            </Pressable>
            <Text className="font-display text-[20px] tracking-tighter text-cream">
              Mot de passe
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Reveal delay={0}>
              <Text className="font-body text-[13px] leading-[19px] text-cream-dim">
                Ton mot de passe actuel est demandé pour vérifier que c'est bien toi — une session
                ouverte ne suffit pas.
              </Text>
            </Reveal>

            <View className="mt-5 gap-[18px]">
              <Reveal delay={60}>
                <Controller
                  control={control}
                  name="currentPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextField
                      label="Mot de passe actuel"
                      icon={KeyRound}
                      value={value}
                      onBlur={onBlur}
                      onChangeText={(t) => {
                        onChange(t);
                        setError(null);
                      }}
                      placeholder="Ton mot de passe"
                      secureTextEntry
                      autoComplete="current-password"
                      error={errors.currentPassword?.message}
                    />
                  )}
                />
              </Reveal>

              <Reveal delay={110}>
                <Controller
                  control={control}
                  name="newPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextField
                      label="Nouveau mot de passe"
                      icon={Lock}
                      value={value}
                      onFocus={() => setPwdFocused(true)}
                      onBlur={() => {
                        setPwdFocused(false);
                        onBlur();
                      }}
                      onChangeText={(t) => {
                        onChange(t);
                        setError(null);
                      }}
                      placeholder="8 caractères minimum"
                      secureTextEntry
                      noCopy
                      autoComplete="new-password"
                      error={errors.newPassword?.message}
                    />
                  )}
                />
                <PasswordStrength
                  password={newPasswordValue}
                  visible={pwdFocused || newPasswordValue.length > 0}
                />
              </Reveal>

              <Reveal delay={160}>
                <Controller
                  control={control}
                  name="confirmPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextField
                      label="Confirmer"
                      icon={ShieldCheck}
                      value={value}
                      onBlur={onBlur}
                      onChangeText={(t) => {
                        onChange(t);
                        setError(null);
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

            <Reveal delay={210} className="mt-7 gap-3.5">
              {error ? (
                <View className="flex-row items-center gap-2 rounded-input border border-red/30 bg-red-soft px-3.5 py-3">
                  <AlertCircle size={18} color={colors.red} />
                  <Text className="flex-1 font-body-medium text-[13px] text-red">{error}</Text>
                </View>
              ) : null}

              <GradientButton
                onPress={handleSubmit(onSubmit)}
                loading={changePassword.isPending}
                disabled={!isValid}
              >
                Modifier mon mot de passe
              </GradientButton>
            </Reveal>
          </ScrollView>
        </KeyboardAvoidingView>
      </ScreenContainer>
    </View>
  );
}
