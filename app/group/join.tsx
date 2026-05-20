import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { KeyRound } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { isValidInviteCode, normalizeInviteCode } from "@/lib/group-code";

export default function JoinGroupScreen() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const valid = isValidInviteCode(code);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-white dark:bg-neutral-900"
    >
      <View className="flex-1 px-6 pt-8">
        <View className="mb-8 items-center">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-primary-50 dark:bg-neutral-800">
            <KeyRound size={32} color="#3b82f6" />
          </View>
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
            Rejoindre un groupe
          </Text>
          <Text className="mt-2 text-center text-base text-neutral-500 dark:text-neutral-400">
            Saisis le code à 6 chiffres communiqué par l'organisateur.
          </Text>
        </View>

        <TextField
          label="Code d'invitation"
          value={code}
          onChangeText={(text) => setCode(normalizeInviteCode(text))}
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={6}
        />

        <View className="mt-8">
          <Button
            disabled={!valid}
            onPress={() =>
              router.push({ pathname: "/group/join-confirm", params: { code } } as never)
            }
          >
            Continuer
          </Button>
        </View>

        <Text className="mt-6 text-center text-xs text-neutral-400">
          Le scan de QR code et les liens d'invitation arrivent bientôt.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
