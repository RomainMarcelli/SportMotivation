import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Alert, KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Dumbbell } from "lucide-react-native";

import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Button } from "@/components/ui/Button";
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
      onError: (error) => {
        Alert.alert("Connexion impossible", error.message);
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-6">
          <View className="mb-8 items-center">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-primary-500">
              <Dumbbell size={32} color="#ffffff" />
            </View>
            <Text className="text-3xl font-bold text-neutral-900 dark:text-white">Bon retour</Text>
            <Text className="mt-2 text-center text-base text-neutral-500 dark:text-neutral-400">
              Connecte-toi pour rejoindre tes défis sportifs.
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
                  autoComplete="password"
                  error={errors.password?.message}
                />
              )}
            />
          </View>

          <View className="mt-8 gap-3">
            <Button onPress={handleSubmit(onSubmit)} loading={signIn.isPending}>
              Se connecter
            </Button>
            {isGoogleConfigured ? <GoogleSignInButton /> : null}
            <Button variant="ghost" onPress={() => router.push("/sign-up")}>
              Créer un compte
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
