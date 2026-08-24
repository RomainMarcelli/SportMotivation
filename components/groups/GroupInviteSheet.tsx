import { useRouter } from "expo-router";
import { AtSign, ChevronRight, ListChecks, QrCode } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { InviteBlock } from "@/components/groups/InviteBlock";
import { InviteByHandle } from "@/components/groups/InviteByHandle";
import { colors } from "@/constants/colors";

type Props = {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  inviteCode: string;
  memberIds: Set<string>;
  /** La recherche par pseudo est ouverte à tous ; seul le SUIVI des invitations
   *  envoyées (vue de gestion) reste réservé à l'admin. */
  isAdmin: boolean;
};

/**
 * Popup d'invitation — remplace l'ancienne page `/group/[id]/invite`, qui était
 * restée aux couleurs par défaut, hors DA.
 *
 * Deux temps, dans l'ordre du geste courant :
 *   1. chercher quelqu'un par son pseudo — **ouvert à tout membre** (l'invité
 *      reçoit une notification et accepte) ;
 *   2. sinon, le code + QR + lien, pour qui n'a pas encore l'app.
 *
 * Le même panneau sert au bouton « Inviter » du haut et à l'entrée « Inviter au
 * groupe » du menu ⋮. Seul le **suivi** des invitations envoyées (vue de gestion)
 * reste réservé à l'admin.
 */
export function GroupInviteSheet({
  visible,
  onClose,
  groupId,
  groupName,
  inviteCode,
  memberIds,
  isAdmin,
}: Props) {
  const router = useRouter();
  // Le bloc code/QR/lien démarre replié : plein écran, il repoussait la
  // recherche — pourtant le geste le plus courant — sous la ligne de flottaison.
  const [codeOpen, setCodeOpen] = useState(false);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Inviter au groupe" subtitle={groupName}>
      <View className="gap-3.5 pb-1">
        <View className="gap-2.5">
          <View className="flex-row items-center gap-2 px-0.5">
            <AtSign size={14} color={colors.coral} />
            <Text className="font-body-bold text-[11px] uppercase tracking-label text-cream-dim">
              Chercher un joueur
            </Text>
          </View>
          <InviteByHandle groupId={groupId} memberIds={memberIds} />
        </View>

        {/* Code / QR / lien — replié derrière une ligne pour l'admin. */}
        <View className="overflow-hidden rounded-[16px] border" style={{ borderColor: colors.line }}>
          <Pressable
            onPress={() => setCodeOpen((v) => !v)}
            className="flex-row items-center gap-3 p-3.5 active:opacity-80"
            style={{ backgroundColor: colors.surface }}
          >
            <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-surface-2">
              <QrCode size={17} color={colors.creamDim} />
            </View>
            <View className="flex-1">
              <Text className="font-body-semibold text-[13.5px] text-cream">
                Code, QR code et lien
              </Text>
              <Text className="mt-0.5 font-body text-[11.5px] text-cream-dim">
                Pour inviter quelqu'un qui n'a pas encore l'app
              </Text>
            </View>
            <ChevronRight
              size={17}
              color={colors.creamDim}
              style={{ transform: [{ rotate: codeOpen ? "90deg" : "0deg" }] }}
            />
          </Pressable>

          {codeOpen ? (
            <View className="border-t p-3.5" style={{ borderColor: colors.line }}>
              <InviteBlock inviteCode={inviteCode} groupName={groupName} />
            </View>
          ) : null}
        </View>

        {isAdmin ? (
          <Pressable
            onPress={() => {
              onClose();
              router.push({ pathname: "/group/[id]/invitations", params: { id: groupId } } as never);
            }}
            className="flex-row items-center gap-3 rounded-[16px] border p-3.5 active:opacity-80"
            style={{ backgroundColor: colors.surface, borderColor: colors.line }}
          >
            <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-surface-2">
              <ListChecks size={17} color={colors.creamDim} />
            </View>
            <Text className="flex-1 font-body-semibold text-[13.5px] text-cream">
              Invitations envoyées
            </Text>
            <ChevronRight size={17} color={colors.creamDim} />
          </Pressable>
        ) : null}
      </View>
    </BottomSheet>
  );
}
