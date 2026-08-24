import AsyncStorage from "@react-native-async-storage/async-storage";
import { colorScheme } from "nativewind";
import { create } from "zustand";

export type ThemePref = "system" | "light" | "dark";

const STORAGE_KEY = "theme-pref";

type ThemeState = {
  pref: ThemePref;
  setPref: (pref: ThemePref) => void;
  load: () => Promise<void>;
};

/**
 * Préférence de thème (clair / sombre / système), persistée et appliquée via NativeWind.
 * `load()` est appelé au démarrage de l'app pour restaurer le choix de l'utilisateur.
 */
// L'app est dark-first : tant que l'utilisateur n'a rien choisi, on force le sombre.
const DEFAULT_PREF: ThemePref = "dark";

export const useThemeStore = create<ThemeState>((set) => ({
  pref: DEFAULT_PREF,
  setPref: (pref) => {
    colorScheme.set(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref).catch(() => {});
    set({ pref });
  },
  load: async () => {
    try {
      const saved = (await AsyncStorage.getItem(STORAGE_KEY)) as ThemePref | null;
      const pref = saved ?? DEFAULT_PREF;
      colorScheme.set(pref);
      set({ pref });
    } catch {
      colorScheme.set(DEFAULT_PREF);
      set({ pref: DEFAULT_PREF });
    }
  },
}));
