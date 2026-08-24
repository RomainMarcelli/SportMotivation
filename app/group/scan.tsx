import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { Camera, QrCode } from "lucide-react-native";
import { useRef } from "react";
import { Platform, Text, View } from "react-native";

import { AppBackground } from "@/components/ui/AppBackground";
import { GradientButton } from "@/components/ui/GradientButton";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { colors } from "@/constants/colors";
import { parseInviteData } from "@/lib/invite-link";

/** Encart centré DA pour les états sans caméra (web, permission refusée). */
function Centered({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-1">
      <AppBackground />
      <ScreenContainer transparent>
        <View className="flex-1 items-center justify-center gap-5">{children}</View>
      </ScreenContainer>
    </View>
  );
}

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  // Web : le scan caméra n'est pas fiable → on renvoie proprement vers la saisie du code.
  if (Platform.OS === "web") {
    return (
      <Centered>
        <View className="h-[72px] w-[72px] items-center justify-center rounded-hero border border-line-2 bg-surface">
          <QrCode size={32} color={colors.creamDim} />
        </View>
        <Text className="px-8 text-center font-body text-[14px] leading-5 text-cream-dim">
          Le scan de QR code n'est pas disponible sur le web. Saisis le code à 6 chiffres à la place.
        </Text>
        <View className="w-full max-w-[280px]">
          <GradientButton onPress={() => router.replace("/group/join" as never)}>
            Saisir le code
          </GradientButton>
        </View>
      </Centered>
    );
  }

  if (!permission) {
    return <View className="flex-1 bg-ink" />;
  }

  if (!permission.granted) {
    return (
      <Centered>
        <View className="h-[72px] w-[72px] items-center justify-center rounded-hero border border-line-2 bg-surface">
          <Camera size={32} color={colors.coral} />
        </View>
        <Text className="px-8 text-center font-body text-[14px] leading-5 text-cream-dim">
          On a besoin de la caméra pour scanner le QR code d'invitation.
        </Text>
        <View className="w-full max-w-[280px]">
          <GradientButton onPress={requestPermission}>Autoriser la caméra</GradientButton>
        </View>
      </Centered>
    );
  }

  const onScan = ({ data }: { data: string }) => {
    if (handled.current) return;
    const code = parseInviteData(data);
    if (!code) return;
    handled.current = true;
    router.replace({ pathname: "/group/join-confirm", params: { code } } as never);
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={onScan}
      />
      {/* Cadre de visée DA (coins coral) */}
      <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
        <View style={{ width: 230, height: 230 }}>
          <Corner pos="tl" />
          <Corner pos="tr" />
          <Corner pos="bl" />
          <Corner pos="br" />
        </View>
      </View>
      <View className="absolute inset-x-0 bottom-0 items-center p-8">
        <View className="rounded-full bg-black/60 px-5 py-3">
          <Text className="text-center font-body-medium text-[13px] text-cream">
            Vise le QR code d'invitation du groupe
          </Text>
        </View>
      </View>
    </View>
  );
}

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const base = { position: "absolute" as const, width: 30, height: 30, borderColor: colors.coral };
  const map = {
    tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
    tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
    bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
    br: {
      bottom: 0,
      right: 0,
      borderBottomWidth: 3,
      borderRightWidth: 3,
      borderBottomRightRadius: 10,
    },
  };
  return <View style={{ ...base, ...map[pos] }} />;
}
