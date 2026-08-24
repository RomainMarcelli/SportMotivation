import * as WebBrowser from "expo-web-browser";
import { ExternalLink, FileText, RefreshCw, Trash2, X } from "lucide-react-native";
import { Image, Modal, Platform, Pressable, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import type { JustificationKind } from "@/features/excuses/attachment";

/** Ouvre un PDF hors de l'app : nouvel onglet sur web (Chrome bloque les PDF en iframe),
 *  visionneuse système sur iOS/Android. */
function openPdf(uri: string) {
  if (Platform.OS === "web") {
    window.open(uri, "_blank", "noopener");
    return;
  }
  WebBrowser.openBrowserAsync(uri).catch(() => {});
}

type Props = {
  visible: boolean;
  onClose: () => void;
  uri: string;
  kind: JustificationKind;
  name?: string;
  /** Si fournis, affiche la barre d'actions (remplacer / supprimer). */
  onReplace?: () => void;
  onRemove?: () => void;
};

/**
 * Aperçu plein écran d'un justificatif d'excuse.
 * - Image : rendu direct (contain) sur toutes les plateformes.
 * - PDF : ouverture HORS de l'app (nouvel onglet web / visionneuse système native) —
 *   Chrome bloque le rendu d'un PDF dans une iframe, et React Native ne sait pas le
 *   rendre sans librairie dédiée.
 */
export function JustificationViewer({
  visible,
  onClose,
  uri,
  kind,
  name,
  onReplace,
  onRemove,
}: Props) {
  const hasActions = !!onReplace || !!onRemove;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1" style={{ backgroundColor: "rgba(0,0,0,0.94)" }}>
        {/* Fermer */}
        <Pressable
          onPress={onClose}
          hitSlop={10}
          accessibilityLabel="Fermer"
          className="absolute right-5 top-12 z-10 h-11 w-11 items-center justify-center rounded-full active:opacity-80"
          style={{ backgroundColor: "rgba(255,238,221,0.12)" }}
        >
          <X size={22} color={colors.cream} strokeWidth={2.4} />
        </Pressable>

        <View className="flex-1 items-center justify-center px-4 pb-4 pt-20">
          {kind === "image" ? (
            <Image
              source={{ uri }}
              resizeMode="contain"
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <View className="items-center gap-4">
              <View
                className="h-20 w-20 items-center justify-center rounded-2xl"
                style={{ backgroundColor: colors.surface2 }}
              >
                <FileText size={38} color={colors.coral} strokeWidth={1.8} />
              </View>
              <Text className="text-center font-display text-[17px] tracking-tight text-cream">
                {name ?? "Justificatif PDF"}
              </Text>
              <Text className="text-center font-body text-[12px] leading-[1.5] text-cream-dim">
                {Platform.OS === "web"
                  ? "Le PDF s'ouvre dans un nouvel onglet."
                  : "Le PDF s'ouvre dans la visionneuse de ton téléphone."}
              </Text>
              <Pressable
                onPress={() => openPdf(uri)}
                className="flex-row items-center gap-2 rounded-full px-6 py-3 active:opacity-85"
                style={{ backgroundColor: colors.coral }}
              >
                <ExternalLink size={16} color={colors.onCoral} strokeWidth={2.4} />
                <Text className="font-body-bold text-[14px]" style={{ color: colors.onCoral }}>
                  Ouvrir le PDF
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Actions */}
        {hasActions ? (
          <View
            className="flex-row gap-2.5 px-5 pb-10 pt-2"
            style={{ backgroundColor: "transparent" }}
          >
            {onReplace ? (
              <Pressable
                onPress={onReplace}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-input border py-3.5 active:opacity-80"
                style={{ backgroundColor: colors.surface, borderColor: colors.line2 }}
              >
                <RefreshCw size={17} color={colors.cream} />
                <Text className="font-body-semibold text-[14px] text-cream">Remplacer</Text>
              </Pressable>
            ) : null}
            {onRemove ? (
              <Pressable
                onPress={onRemove}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-input py-3.5 active:opacity-85"
                style={{ backgroundColor: colors.redSoft, borderWidth: 1, borderColor: colors.red }}
              >
                <Trash2 size={17} color={colors.red} />
                <Text className="font-body-semibold text-[14px]" style={{ color: colors.red }}>
                  Supprimer
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
