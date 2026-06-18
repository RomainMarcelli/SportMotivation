import { zodResolver } from "@hookform/resolvers/zod";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { AlertCircle, Lock, Mail } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { BrandMark } from "@/components/ui/BrandMark";
import { GradientButton } from "@/components/ui/GradientButton";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { TextField } from "@/components/ui/TextField";
import { colors } from "@/constants/colors";
import { isGoogleConfigured } from "@/features/auth/google";
import { useSignIn } from "@/features/auth/mutations";
import { signInSchema, type SignInInput } from "@/features/auth/schemas";

export default function SignInScreen() {
  const router = useRouter();
  const signIn = useSignIn();
  const reduceMotion = useReducedMotion();

  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  const triggerShake = () => {
    if (reduceMotion) return;
    shakeX.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  };

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  // Efface le message d'erreur dès que l'utilisateur re-modifie un champ.
  const clearError = () => {
    if (signIn.isError) signIn.reset();
  };

  const onSubmit = (data: SignInInput) => {
    signIn.mutate(data, {
      onError: () => {
        triggerShake();
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        }
      },
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
                    onChangeText={(text) => {
                      onChange(text);
                      clearError();
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
                    onChangeText={(text) => {
                      onChange(text);
                      clearError();
                    }}
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
            {signIn.isError ? (
              <Reveal>
                <View className="flex-row items-center gap-2 rounded-input border border-red/30 bg-red-soft px-3.5 py-3">
                  <AlertCircle size={18} color={colors.red} />
                  <Text className="flex-1 font-body-medium text-[13px] text-red">
                    E-mail ou mot de passe incorrect.
                  </Text>
                </View>
              </Reveal>
            ) : null}

            <Animated.View style={shakeStyle}>
              <GradientButton onPress={handleSubmit(onSubmit)} loading={signIn.isPending}>
                Se connecter
              </GradientButton>
            </Animated.View>

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
