import { X } from "lucide-react-native";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { InviteBlock } from "@/components/groups/InviteBlock";
import { colors } from "@/constants/colors";

/**
 * Popup d'invitation : QR code + code à 6 caractères + lien de partage.
 * Accessible à TOUS les membres (pas seulement l'admin) depuis le menu ⋮ du groupe.
 */
export function InviteSheet({
  visible,
  onClose,
  inviteCode,
  groupName,
}: {
  visible: boolean;
  onClose: () => void;
  inviteCode: string;
  groupName: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
        <Pressable className="flex-1" onPress={onClose} />
        <View
          className="rounded-t-[28px] border-x border-t px-5 pb-8 pt-5"
          style={{ backgroundColor: colors.surface, borderColor: colors.line2, maxHeight: "88%" }}
        >
          <View
            className="mb-4 h-1 w-10 self-center rounded-full"
            style={{ backgroundColor: colors.line2 }}
          />

          <View className="mb-4 flex-row items-start gap-3">
            <View className="flex-1">
              <Text className="font-display text-[19px] tracking-tight text-cream">
                Inviter au groupe
              </Text>
              <Text numberOfLines={1} className="mt-0.5 font-body text-[12px] text-cream-dim">
                {groupName}
              </Text>
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
            <InviteBlock inviteCode={inviteCode} groupName={groupName} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
