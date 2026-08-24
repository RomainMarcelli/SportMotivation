import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

import type { Database } from "@/types/database.types";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[supabase] EXPO_PUBLIC_SUPABASE_URL ou EXPO_PUBLIC_SUPABASE_ANON_KEY manquant dans .env. " +
      "L'app fonctionnera mais aucun appel Supabase ne sera possible."
  );
}

/**
 * Sur le web, Expo Router rend les pages côté serveur (Node). Node < 22 n'a pas de
 * `WebSocket` natif, or le `RealtimeClient` de supabase-js en exige un à la construction
 * (même si on n'utilise pas le realtime) → erreur serveur. On lui fournit `ws` uniquement
 * dans ce cas : le navigateur et le natif (React Native) ont déjà un `WebSocket` global.
 */
const realtimeFallback =
  typeof WebSocket === "undefined"
    ? { realtime: { transport: require("ws") as unknown as typeof WebSocket } }
    : {};

export const supabase = createClient<Database>(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder-key",
  {
    auth: {
      // Natif : AsyncStorage. Web : on laisse supabase choisir (localStorage en navigateur,
      // mémoire au rendu serveur). AsyncStorage lit `window` et casse le SSR Node.
      ...(Platform.OS === "web" ? {} : { storage: AsyncStorage }),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    ...realtimeFallback,
  }
);
