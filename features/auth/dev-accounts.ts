import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

/**
 * Bascule rapide entre comptes — **outil de DEV uniquement** (`__DEV__`).
 *
 * Permet de tester les flux à plusieurs (vote d'une séance/excuse d'un autre membre) sans se
 * reconnecter à la main. On mémorise la session Supabase (access + refresh token) de chaque compte
 * qui s'est connecté, puis `setSession()` rebascule dessus.
 *
 * ⚠ Volontairement inactif en production : on ne veut pas laisser traîner les refresh tokens de
 * plusieurs comptes sur l'appareil d'un vrai utilisateur.
 */

const KEY = "sportmotiv.dev-accounts.v1";

export const devSwitcherEnabled = __DEV__;

export type DevAccount = {
  id: string;
  email: string;
  label: string;
  accessToken: string;
  refreshToken: string;
  savedAt: string;
};

async function readAll(): Promise<DevAccount[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DevAccount[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(list: DevAccount[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // stockage indisponible (SSR web) : on ignore, la fonctionnalité est un confort de dev.
  }
}

export async function listDevAccounts(): Promise<DevAccount[]> {
  if (!devSwitcherEnabled) return [];
  return readAll();
}

/** Mémorise (ou rafraîchit) la session du compte connecté. Appelé à chaque changement d'auth. */
export async function rememberDevAccount(session: Session): Promise<void> {
  if (!devSwitcherEnabled) return;
  const user = session.user;
  if (!user?.id || !session.refresh_token) return;

  const meta = (user.user_metadata ?? {}) as { first_name?: string; username?: string };
  const label = meta.first_name || meta.username || user.email || "Compte";

  const list = await readAll();
  const entry: DevAccount = {
    id: user.id,
    email: user.email ?? "",
    label,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    savedAt: new Date().toISOString(),
  };
  await writeAll([entry, ...list.filter((a) => a.id !== user.id)]);
}

/** Rebascule sur un compte mémorisé (rafraîchit le token au besoin). */
export async function switchDevAccount(account: DevAccount): Promise<void> {
  const { error } = await supabase.auth.setSession({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
  });
  if (error) throw error;
}

export async function forgetDevAccount(id: string): Promise<void> {
  const list = await readAll();
  await writeAll(list.filter((a) => a.id !== id));
}

/**
 * Se déconnecte **localement** pour aller connecter un compte supplémentaire.
 * `scope: "local"` n'invalide pas le refresh token côté serveur → les autres comptes
 * mémorisés restent utilisables.
 */
export async function signOutForAddAccount(): Promise<void> {
  await supabase.auth.signOut({ scope: "local" });
}
