import { Globe, HelpCircle, Lock, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Reveal } from "@/components/ui/Reveal";
import { Toggle } from "@/components/ui/Toggle";
import { colors } from "@/constants/colors";
import { privacyLabel, privacySummary } from "@/features/settings/privacy";

type Props = {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
};

/**
 * Réglage « profil public / privé », partagé par l'inscription et les Paramètres.
 *
 * Le même bloc aux deux endroits : quelqu'un qui a fait un choix à l'inscription
 * doit reconnaître ce qu'il retrouve dans les réglages. L'explication est repliée
 * derrière un « ? » — elle répond à une question précise (« ça sert à quoi ? »)
 * qu'on ne se pose pas forcément, et un pavé de texte permanent alourdirait
 * l'inscription.
 */
export function PrivacyToggleCard({ value, onChange, disabled }: Props) {
  const [explain, setExplain] = useState(false);
  const Icon = value ? Globe : Lock;
  const tint = value ? colors.mint : colors.creamDim;
  const soft = value ? colors.mintSoft : colors.surface2;

  return (
    <View
      className="rounded-[16px] border p-3.5"
      style={{ backgroundColor: colors.surface, borderColor: colors.line }}
    >
      <View className="flex-row items-center gap-3">
        <View
          className="h-[38px] w-[38px] items-center justify-center rounded-[11px]"
          style={{ backgroundColor: soft }}
        >
          <Icon size={18} color={tint} strokeWidth={2.2} />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="font-body-bold text-[13.5px] text-cream">
              Profil {privacyLabel(value).toLowerCase()}
            </Text>
            <Pressable
              onPress={() => setExplain((v) => !v)}
              hitSlop={10}
              accessibilityLabel="À quoi sert ce réglage ?"
              className="active:opacity-70"
            >
              <HelpCircle size={14} color={colors.creamDim} />
            </Pressable>
          </View>
          <Text className="mt-0.5 font-body text-[11.5px] leading-4 text-cream-dim">
            {privacySummary(value)}
          </Text>
        </View>

        <Toggle
          value={value}
          onChange={onChange}
          disabled={disabled}
          accessibilityLabel="Apparaître dans la recherche par pseudo"
        />
      </View>

      {explain ? (
        <Reveal>
          <View
            className="mt-3 overflow-hidden rounded-[14px] border"
            style={{ backgroundColor: colors.ink2, borderColor: colors.line2 }}
          >
            <View
              className="flex-row items-center gap-2 px-3.5 pb-2 pt-3"
              style={{ borderBottomWidth: 1, borderBottomColor: colors.line }}
            >
              <Text className="flex-1 font-body-bold text-[11px] uppercase tracking-label text-cream-dim">
                Ce que ça change
              </Text>
              <Pressable
                onPress={() => setExplain(false)}
                hitSlop={8}
                accessibilityLabel="Fermer l'explication"
                className="active:opacity-70"
              >
                <X size={14} color={colors.creamDim} strokeWidth={2.4} />
              </Pressable>
            </View>

            <ModeRow
              icon={Globe}
              tint={colors.mint}
              soft={colors.mintSoft}
              label="Public"
              text="N'importe qui peut te trouver par ton pseudo et t'inviter à un défi."
            />
            <View className="h-px" style={{ backgroundColor: colors.line }} />
            <ModeRow
              icon={Lock}
              tint={colors.creamDim}
              soft={colors.surface2}
              label="Privé"
              text="Tu n'apparais pas dans la recherche. Ton code, ton lien et ton QR code fonctionnent toujours."
            />
          </View>
        </Reveal>
      ) : null}
    </View>
  );
}

/** Une ligne « mode » de l'explication : pastille icône + intitulé + description. */
function ModeRow({
  icon: Icon,
  tint,
  soft,
  label,
  text,
}: {
  icon: typeof Globe;
  tint: string;
  soft: string;
  label: string;
  text: string;
}) {
  return (
    <View className="flex-row items-start gap-3 px-3.5 py-3">
      <View
        className="mt-px h-7 w-7 items-center justify-center rounded-[9px]"
        style={{ backgroundColor: soft }}
      >
        <Icon size={14} color={tint} strokeWidth={2.3} />
      </View>
      <View className="flex-1">
        <Text className="font-body-bold text-[12.5px]" style={{ color: tint }}>
          {label}
        </Text>
        <Text className="mt-0.5 font-body text-[11.5px] leading-[16px] text-cream-dim">{text}</Text>
      </View>
    </View>
  );
}
