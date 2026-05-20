import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Button } from "@/components/ui/Button";
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
        if (result.session) {
          // Compte créé et auto-loggé (confirmation email désactivée)
          return;
        }
        // Confirmation email requise
        Alert.alert(
          "Vérifie tes emails",
          "Un email de confirmation vient de t'être envoyé. Clique sur le lien pour activer ton compte.",
          [{ text: "OK", onPress: () => router.replace("/sign-in") }]
        );
      },
      onError: (error) => {
        Alert.alert("Inscription impossible", error.message);
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-8">
            <Text className="text-3xl font-bold text-neutral-900 dark:text-white">
              Crée ton compte
            </Text>
            <Text className="mt-2 text-base text-neutral-500 dark:text-neutral-400">
              Rejoins tes amis pour vous motiver mutuellement.
            </Text>
          </View>

          <View className="gap-4">
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Email"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="toi@exemple.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  error={errors.email?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Mot de passe"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="Au moins 8 caractères"
                  secureTextEntry
                  autoComplete="new-password"
                  error={errors.password?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Confirmer le mot de passe"
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
          </View>

          <View className="mt-8 gap-3">
            <Button onPress={handleSubmit(onSubmit)} loading={signUp.isPending}>
              Créer mon compte
            </Button>
            {isGoogleConfigured ? <GoogleSignInButton /> : null}
            <Button variant="ghost" onPress={() => router.back()}>
              J'ai déjà un compte
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
