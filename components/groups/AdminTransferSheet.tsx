import { ChevronRight, Crown, ShieldCheck, X } from "lucide-react-native";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { colors } from "@/constants/colors";
import { eligibleNewAdmins } from "@/features/groups/admin-transfer";
import type { GroupMemberWithUser } from "@/features/groups/queries";
import { formatDbDate } from "@/lib/date";

/**
 * Choix du nouvel admin : liste des autres membres actifs (le plus ancien en premier).
 * Un tap sur un membre déclenche le transfert (confirmation gérée par l'appelant).
 */
export function AdminTransferSheet({
  visible,
  onClose,
  members,
  meId,
  pendingUserId,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  members: GroupMemberWithUser[];
  meId: string | undefined;
  /** id du membre en cours de promotion (spinner). */
  pendingUserId: string | null;
  onSelect: (member: GroupMemberWithUser) => void;
}) {
  const candidates = eligibleNewAdmins(members, meId);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
        <Pressable className="flex-1" onPress={onClose} />
        <View
          className="rounded-t-[28px] border-x border-t px-5 pb-8 pt-5"
          style={{ backgroundColor: colors.surface, borderColor: colors.line2, maxHeight: "82%" }}
        >
          <View
            className="mb-4 h-1 w-10 self-center rounded-full"
            style={{ backgroundColor: colors.line2 }}
          />

          <View className="mb-1 flex-row items-start gap-3">
            <View
              className="h-11 w-11 items-center justify-center rounded-hero"
              style={{ backgroundColor: colors.amberSoft }}
            >
              <Crown size={21} color={colors.amber} strokeWidth={2.1} />
            </View>
            <View className="flex-1">
              <Text className="font-display text-[18px] tracking-tight text-cream">
                Choisir le nouvel admin
              </Text>
              <Text className="mt-0.5 font-body text-[12px] leading-[1.45] text-cream-dim">
                Tu redeviendras membre simple et resteras dans le groupe.
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

          {candidates.length === 0 ? (
            <View className="items-center gap-2 px-4 py-8">
              <ShieldCheck size={30} color={colors.creamDim} />
              <Text className="text-center font-body text-[13px] leading-[1.5] text-cream-dim">
                Tu es seul dans ce groupe : il n'y a personne à qui confier l'administration.
              </Text>
            </View>
          ) : (
            <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
              <View className="gap-2">
                {candidates.map((m) => {
                  const name = m.user.first_name || m.user.username || "Membre";
                  const busy = pendingUserId === m.user.id;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => onSelect(m)}
                      disabled={!!pendingUserId}
                      className="flex-row items-center gap-3 rounded-input border px-3 py-3 active:opacity-80"
                      style={{ backgroundColor: colors.surface2, borderColor: colors.line }}
                    >
                      <Avatar
                        uri={m.user.avatar_url}
                        color={m.user.avatar_color}
                        icon={m.user.avatar_icon}
                        seed={m.user.id}
                        name={`${m.user.first_name ?? ""} ${m.user.last_name ?? ""}`.trim() || name}
                        size={40}
                      />
                      <View className="flex-1">
                        <Text
                          numberOfLines={1}
                          className="font-body-semibold text-[14px] text-cream"
                        >
                          {name}
                        </Text>
                        <Text className="mt-0.5 font-body text-[11px] text-cream-dim">
                          membre depuis le {formatDbDate(m.joinedAt)}
                        </Text>
                      </View>
                      {busy ? (
                        <ActivityIndicator size="small" color={colors.amber} />
                      ) : (
                        <ChevronRight size={18} color={colors.creamDim} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
