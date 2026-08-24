import { FlaskConical, RotateCcw } from "lucide-react-native";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { colors } from "@/constants/colors";
import { devResetEnabled, useDevResetExcuseJoker } from "@/features/dev/reset";

/**
 * Outils de test rendus **uniquement en dev** (`__DEV__`) : remet à zéro l'excuse de la semaine
 * et le joker du mois pour rejouer les scénarios en boucle.
 */
export function DevResetTools({ groupId }: { groupId: string }) {
  const { confirm, toast } = useFeedback();
  const reset = useDevResetExcuseJoker(groupId);

  if (!devResetEnabled) return null;

  const onReset = async () => {
    if (reset.isPending) return;
    const ok = await confirm({
      title: "Réinitialiser les tests ?",
      message:
        "Supprime ton excuse de cette semaine (et ses votes/notifications) ainsi que ton joker du mois, pour ce groupe. Sans effet sur tes séances.",
      confirmLabel: "Réinitialiser",
      destructive: true,
    });
    if (!ok) return;
    reset.mutate(undefined, {
      onSuccess: (summary) => toast(summary, "success"),
      onError: (e) => toast(e.message, "error"),
    });
  };

  return (
    <View
      className="mt-3 gap-3 rounded-2xl border p-4"
      style={{ backgroundColor: colors.surface, borderColor: "rgba(255,178,62,0.28)" }}
    >
      <View className="flex-row items-center gap-2.5">
        <View
          className="h-9 w-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: colors.amberSoft }}
        >
          <FlaskConical size={17} color={colors.amber} />
        </View>
        <View className="flex-1">
          <Text className="font-display text-[15px] tracking-tight text-cream">Outils de test</Text>
          <Text className="mt-0.5 font-body text-[11px] text-cream-dim">
            Visible en développement uniquement
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onReset}
        disabled={reset.isPending}
        className="flex-row items-center justify-center gap-2 rounded-input border py-3 active:opacity-80"
        style={{ backgroundColor: colors.surface2, borderColor: colors.line }}
      >
        {reset.isPending ? (
          <ActivityIndicator size="small" color={colors.amber} />
        ) : (
          <RotateCcw size={16} color={colors.cream} />
        )}
        <Text className="font-body-semibold text-[13px] text-cream">
          Réinitialiser joker + excuse
        </Text>
      </Pressable>
    </View>
  );
}
