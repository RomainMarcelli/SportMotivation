import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, Text, View } from "react-native";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react-native";

type ToastType = "success" | "error" | "info";

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type FeedbackContextValue = {
  toast: (message: string, type?: ToastType) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
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

  const closeConfirm = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
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
  success: "#16a34a",
  error: "#ef4444",
  info: "#3b82f6",
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
      <View className="flex-row items-center gap-3 rounded-2xl bg-neutral-900 px-4 py-3 shadow-lg dark:bg-neutral-800">
        <Icon size={20} color={TOAST_COLORS[type]} />
        <Text className="flex-1 text-sm font-medium text-white">{message}</Text>
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

  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => onClose(false)}>
      <Pressable
        onPress={() => onClose(false)}
        className="flex-1 items-center justify-center bg-black/50 p-6"
      >
        <Animated.View
          style={{
            width: "100%",
            maxWidth: 360,
            transform: [
              { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
            ],
            opacity: anim,
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="gap-4 rounded-3xl bg-white p-6 dark:bg-neutral-800"
          >
            <View className="flex-row items-center gap-3">
              <View
                className={`h-11 w-11 items-center justify-center rounded-full ${
                  destructive ? "bg-red-100 dark:bg-red-950" : "bg-primary-50 dark:bg-neutral-700"
                }`}
              >
                {destructive ? (
                  <AlertTriangle size={22} color="#ef4444" />
                ) : (
                  <Info size={22} color="#3b82f6" />
                )}
              </View>
              <Text className="flex-1 text-lg font-bold text-neutral-900 dark:text-white">
                {state.title}
              </Text>
            </View>

            {state.message ? (
              <Text className="text-sm leading-5 text-neutral-600 dark:text-neutral-300">
                {state.message}
              </Text>
            ) : null}

            <View className="mt-2 flex-row gap-3">
              <Pressable
                onPress={() => onClose(false)}
                className="flex-1 items-center justify-center rounded-xl border border-neutral-200 py-3 active:opacity-70 dark:border-neutral-600"
              >
                <Text className="text-base font-semibold text-neutral-700 dark:text-neutral-200">
                  {state.cancelLabel ?? "Annuler"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onClose(true)}
                className={`flex-1 items-center justify-center rounded-xl py-3 active:opacity-80 ${
                  destructive ? "bg-red-500" : "bg-primary-500"
                }`}
              >
                <Text className="text-base font-semibold text-white">
                  {state.confirmLabel ?? "Confirmer"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
