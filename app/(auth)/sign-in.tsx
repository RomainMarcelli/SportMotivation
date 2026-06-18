import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Lock, Mail } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { BrandMark } from "@/components/ui/BrandMark";
import { GradientButton } from "@/components/ui/GradientButton";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { TextField } from "@/components/ui/TextField";
import { isGoogleConfigured } from "@/features/auth/google";
import { useSignIn } from "@/features/auth/mutations";
import { signInSchema, type SignInInput } from "@/features/auth/schemas";

export default function SignInScreen() {
  const router = useRouter();
  const signIn = useSignIn();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: SignInInput) => {
    signIn.mutate(data, {
      onError: (error) => Alert.alert("Connexion impossible", error.message),
    });
  };

  const forgotPassword = () =>
    Alert.alert("Bientôt", "La réinitialisation du mot de passe arrive prochainement.");

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
              Content de te revoir
            </Text>
            <Text className="mt-2 text-center font-body text-[13.5px] text-cream-dim">
              Reprends le défi avec tes potes.
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
                    placeholder="Ton mot de passe"
                    secureTextEntry
                    autoComplete="password"
                    error={errors.password?.message}
                  />
                )}
              />
              <Pressable onPress={forgotPassword} className="mt-2.5 self-end" hitSlop={8}>
                <Text className="font-body-bold text-[12.5px] text-coral">
                  Mot de passe oublié ?
                </Text>
              </Pressable>
            </Reveal>
          </View>

          <Reveal delay={200} className="mt-7 gap-3.5">
            <GradientButton onPress={handleSubmit(onSubmit)} loading={signIn.isPending}>
              Se connecter
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
          </Reveal>
        </ScrollView>

        <View className="items-center px-[24px] pb-4 pt-2">
          <Pressable onPress={() => router.push("/sign-up")} hitSlop={8}>
            <Text className="font-body text-[13px] text-cream-dim">
              Pas encore de compte ? <Text className="font-body-bold text-coral">S'inscrire</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
