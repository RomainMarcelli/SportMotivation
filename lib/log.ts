import { ENABLE_DEBUG_LOGS } from "@/constants/config";

/**
 * Logger de debug : n'écrit que si EXPO_PUBLIC_ENABLE_DEBUG_LOGS=true.
 * Sert à tracer les erreurs Supabase (code + message) sans polluer la prod.
 */
export function debugLog(...args: unknown[]): void {
  if (ENABLE_DEBUG_LOGS) console.log("[debug]", ...args);
}

export function debugError(context: string, error: unknown): void {
  if (!ENABLE_DEBUG_LOGS) return;
  const e = error as { code?: string; message?: string; details?: string; hint?: string } | null;
  console.error(`[debug] ${context}`, {
    code: e?.code,
    message: e?.message,
    details: e?.details,
    hint: e?.hint,
  });
}
