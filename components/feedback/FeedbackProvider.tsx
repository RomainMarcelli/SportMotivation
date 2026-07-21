import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react-native";

import { colors, gradients } from "@/constants/colors";

type ToastType = "success" | "error" | "info";

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  /** `null` masque le bouton d'annulation → la popup devient un simple accusé de réception. */
  cancelLabel?: string | null;
  destructive?: boolean;
  /** Pictogramme d'entête. `destructive` force le ton « danger ». */
  tone?: "info" | "danger" | "success";
};

type FeedbackContextValue = {
  toast: (message: string, type?: ToastType) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Popup d'information à un seul bouton (rien à confirmer, juste à lire). */
  alert: (options: Omit<ConfirmOptions, "cancelLabel" | "destructive">) => Promise<void>;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

/** Accès aux toasts et dialogues de confirmation animés. À utiliser sous <FeedbackProvider>. */
export function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback doit être utilisé dans <FeedbackProvider>.");
  return ctx;
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toastState, setToastState] = useState<{ message: string; type: ToastType } | null>(null);
  const [confirmState, setConfirmState] = useState<
    (ConfirmOptions & { resolve: (v: boolean) => void }) | null
  >(null);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    setToastState({ message, type });
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...options, resolve });
    });
  }, []);

  const alert = useCallback(
    async (options: Omit<ConfirmOptions, "cancelLabel" | "destructive">) => {
      await new Promise<boolean>((resolve) => {
        setConfirmState({
          confirmLabel: "OK",
          ...options,
          cancelLabel: null,
          resolve,
        });
      });
    },
    []
  );

  const closeConfirm = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  return (
    <FeedbackContext.Provider value={{ toast, confirm, alert }}>
      {children}
      {toastState ? (
        <Toast
          message={toastState.message}
          type={toastState.type}
          onHide={() => setToastState(null)}
        />
      ) : null}
      <ConfirmDialog state={confirmState} onClose={closeConfirm} />
    </FeedbackContext.Provider>
  );
}

const TOAST_COLORS: Record<ToastType, string> = {
  success: colors.mint,
  error: colors.red,
  info: colors.amber,
};

function Toast({
  message,
  type,
  onHide,
}: {
  message: string;
  type: ToastType;
  onHide: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const Icon = type === "success" ? CheckCircle2 : type === "error" ? XCircle : Info;

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 7 }).start();
    const timer = setTimeout(() => {
      Animated.timing(anim, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => onHide());
    }, 2600);
    return () => clearTimeout(timer);
  }, [anim, onHide]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 56,
        left: 16,
        right: 16,
        opacity: anim,
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
        ],
      }}
    >
      <View
        className="flex-row items-center gap-3 rounded-2xl border px-4 py-3"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.line2,
          shadowColor: "#000",
          shadowOpacity: 0.45,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 8,
        }}
      >
        <Icon size={20} color={TOAST_COLORS[type]} />
        <Text className="flex-1 font-body-medium text-[13.5px] text-cream">{message}</Text>
      </View>
    </Animated.View>
  );
}

function ConfirmDialog({
  state,
  onClose,
}: {
  state: (ConfirmOptions & { resolve: (v: boolean) => void }) | null;
  onClose: (value: boolean) => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const visible = !!state;

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
    }
  }, [visible, anim]);

  if (!state) return null;

  const destructive = state.destructive;
  const tone = destructive ? "danger" : state.tone ?? "info";
  const showCancel = state.cancelLabel !== null;

  const ToneIcon = tone === "danger" ? AlertTriangle : tone === "success" ? CheckCircle2 : Info;
  const toneColor =
    tone === "danger" ? colors.red : tone === "success" ? colors.mint : colors.amber;
  const toneSoft =
    tone === "danger" ? colors.redSoft : tone === "success" ? colors.mintSoft : colors.amberSoft;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => onClose(false)}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
        <Pressable className="flex-1" onPress={() => onClose(false)} />
        <Animated.View
          style={{
            opacity: anim,
            transform: [
              { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
            ],
          }}
        >
          <View
            className="rounded-t-[28px] border-x border-t px-5 pb-8 pt-5"
            style={{ backgroundColor: colors.surface, borderColor: colors.line2 }}
          >
            <View
              className="mb-4 h-1 w-10 self-center rounded-full"
              style={{ backgroundColor: colors.line2 }}
            />

            <View className="flex-row items-center gap-3">
              <View
                className="h-11 w-11 items-center justify-center rounded-hero"
                style={{ backgroundColor: toneSoft }}
              >
                <ToneIcon size={22} color={toneColor} />
              </View>
              <Text className="flex-1 font-display text-[18px] tracking-tight text-cream">
                {state.title}
              </Text>
            </View>

            {state.message ? (
              <Text className="mt-3 font-body text-[13px] leading-[1.5] text-cream-dim">
                {state.message}
              </Text>
            ) : null}

            <View className="mt-5 gap-2.5">
              {destructive ? (
                <Pressable
                  onPress={() => onClose(true)}
                  className="items-center rounded-input py-4 active:opacity-90"
                  style={{ backgroundColor: colors.red }}
                >
                  <Text className="font-body-bold text-[15px]" style={{ color: colors.cream }}>
                    {state.confirmLabel ?? "Confirmer"}
                  </Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => onClose(true)} className="active:opacity-90">
                  <LinearGradient
                    {...gradients.brand}
                    style={{
                      height: 54,
                      borderRadius: 16,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text className="font-display text-[15px]" style={{ color: colors.onCoral }}>
                      {state.confirmLabel ?? "Confirmer"}
                    </Text>
                  </LinearGradient>
                </Pressable>
              )}

              {showCancel ? (
                <Pressable
                  onPress={() => onClose(false)}
                  className="items-center rounded-input border border-line-2 py-4 active:opacity-80"
                  style={{ backgroundColor: colors.surface2 }}
                >
                  <Text className="font-body-semibold text-[15px] text-cream">
                    {state.cancelLabel ?? "Annuler"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
