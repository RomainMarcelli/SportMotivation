import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { Wallet } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { usePenaltyChange, useRespondPenaltyChange } from "@/features/groups/penalty-mutations";

export default function PenaltyResponseScreen() {
  const { changeId } = useLocalSearchParams<{ changeId: string }>();
  const router = useRouter();
  const { data: change, isLoading } = usePenaltyChange(changeId);
  const respond = useRespondPenaltyChange();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  if (!change || change.status !== "pending") {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6 dark:bg-neutral-900">
        <Text className="text-center text-base text-neutral-500 dark:text-neutral-400">
          {change && change.status !== "pending"
            ? "Cette demande a déjà été traitée."
            : "Demande introuvable."}
        </Text>
        <View className="mt-6 w-full max-w-xs">
          <Button variant="secondary" onPress={() => router.back()}>
            Retour
          </Button>
        </View>
      </View>
    );
  }

  const onRespond = (accept: boolean) => {
    respond.mutate(
      { changeId: changeId!, accept },
      {
        onSuccess: () => {
          Alert.alert(
            accept ? "Pénalité mise à jour" : "Changement refusé",
            accept
              ? `Ta pénalité est désormais de ${change.new_amount} €.`
              : `Ta pénalité reste à ${change.old_amount ?? "—"} €.`,
            [{ text: "OK", onPress: () => router.back() }]
          );
        },
        onError: (e) => Alert.alert("Erreur", e.message),
      }
    );
  };

  return (
    <View className="flex-1 items-center justify-center bg-white p-6 dark:bg-neutral-900">
      <View className="mb-6 h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
        <Wallet size={32} color="#f59e0b" />
      </View>
      <Text className="mb-2 text-center text-xl font-bold text-neutral-900 dark:text-white">
        Changement de pénalité
      </Text>
      <Text className="mb-8 text-center text-base text-neutral-600 dark:text-neutral-400">
        L'admin propose de passer ta pénalité par séance manquée de{" "}
        <Text className="font-bold">{change.old_amount ?? "—"} €</Text> à{" "}
        <Text className="font-bold text-primary-500">{change.new_amount} €</Text>.
      </Text>

      <View className="w-full max-w-sm gap-3">
        <Button onPress={() => onRespond(true)} loading={respond.isPending}>
          Accepter
        </Button>
        <Button variant="secondary" onPress={() => onRespond(false)} loading={respond.isPending}>
          {`Refuser (garder ${change.old_amount ?? "—"} €)`}
        </Button>
      </View>
    </View>
  );
}
