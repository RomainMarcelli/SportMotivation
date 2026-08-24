import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { colors } from "@/constants/colors";

type Tone = "amber" | "coral" | "mint";

const TONES: Record<Tone, { bg: string; border: string; icon: string }> = {
  amber: { bg: colors.amberSoft, border: "rgba(255,178,62,0.28)", icon: colors.amber },
  coral: { bg: colors.coralSoft, border: "rgba(255,106,69,0.28)", icon: colors.coral },
  mint: { bg: colors.mintSoft, border: "rgba(95,224,168,0.28)", icon: colors.mint },
};

type Props = {
  icon: LucideIcon;
  tone?: Tone;
  children: ReactNode;
};

/** Encart d'information DA (note de verrouillage, avertissement…) teinté amber/coral/mint. */
export function Note({ icon: Icon, tone = "amber", children }: Props) {
  const t = TONES[tone];
  return (
    <View
      className="flex-row items-start gap-3 rounded-[14px] border p-3"
      style={{ backgroundColor: t.bg, borderColor: t.border }}
    >
      <View className="mt-px">
        <Icon size={17} color={t.icon} strokeWidth={2.2} />
      </View>
      <Text className="flex-1 font-body text-[12.5px] leading-5 text-cream">{children}</Text>
    </View>
  );
}
