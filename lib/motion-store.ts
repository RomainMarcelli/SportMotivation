import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const STORAGE_KEY = "reduce-motion";

type MotionState = {
  /** Choix explicite de l'utilisateur dans les Paramètres. */
  reduced: boolean;
  setReduced: (reduced: boolean) => void;
  load: () => Promise<void>;
};

/**
 * Préférence « réduire les animations », persistée.
 *
 * Elle **s'ajoute** au réglage d'accessibilité du système : on peut couper les
 * animations dans l'app sans les couper partout sur son téléphone. À l'inverse,
 * si le système les a coupées, ce réglage ne peut pas les rallumer — le choix
 * d'accessibilité de l'appareil prime toujours (cf. `useAppReducedMotion`).
 */
export const useMotionStore = create<MotionState>((set) => ({
  reduced: false,
  setReduced: (reduced) => {
    AsyncStorage.setItem(STORAGE_KEY, reduced ? "1" : "0").catch(() => {});
    set({ reduced });
  },
  load: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      set({ reduced: saved === "1" });
    } catch {
      set({ reduced: false });
    }
  },
}));
