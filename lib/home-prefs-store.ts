import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

/**
 * Préférences d'affichage de l'accueil, PERSISTÉES et PERSONNELLES.
 *
 * Choix assumé : stockage **local** (AsyncStorage), pas en base. C'est un réglage
 * de confort par appareil (l'ordre dans lequel je veux voir MES défis, les infos
 * que je veux afficher) — pas une donnée métier partagée. Ça évite une table +
 * RLS + un aller-retour réseau pour un simple glisser-monter, et l'interrupteur
 * répond instantanément. Le jour où on veut la synchro multi-appareils, on
 * remplacera la persistance ici sans toucher aux écrans.
 */

const STORAGE_KEY = "home-prefs.v1";

export type HomeStatPrefs = {
  /** Afficher la cagnotte du défi sur le hero d'accueil. */
  pot: boolean;
  /** Afficher la pile de membres. */
  members: boolean;
};

export const DEFAULT_HOME_STATS: HomeStatPrefs = { pot: true, members: true };

type HomePrefsState = {
  /**
   * Ordre personnalisé des défis (identifiants de groupe). Les défis absents de
   * cette liste sont ajoutés à la fin (cf. `orderGroups`). Vide = ordre naturel.
   */
  groupOrder: string[];
  stats: HomeStatPrefs;
  loaded: boolean;
  setGroupOrder: (order: string[]) => void;
  setStat: (key: keyof HomeStatPrefs, value: boolean) => void;
  load: () => Promise<void>;
};

function persist(groupOrder: string[], stats: HomeStatPrefs) {
  // Best-effort : un stockage indisponible ne doit pas casser l'app, la
  // préférence reste simplement valable pour cette session.
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ groupOrder, stats })).catch(() => {});
}

export const useHomePrefsStore = create<HomePrefsState>((set, get) => ({
  groupOrder: [],
  stats: DEFAULT_HOME_STATS,
  loaded: false,
  setGroupOrder: (order) => {
    set({ groupOrder: order });
    persist(order, get().stats);
  },
  setStat: (key, value) => {
    const stats = { ...get().stats, [key]: value };
    set({ stats });
    persist(get().groupOrder, stats);
  },
  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<{ groupOrder: unknown; stats: unknown }>;
        set({
          groupOrder: Array.isArray(parsed.groupOrder)
            ? parsed.groupOrder.filter((x): x is string => typeof x === "string")
            : [],
          // On repart des valeurs par défaut puis on écrase avec ce qui est stocké :
          // une clé ajoutée plus tard reste ainsi activée par défaut.
          stats: { ...DEFAULT_HOME_STATS, ...(parsed.stats as object | undefined) },
          loaded: true,
        });
        return;
      }
    } catch {
      // Illisible → on garde les valeurs par défaut.
    }
    set({ loaded: true });
  },
}));
