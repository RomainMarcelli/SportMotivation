/**
 * Configuration globale de l'app. Lit les variables d'environnement EXPO_PUBLIC_*.
 */

export const APP_ENV =
  (process.env.EXPO_PUBLIC_APP_ENV as "development" | "staging" | "production") ?? "development";

export const DEFAULT_TIMEZONE = process.env.EXPO_PUBLIC_DEFAULT_TIMEZONE ?? "Europe/Paris";

export const ENABLE_DEBUG_LOGS = process.env.EXPO_PUBLIC_ENABLE_DEBUG_LOGS === "true";

export const SUPABASE_PROJECT_ID = process.env.EXPO_PUBLIC_SUPABASE_PROJECT_ID;

export const IS_DEV = APP_ENV === "development";
