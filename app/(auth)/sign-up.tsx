import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Lock, Mail, ShieldCheck } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { BrandMark } from "@/components/ui/BrandMark";
import { GradientButton } from "@/components/ui/GradientButton";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { TextField } from "@/components/ui/TextField";
import { isGoogleConfigured } from "@/features/auth/google";
import { useSignUp } from "@/features/auth/mutations";
import { signUpSchema, type SignUpInput } from "@/features/auth/schemas";

export default function SignUpScreen() {
  const router = useRouter();
  const signUp = useSignUp();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = (data: SignUpInput) => {
    signUp.mutate(data, {
      onSuccess: (result) => {
        if (result.session) return; // auto-loggé : redirection gérée par le root layout
        Alert.alert(
          "Vérifie tes e-mails",
          "Un e-mail de confirmation vient de t'être envoyé. Clique sur le lien pour activer ton compte.",
          [{ text: "OK", onPress: () => router.replace("/sign-in") }]
        );
      },
      onError: (error) => Alert.alert("Inscription impossible", error.message),
    });
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
          <Reveal delay={0} className="mb-8 items-center">
            <BrandMark size={74} />
            <Text className="mt-[18px] text-center font-display text-[27px] tracking-tighter text-cream">
              Crée ton compte
            </Text>
            <Text className="mt-2 text-center font-body text-[13.5px] text-cream-dim">
              Rejoins tes amis et lance ton premier défi.
            </Text>
          </Reveal>

          <View className="gap-[18px]">
            <Reveal delay={80}>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Adresse e-mail"
                    icon={Mail}
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="ton@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    error={errors.email?.message}
                  />
                )}
              />
            </Reveal>

            <Reveal delay={140}>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Mot de passe"
                    icon={Lock}
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="8 caractères minimum"
                    secureTextEntry
                    autoComplete="new-password"
                    error={errors.password?.message}
                  />
                )}
              />
            </Reveal>

            <Reveal delay={200}>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Confirmer le mot de passe"
                    icon={ShieldCheck}
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="Saisis-le à nouveau"
                    secureTextEntry
                    autoComplete="new-password"
                    error={errors.confirmPassword?.message}
                  />
                )}
              />
            </Reveal>
          </View>

          <Reveal delay={260} className="mt-7 gap-3.5">
            <GradientButton onPress={handleSubmit(onSubmit)} loading={signUp.isPending}>
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
    </ScreenContainer>
  );
}
