import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Camera, Trash2 } from "lucide-react-native";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useDeleteAccount } from "@/features/auth/account";
import { useSignOut } from "@/features/auth/mutations";
import { completeProfileSchema, type CompleteProfileInput } from "@/features/auth/profile-schemas";
import { useUpdateProfile } from "@/features/auth/profile-mutations";
import { useProfile } from "@/hooks/useProfile";
import { useCurrentUser } from "@/lib/auth-store";

export default function ProfileScreen() {
  const user = useCurrentUser();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const signOut = useSignOut();
  const deleteAccount = useDeleteAccount();
  const { confirm, toast } = useFeedback();

  const [avatar, setAvatar] = useState<{ uri: string; base64: string; mime: string } | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CompleteProfileInput>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: { firstName: "", lastName: "", username: "" },
  });

  useEffect(() => {
    if (profile) {
      reset({
        firstName: profile.first_name ?? "",
        lastName: profile.last_name ?? "",
        username: profile.username ?? "",
      });
    }
  }, [profile, reset]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
        <ActivityIndicator color="#3b82f6" />
      </SafeAreaView>
    );
  }

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    const asset = result.assets[0];
    setAvatar({ uri: asset.uri, base64: asset.base64!, mime: asset.mimeType ?? "image/jpeg" });
  };

  const onSave = (data: CompleteProfileInput) => {
    updateProfile.mutate(
      { ...data, avatarBase64: avatar?.base64 ?? null, avatarMimeType: avatar?.mime ?? null },
      {
        onSuccess: () => {
          setAvatar(null);
          toast("Profil mis à jour", "success");
        },
        onError: (e) => toast(e.message, "error"),
      }
    );
  };

  const onDelete = async () => {
    const ok = await confirm({
      title: "Supprimer mon compte",
      message:
        "Cette action est irréversible. Tu ne pourras plus te connecter et ton historique dans les groupes sera anonymisé.",
      confirmLabel: "Supprimer",
      destructive: true,
    });
    if (!ok) return;
    deleteAccount.mutate(undefined, {
      onError: (e) => toast(e.message, "error"),
    });
  };

  const onSignOut = async () => {
    const ok = await confirm({
      title: "Déconnexion",
      message: "Tu veux vraiment te déconnecter ?",
      confirmLabel: "Me déconnecter",
      destructive: true,
    });
    if (ok) signOut.mutate();
  };

  const avatarUri = avatar?.uri ?? profile?.avatar_url ?? null;
  const initials = `${profile?.first_name?.[0] ?? ""}${profile?.last_name?.[0] ?? ""}`.toUpperCase();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-900">
      <ScrollView contentContainerClassName="gap-6 p-6 pb-12" keyboardShouldPersistTaps="handled">
        <Text className="text-2xl font-bold text-neutral-900 dark:text-white">Mon profil</Text>

        <View className="items-center gap-3">
          <Pressable onPress={pickAvatar} className="active:opacity-70">
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} className="h-24 w-24 rounded-full" />
            ) : (
              <View className="h-24 w-24 items-center justify-center rounded-full bg-primary-500">
                <Text className="text-2xl font-bold text-white">{initials || "?"}</Text>
              </View>
            )}
            <View className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary-500 dark:border-neutral-900">
              <Camera size={16} color="#ffffff" />
            </View>
          </Pressable>
          <Text className="text-xs text-neutral-400">Touche l'avatar pour le changer</Text>
        </View>

        <View className="gap-4">
          <Controller
            control={control}
            name="firstName"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Prénom"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
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
                onChangeText={onChange}
                onBlur={onBlur}
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
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="none"
                error={errors.username?.message}
              />
            )}
          />
          <View>
            <Text className="mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Email
            </Text>
            <View className="min-h-[48px] justify-center rounded-xl border border-neutral-200 bg-neutral-50 px-4 dark:border-neutral-700 dark:bg-neutral-800">
              <Text className="text-base text-neutral-500">{user?.email ?? "—"}</Text>
            </View>
            <Text className="mt-1 text-xs text-neutral-400">L'email ne peut pas être modifié.</Text>
          </View>
        </View>

        <Button
          onPress={handleSubmit(onSave)}
          loading={updateProfile.isPending}
          disabled={!isDirty && !avatar}
        >
          Enregistrer
        </Button>

        <View className="mt-2 gap-3 border-t border-neutral-200 pt-6 dark:border-neutral-800">
          <Button variant="secondary" onPress={onSignOut} loading={signOut.isPending}>
            Se déconnecter
          </Button>

          <Pressable
            onPress={onDelete}
            disabled={deleteAccount.isPending}
            className="flex-row items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 active:opacity-70 dark:border-red-900 dark:bg-red-950"
          >
            {deleteAccount.isPending ? (
              <ActivityIndicator color="#ef4444" />
            ) : (
              <Trash2 size={18} color="#ef4444" />
            )}
            <Text className="text-base font-semibold text-red-600 dark:text-red-400">
              Supprimer mon compte
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
