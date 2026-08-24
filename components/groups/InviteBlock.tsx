import * as Clipboard from "expo-clipboard";
import { Check, Copy, Link2, Share2, X } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, Share, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { GradientButton } from "@/components/ui/GradientButton";
import { colors } from "@/constants/colors";
import { buildInviteLink } from "@/lib/invite-link";

type Props = {
  inviteCode: string;
  groupName: string;
};

/**
 * Bloc d'invitation DA réutilisable (QR code + code à 6 chiffres + lien + partage).
 * Utilisé à l'identique sur l'écran d'invitation et sous les règles du détail du groupe.
 */
export function InviteBlock({ inviteCode, groupName }: Props) {
  const { toast } = useFeedback();
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(false);
  const link = buildInviteLink(inviteCode);

  const copyCode = async () => {
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const copyLink = async () => {
    await Clipboard.setStringAsync(link);
    toast("Lien copié", "success");
  };

  const onShare = async () => {
    await Share.share({
      message: `Rejoins mon défi sportif "${groupName}" sur Sport Motiv !\n\nCode : ${inviteCode}\nLien : ${link}`,
    });
  };

  return (
    <View className="gap-3">
      {/* QR code (fond clair pour rester scannable) */}
      <View className="items-center rounded-[18px] border border-line bg-surface px-4 py-5">
        <Pressable
          onPress={() => setZoom(true)}
          className="rounded-[16px] p-3.5 active:opacity-80"
          style={{ backgroundColor: colors.cream }}
          accessibilityLabel="Agrandir le QR code"
        >
          <QRCode value={link} size={168} backgroundColor={colors.cream} color={colors.ink} />
        </Pressable>
        <Text className="mt-4 font-body-bold text-[11px] uppercase tracking-label text-cream-dim">
          Code d'invitation
        </Text>
        <Pressable
          onPress={copyCode}
          className="mt-1.5 flex-row items-center gap-3 active:opacity-70"
          accessibilityLabel="Copier le code"
        >
          <Text className="font-display text-[32px] tracking-[8px] text-cream">{inviteCode}</Text>
          {copied ? (
            <Check size={22} color={colors.mint} strokeWidth={2.6} />
          ) : (
            <Copy size={20} color={colors.creamDim} />
          )}
        </Pressable>
        <Text className="mt-1 font-body text-[11px] text-cream-dim">
          {copied ? "Code copié !" : "Appuie pour copier"}
        </Text>
      </View>

      <GradientButton icon={Share2} onPress={onShare}>
        Partager l'invitation
      </GradientButton>

      {/* Lien copiable */}
      <Pressable
        onPress={copyLink}
        className="flex-row items-center gap-2.5 rounded-input border border-line bg-surface px-3.5 py-3 active:opacity-80"
        accessibilityLabel="Copier le lien"
      >
        <Link2 size={17} color={colors.creamDim} />
        <Text className="flex-1 font-body text-[12.5px] text-cream-dim" numberOfLines={1}>
          {link}
        </Text>
        <Copy size={16} color={colors.creamDim} />
      </Pressable>

      {/* QR code en plein écran */}
      <Modal visible={zoom} transparent animationType="fade" onRequestClose={() => setZoom(false)}>
        <Pressable
          onPress={() => setZoom(false)}
          className="flex-1 items-center justify-center px-8"
          style={{ backgroundColor: "rgba(0,0,0,0.94)" }}
        >
          <View className="rounded-[24px] p-6" style={{ backgroundColor: colors.cream }}>
            <QRCode value={link} size={280} backgroundColor={colors.cream} color={colors.ink} />
          </View>
          <Text className="mt-6 font-display text-[26px] tracking-[10px] text-cream">
            {inviteCode}
          </Text>
          <Pressable
            onPress={() => setZoom(false)}
            accessibilityLabel="Fermer"
            style={{
              position: "absolute",
              top: 50,
              right: 20,
              height: 44,
              width: 44,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 22,
              backgroundColor: "rgba(255,238,221,0.12)",
            }}
          >
            <X size={24} color={colors.cream} strokeWidth={2.4} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
