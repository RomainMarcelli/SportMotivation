import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
import { AtSign, Camera, Plus, User } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { BrandMark } from "@/components/ui/BrandMark";
import { Button } from "@/components/ui/Button";
import { GradientButton } from "@/components/ui/GradientButton";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { TextField } from "@/components/ui/TextField";
import { colors } from "@/constants/colors";
import { useSignOut } from "@/features/auth/mutations";
import { useUpdateProfile } from "@/features/auth/profile-mutations";
import { completeProfileSchema, type CompleteProfileInput } from "@/features/auth/profile-schemas";

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
    formState: { errors, isValid },
  } = useForm<CompleteProfileInput>({
    resolver: zodResolver(completeProfileSchema),
    mode: "onChange",
    defaultValues: { firstName: "", lastName: "", username: "" },
  });

  // Logique de picker existante (inchangée).
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
    <ScreenContainer transparent padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow px-[24px] py-8"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Reveal delay={0} className="mb-7 items-center">
            <BrandMark size={56} />
            <Text className="mt-4 text-center font-display text-[26px] tracking-tighter text-cream">
              Crée ton profil
            </Text>
            <Text className="mt-2 text-center font-body text-[13.5px] text-cream-dim">
              Tes amis doivent pouvoir te reconnaître dans le groupe.
            </Text>
          </Reveal>

          {/* Photo de profil (optionnelle) */}
          <Reveal delay={80} className="mb-7 items-center">
            <Pressable onPress={pickImage} className="items-center" hitSlop={6}>
              <View style={{ width: 96, height: 96 }}>
                {picked ? (
                  <Avatar uri={picked.uri} size={96} />
                ) : (
                  <View
                    style={{ width: 96, height: 96, borderRadius: 48 }}
                    className="items-center justify-center border-2 border-dashed border-line-2 bg-surface"
                  >
                    <Camera size={28} color={colors.creamDim} />
                  </View>
                )}
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
                  {picked ? (
                    <Camera size={14} color={colors.onCoral} strokeWidth={2.6} />
                  ) : (
                    <Plus size={16} color={colors.onCoral} strokeWidth={2.8} />
                  )}
                </View>
              </View>
              <Text className="mt-2.5 font-body-medium text-[12.5px] text-cream-dim">
                {picked ? "Changer la photo" : "Photo de profil · optionnel"}
              </Text>
            </Pressable>
          </Reveal>

          <View className="gap-[18px]">
            <Reveal delay={140}>
              <Controller
                control={control}
                name="firstName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Prénom"
                    icon={User}
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
            </Reveal>

            <Reveal delay={180}>
              <Controller
                control={control}
                name="lastName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Nom"
                    icon={User}
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
            </Reveal>

            <Reveal delay={220}>
              <Controller
                control={control}
                name="username"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Pseudo"
                    icon={AtSign}
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
            </Reveal>
          </View>

          <Reveal delay={280} className="mt-8 gap-3">
            <GradientButton
              onPress={handleSubmit(onSubmit)}
              loading={updateProfile.isPending}
              disabled={!isValid}
            >
              Continuer
            </GradientButton>
            <Button variant="ghost" onPress={() => signOut.mutate()} loading={signOut.isPending}>
              Me déconnecter
            </Button>
          </Reveal>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
