import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { AlertCircle, ChevronLeft, MailCheck, Mail } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { AppBackground } from "@/components/ui/AppBackground";
import { GradientButton } from "@/components/ui/GradientButton";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { TextField } from "@/components/ui/TextField";
import { colors } from "@/constants/colors";
import {
  emailChangeSchema,
  mapEmailChangeError,
  useChangeEmail,
  type EmailChangeInput,
} from "@/features/auth/security";
import { useCurrentUser } from "@/lib/auth-store";

/**
 * Changement d'adresse e-mail.
 *
 * L'écran se termine sur un **accusé de demande**, pas sur une confirmation de
 * changement : tant que le lien envoyé à la nouvelle adresse n'est pas cliqué,
 * la connexion se fait toujours avec l'ancienne. Annoncer « adresse modifiée »
 * ici, c'est la promesse d'une déconnexion incompréhensible au prochain
 * lancement.
 */
export default function ChangeEmailScreen() {
  const router = useRouter();
  const user = useCurrentUser();
  const changeEmail = useChangeEmail();

  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<EmailChangeInput>({
    resolver: zodResolver(emailChangeSchema),
    mode: "onChange",
    defaultValues: { email: "" },
  });

  const onSubmit = (data: EmailChangeInput) => {
    setError(null);
    const email = data.email.trim();
    if (email.toLowerCase() === (user?.email ?? "").toLowerCase()) {
      setError("C'est déjà ton adresse actuelle.");
      return;
    }
    changeEmail.mutate(
      { email },
      {
        onSuccess: () => setSentTo(email),
        onError: (e) => setError(mapEmailChangeError(e.message)),
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
              Adresse e-mail
            </Text>
          </View>

          {sentTo ? (
            <View className="flex-1 items-center justify-center gap-5 px-8 pb-24">
              <View
                className="h-[72px] w-[72px] items-center justify-center rounded-full"
                style={{ backgroundColor: colors.mintSoft }}
              >
                <MailCheck size={32} color={colors.mint} />
              </View>
              <Text className="text-center font-display text-[19px] tracking-tight text-cream">
                Vérifie ta boîte mail
              </Text>
              <Text className="text-center font-body text-[13.5px] leading-[20px] text-cream-dim">
                Un lien de confirmation vient d'être envoyé à{" "}
                <Text className="font-body-bold text-cream">{sentTo}</Text>. Ton adresse ne changera
                qu'une fois ce lien ouvert — d'ici là, continue de te connecter avec l'ancienne.
              </Text>
              <View className="w-full max-w-[280px]">
                <GradientButton onPress={() => router.back()}>Compris</GradientButton>
              </View>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Reveal delay={0}>
                <View
                  className="rounded-[16px] border p-4"
                  style={{ backgroundColor: colors.surface, borderColor: colors.line2 }}
                >
                  <Text className="font-body text-[11.5px] text-cream-dim">Adresse actuelle</Text>
                  <Text className="mt-1 font-display text-[15px] tracking-tight text-cream">
                    {user?.email ?? "—"}
                  </Text>
                </View>
              </Reveal>

              <Reveal delay={70} className="mt-5">
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextField
                      label="Nouvelle adresse"
                      icon={Mail}
                      value={value}
                      onBlur={onBlur}
                      onChangeText={(t) => {
                        onChange(t);
                        setError(null);
                      }}
                      placeholder="ton@email.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      error={errors.email?.message}
                    />
                  )}
                />
                <Text className="mt-2.5 font-body text-[12px] leading-[17px] text-cream-dim">
                  Un lien de confirmation sera envoyé à cette adresse. Le changement ne prend effet
                  qu'après l'avoir ouvert.
                </Text>
              </Reveal>

              <Reveal delay={130} className="mt-7 gap-3.5">
                {error ? (
                  <View className="flex-row items-center gap-2 rounded-input border border-red/30 bg-red-soft px-3.5 py-3">
                    <AlertCircle size={18} color={colors.red} />
                    <Text className="flex-1 font-body-medium text-[13px] text-red">{error}</Text>
                  </View>
                ) : null}

                <GradientButton
                  onPress={handleSubmit(onSubmit)}
                  loading={changeEmail.isPending}
                  disabled={!isValid}
                >
                  Envoyer le lien de confirmation
                </GradientButton>
              </Reveal>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </ScreenContainer>
    </View>
  );
}
