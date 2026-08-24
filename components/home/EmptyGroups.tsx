import { Flame, KeyRound, Plus } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { GradientButton } from "@/components/ui/GradientButton";
import { Reveal } from "@/components/ui/Reveal";
import { colors } from "@/constants/colors";
import { glow } from "@/lib/shadow";

type Props = {
  loading?: boolean;
  onCreate: () => void;
  onJoin: () => void;
  /** Sous-titre personnalisable selon l'écran (accueil vs onglet Groupes). */
  subtitle?: string;
};

/**
 * État « aucun groupe » partagé (accueil + onglet Groupes) : tuile flamme + halo chaud,
 * titre, sous-titre et les 2 CTA Créer / Rejoindre. À placer dans un conteneur centré.
 */
export function EmptyGroups({
  loading,
  onCreate,
  onJoin,
  subtitle = "Crée un défi sportif et invite tes amis, ou rejoins le leur avec un code.",
}: Props) {
  if (loading) {
    return (
      <View className="items-center">
        <Text className="font-body text-[14px] text-cream-dim">Chargement de tes défis…</Text>
      </View>
    );
  }

  return (
    <Reveal delay={120} className="items-center px-2">
      {/* Tuile flamme + halo chaud (cercles concentriques = halo sans dépendance de flou,
          cross-platform) + glow web pour adoucir l'ensemble. */}
      <View className="items-center justify-center">
        <View
          pointerEvents="none"
          className="absolute h-[176px] w-[176px] rounded-full"
          style={{ backgroundColor: colors.coral, opacity: 0.06 }}
        />
        <View
          pointerEvents="none"
          className="absolute h-[124px] w-[124px] rounded-full"
          style={{ backgroundColor: colors.coral, opacity: 0.1 }}
        />
        <View
          className="h-[96px] w-[96px] items-center justify-center rounded-hero border border-line-2 bg-surface"
          style={glow({ color: colors.coral, offsetY: 0, radius: 40, opacity: 0.3, elevation: 0 })}
        >
          <Flame size={42} color={colors.coral} strokeWidth={2.1} />
        </View>
      </View>

      <Text className="mt-6 text-center font-display text-[22px] tracking-tight text-cream">
        Aucun défi pour l'instant
      </Text>
      <Text className="mt-2 text-center font-body text-[13.5px] leading-5 text-cream-dim">
        {subtitle}
      </Text>

      <View className="mt-7 w-full gap-3">
        <GradientButton icon={Plus} onPress={onCreate}>
          Créer un défi
        </GradientButton>
        <Pressable
          onPress={onJoin}
          className="h-[52px] flex-row items-center justify-center gap-2.5 rounded-input border border-line-2 bg-surface active:opacity-80"
        >
          {/* `Sparkles` faisait « décoratif », presque emoji. Une clé dit ce que fait
              le bouton : entrer un code d'accès. */}
          <KeyRound size={18} color={colors.creamDim} />
          <Text className="font-display text-[15px] text-cream">J'ai un code — Rejoindre</Text>
        </Pressable>
      </View>
    </Reveal>
  );
}
