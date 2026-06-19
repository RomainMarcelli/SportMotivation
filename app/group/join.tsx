import { useRouter } from "expo-router";
import { ArrowRight, Info, LogIn, QrCode } from "lucide-react-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";

import { AppBackground } from "@/components/ui/AppBackground";
import { GradientButton } from "@/components/ui/GradientButton";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { colors } from "@/constants/colors";
import { glow } from "@/lib/shadow";
import { isValidInviteCode, normalizeInviteCode } from "@/lib/group-code";

export default function JoinGroupScreen() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const valid = isValidInviteCode(code);

  return (
    <View className="flex-1">
      <AppBackground />
      <ScreenContainer transparent padded={false} edges={["bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <View className="flex-1 justify-center px-[22px]">
            <Reveal delay={0} className="items-center">
              <View
                className="h-[66px] w-[66px] items-center justify-center rounded-[20px]"
                style={glow({ color: colors.coral, offsetY: 14, radius: 28, opacity: 0.5 })}
              >
                <View className="absolute h-full w-full rounded-[20px] bg-coral" />
                <LogIn size={28} color={colors.onCoral} strokeWidth={2.2} />
              </View>
              <Text className="mt-4 text-center font-display text-[25px] tracking-tighter text-cream">
                Rejoins un défi
              </Text>
              <Text className="mt-2.5 max-w-[300px] text-center font-body text-[13px] leading-5 text-cream-dim">
                Saisis le code à 6 chiffres communiqué par l'admin du groupe.
              </Text>
            </Reveal>

            <Reveal delay={80} className="mt-8">
              <TextInput
                value={code}
                onChangeText={(t) => setCode(normalizeInviteCode(t))}
                placeholder="123456"
                placeholderTextColor="rgba(183,161,139,0.4)"
                keyboardType="number-pad"
                maxLength={6}
                style={{
                  height: 62,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: code.length > 0 ? colors.coral : colors.line,
                  borderRadius: 14,
                  textAlign: "center",
                  fontFamily: "BricolageGrotesque_800ExtraBold",
                  fontSize: 26,
                  letterSpacing: 8,
                  color: colors.cream,
                }}
              />
              <View className="mt-3 flex-row items-center justify-center gap-1.5">
                <Info size={13} color={colors.creamDim} />
                <Text className="font-body text-[11.5px] text-cream-dim">
                  Le code se trouve dans l'invitation.
                </Text>
              </View>
            </Reveal>

            <Reveal delay={140} className="mt-8 gap-3">
              <GradientButton
                iconRight={ArrowRight}
                disabled={!valid}
                onPress={() =>
                  router.push({ pathname: "/group/join-confirm", params: { code } } as never)
                }
              >
                Voir le défi
              </GradientButton>

              <View className="my-1 flex-row items-center gap-3">
                <View className="h-px flex-1 bg-line" />
                <Text className="font-body text-[12px] text-cream-dim">ou</Text>
                <View className="h-px flex-1 bg-line" />
              </View>

              <Pressable
                onPress={() => router.push("/group/scan" as never)}
                className="h-[52px] flex-row items-center justify-center gap-2.5 rounded-input border border-line-2 bg-surface active:opacity-80"
              >
                <QrCode size={18} color={colors.cream} />
                <Text className="font-display text-[15px] text-cream">Scanner un QR code</Text>
              </Pressable>
            </Reveal>
          </View>
        </KeyboardAvoidingView>
      </ScreenContainer>
    </View>
  );
}
