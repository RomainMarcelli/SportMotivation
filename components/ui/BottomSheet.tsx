import { X } from "lucide-react-native";
import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { colors } from "@/constants/colors";

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Ligne grise sous le titre (nom du défi, date de la séance…). */
  subtitle?: string;
  /** Pastille à gauche du titre (icône de sport, statut…). */
  leading?: ReactNode;
  /** Hauteur maximale du panneau, en proportion de l'écran. */
  maxHeight?: `${number}%`;
  /** Contenu figé sous le contenu défilant (boutons d'action). */
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * Panneau qui monte du bas — la forme de popup de la DA (`InviteSheet`,
 * `AvatarPicker` et l'avertissement d'activité la répétaient chacun de leur
 * côté). Fond assombri cliquable pour fermer, poignée, entête avec croix.
 *
 * Le contenu défile ; ce qui est passé en `footer` reste visible, pour qu'un
 * bouton d'action ne se retrouve jamais hors d'atteinte sur un petit écran.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  leading,
  maxHeight = "88%",
  footer,
  children,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Fermer" />
        <View
          className="rounded-t-[28px] border-x border-t px-5 pb-8 pt-5"
          style={{ backgroundColor: colors.surface, borderColor: colors.line2, maxHeight }}
        >
          <View
            className="mb-4 h-1 w-10 self-center rounded-full"
            style={{ backgroundColor: colors.line2 }}
          />

          <View className="mb-4 flex-row items-center gap-3">
            {leading}
            <View className="flex-1">
              <Text numberOfLines={1} className="font-display text-[19px] tracking-tight text-cream">
                {title}
              </Text>
              {subtitle ? (
                <Text numberOfLines={1} className="mt-0.5 font-body text-[12px] text-cream-dim">
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityLabel="Fermer"
              className="h-9 w-9 items-center justify-center rounded-full active:opacity-80"
              style={{ backgroundColor: colors.surface2 }}
            >
              <X size={17} color={colors.creamDim} strokeWidth={2.4} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>

          {footer ? <View className="mt-4">{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}
