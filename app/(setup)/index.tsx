import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Camera } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useUpdateProfile } from "@/features/auth/profile-mutations";
import {
  completeProfileSchema,
  type CompleteProfileInput,
} from "@/features/auth/profile-schemas";
import { useSignOut } from "@/features/auth/mutations";

type PickedImage = {
  uri: string;
  base64: string;
  mimeType: string;
};

export default function CompleteProfileScreen() {
  const updateProfile = useUpdateProfile();
  const signOut = useSignOut();
  const [picked, setPicked] = useState<PickedImage | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CompleteProfileInput>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: { firstName: "", lastName: "", username: "" },
  });

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission refusée",
        "Active l'accès aux photos dans les réglages pour choisir un avatar."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setPicked({
      uri: asset.uri,
      base64: asset.base64!,
      mimeType: asset.mimeType ?? "image/jpeg",
    });
  };

  const onSubmit = (data: CompleteProfileInput) => {
    updateProfile.mutate(
      {
        ...data,
        avatarBase64: picked?.base64 ?? null,
        avatarMimeType: picked?.mimeType ?? null,
      },
      {
        onError: (error) => {
          Alert.alert("Mise à jour impossible", error.message);
        },
      }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-6">
            <Text className="text-3xl font-bold text-neutral-900 dark:text-white">
              Crée ton profil
            </Text>
            <Text className="mt-2 text-base text-neutral-500 dark:text-neutral-400">
              Tes amis vont avoir besoin de te reconnaître dans le groupe.
            </Text>
          </View>

          <View className="mb-6 items-center">
            <Pressable onPress={pickImage} className="items-center">
              {picked ? (
                <Image
                  source={{ uri: picked.uri }}
                  className="h-28 w-28 rounded-full"
                />
              ) : (
                <View className="h-28 w-28 items-center justify-center rounded-full border-2 border-dashed border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
                  <Camera size={32} color="#94a3b8" />
                </View>
              )}
              <Text className="mt-2 text-sm font-medium text-primary-500">
                {picked ? "Changer la photo" : "Ajouter une photo"}
              </Text>
            </Pressable>
          </View>

          <View className="gap-4">
            <Controller
              control={control}
              name="firstName"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Prénom"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="Romain"
                  autoCapitalize="words"
                  autoComplete="given-name"
                  error={errors.firstName?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="lastName"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Nom"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="Martin"
                  autoCapitalize="words"
                  autoComplete="family-name"
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
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="romz"
                  autoCapitalize="none"
                  autoComplete="username"
                  error={errors.username?.message}
                />
              )}
            />
          </View>

          <View className="mt-8 gap-3">
            <Button onPress={handleSubmit(onSubmit)} loading={updateProfile.isPending}>
              Continuer
            </Button>
            <Button variant="ghost" onPress={() => signOut.mutate()}>
              Me déconnecter
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
