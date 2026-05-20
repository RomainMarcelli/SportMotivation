import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useRef } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { parseInviteData } from "@/lib/invite-link";

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6 dark:bg-neutral-900">
        <Text className="mb-6 text-center text-base text-neutral-600 dark:text-neutral-400">
          On a besoin de la caméra pour scanner le QR code d'invitation.
        </Text>
        <View className="w-full max-w-xs">
          <Button onPress={requestPermission}>Autoriser la caméra</Button>
        </View>
      </View>
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
      <View className="absolute inset-x-0 bottom-0 items-center p-8">
        <View className="rounded-full bg-black/60 px-5 py-3">
          <Text className="text-center text-sm text-white">
            Vise le QR code d'invitation du groupe
          </Text>
        </View>
      </View>
    </View>
  );
}
