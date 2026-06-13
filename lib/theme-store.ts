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
export const useThemeStore = create<ThemeState>((set) => ({
  pref: "system",
  setPref: (pref) => {
    colorScheme.set(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref).catch(() => {});
    set({ pref });
  },
  load: async () => {
    try {
      const saved = (await AsyncStorage.getItem(STORAGE_KEY)) as ThemePref | null;
      const pref = saved ?? "system";
      colorScheme.set(pref);
      set({ pref });
    } catch {
      // ignore — on reste sur "system"
    }
  },
}));
