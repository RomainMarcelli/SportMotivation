import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Seed PRIVILÉGIÉ pour l'E2E (clé `service_role`).
 *
 * Certains états — cagnotte remplie (pénalités), défi terminé — sont produits côté
 * serveur par la CLÔTURE HEBDO / la fin de défi (cron + gardes de dates). Impossible
 * de les déclencher depuis le client authentifié sur un groupe créé le jour même. On
 * les met donc en place directement en base, avec la clé service_role — qui vit
 * UNIQUEMENT dans le runner E2E (jamais dans le bundle : pas de préfixe EXPO_PUBLIC_).
 *
 * Si la clé n'est pas fournie, `hasServiceRole()` renvoie `false` et les specs qui en
 * dépendent se `test.skip()` (la suite reste verte). Pour les activer :
 *   $env:SUPABASE_SERVICE_ROLE_KEY = "<clé service_role du projet Supabase de dev>"
 * (l'URL est lue depuis `.env` : EXPO_PUBLIC_SUPABASE_URL).
 */

/** Lit une variable d'env, avec repli sur le fichier `.env` du projet (non chargé par Node). */
function readEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  try {
    const content = readFileSync(join(process.cwd(), ".env"), "utf8");
    const line = content.split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
    const value = line?.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
    return value || undefined;
  } catch {
    return undefined;
  }
}

const SUPABASE_URL = readEnv("EXPO_PUBLIC_SUPABASE_URL");
const SERVICE_ROLE_KEY = readEnv("SUPABASE_SERVICE_ROLE_KEY");

let cached: SupabaseClient | null = null;

/** La clé service_role est-elle disponible ? (sinon, les specs de seed se skippent). */
export function hasServiceRole(): boolean {
  return !!SUPABASE_URL && !!SERVICE_ROLE_KEY;
}

/** Client Supabase service_role (bypasse la RLS). Lève si la clé n'est pas fournie. */
function admin(): SupabaseClient {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Seed privilégié indisponible : SUPABASE_SERVICE_ROLE_KEY manquant.");
  }
  if (!cached) {
    cached = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

/** Date locale (+offset jours) au format "YYYY-MM-DD". */
function isoDay(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Aujourd'hui au format "YYYY-MM-DD". */
function todayISO(): string {
  return isoDay(0);
}

/** Lundi (00:00) de la semaine courante au format "YYYY-MM-DD". */
function currentMonday(): string {
  const d = new Date();
  const dow = (d.getDay() + 6) % 7; // 0 = lundi
  d.setDate(d.getDate() - dow);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Est-on un lundi ? (aucun jour PASSÉ n'est alors sélectionnable dans la semaine). */
export function isMonday(): boolean {
  return new Date().getDay() === 1;
}

/** L'admin (créateur) d'un groupe. */
async function adminUserId(groupId: string): Promise<string> {
  const { data, error } = await admin()
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("role", "admin")
    .is("left_at", null)
    .limit(1)
    .single();
  if (error) throw error;
  return data.user_id as string;
}

/** L'id de la cagnotte du groupe (créée à la volée si le groupe n'en a pas encore). */
async function ensurePotId(groupId: string): Promise<string> {
  const found = await admin().from("pots").select("id").eq("group_id", groupId).maybeSingle();
  if (found.data?.id) return found.data.id as string;
  const created = await admin()
    .from("pots")
    .insert({ group_id: groupId })
    .select("id")
    .single();
  if (created.error) throw created.error;
  return created.data.id as string;
}

/**
 * Ajoute une pénalité « séance manquée » à l'admin du groupe et l'impute à la
 * cagnotte (miroir de `run_weekly_closure`, mais SCOPÉ à ce seul groupe — donc sans
 * effet global sur le backend de dev partagé). Robuste à un éventuel trigger
 * `penalties → pot_transactions` : on ne crée la transaction que si elle manque,
 * puis on recalcule le total depuis la somme.
 *
 * @returns { userId, amount } l'utilisateur pénalisé et le montant.
 */
export async function seedCagnottePenalty(
  groupId: string,
  amount: number,
  targetUserId?: string
): Promise<{ userId: string; amount: number }> {
  // Par défaut l'admin ; on peut viser un autre membre (ex. pour la RELANCE, qui
  // par conception ne notifie pas le trésorier lui-même — il faut donc un DÛ sur un
  // AUTRE membre pour que la relance ait un destinataire).
  const userId = targetUserId ?? (await adminUserId(groupId));
  const potId = await ensurePotId(groupId);

  const pen = await admin()
    .from("penalties")
    .insert({
      group_id: groupId,
      user_id: userId,
      amount,
      penalty_type: "missed_session",
      week_start: currentMonday(),
    })
    .select("id")
    .single();
  if (pen.error) throw pen.error;

  // Transaction seulement si un trigger ne l'a pas déjà créée.
  const existing = await admin()
    .from("pot_transactions")
    .select("id")
    .eq("related_penalty_id", pen.data.id)
    .maybeSingle();
  if (!existing.data) {
    const tx = await admin().from("pot_transactions").insert({
      pot_id: potId,
      user_id: userId,
      amount,
      transaction_type: "penalty_added",
      related_penalty_id: pen.data.id,
      is_paid: false,
    });
    if (tx.error) throw tx.error;
  }

  // Recalcul du total depuis les transactions 'penalty_added' (idempotent).
  const sumRows = await admin()
    .from("pot_transactions")
    .select("amount")
    .eq("pot_id", potId)
    .eq("transaction_type", "penalty_added");
  const total = (sumRows.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const upd = await admin()
    .from("pots")
    .update({ total_amount: total, updated_at: new Date().toISOString() })
    .eq("id", potId);
  if (upd.error) throw upd.error;

  return { userId, amount };
}

/**
 * Ajoute un BLÂME (« vote manqué ») à l'admin du groupe. Normalement produit par le
 * cron `apply_session_blames` (054) quand un membre ne vote pas une séance avant
 * l'échéance — reproduire ce contexte réel demanderait de rétro-dater publication et
 * `joined_at`. On seede donc directement : une séance support (le blâme la référence
 * en FK) + une ligne `blames` non soldée. La vue `v_member_unsettled_blames` compte
 * alors 1 blâme → le dashboard affiche la section « Blâmes » (« Toi · 1 »).
 *
 * @returns { userId } le membre blâmé.
 */
export async function seedBlame(groupId: string): Promise<{ userId: string }> {
  const userId = await adminUserId(groupId);

  // Séance support (validée → ne pollue pas les listes « à voter »).
  const sess = await admin()
    .from("sessions")
    .insert({
      group_id: groupId,
      user_id: userId,
      activity_type: "Course",
      duration_min: 30,
      performed_at: currentMonday(),
      week_start: currentMonday(),
      status: "validated",
    })
    .select("id")
    .single();
  if (sess.error) throw sess.error;

  const bl = await admin().from("blames").insert({
    group_id: groupId,
    user_id: userId,
    session_id: sess.data.id,
    settled: false,
  });
  if (bl.error) throw bl.error;

  return { userId };
}

/**
 * Le membre NON-admin d'un groupe (le joueur invité, ex. « Bob »). Sert aux flux
 * « demande → notif » où c'est un membre, pas l'admin, qui déclenche la demande.
 */
export async function nonAdminMemberId(groupId: string): Promise<string> {
  const { data, error } = await admin()
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .neq("role", "admin")
    .is("left_at", null)
    .limit(1)
    .single();
  if (error) throw error;
  return data.user_id as string;
}

/**
 * Écrit une (des) règle(s) du groupe directement en base (contourne l'assistant de
 * création qui ne les expose pas toutes). Ex. `{ publication_deadline: "same_day" }`
 * pour forcer la règle « jour même », ou `{ max_sessions_per_day: 1 }` pour la limite.
 */
export async function setGroupRules(
  groupId: string,
  patch: { publication_deadline?: "same_day" | "end_of_week"; max_sessions_per_day?: number | null }
): Promise<void> {
  const { error } = await admin().from("groups").update(patch).eq("id", groupId);
  if (error) throw error;
}

/**
 * Seede une séance VALIDÉE d'AUJOURD'HUI pour un membre (consomme son quota du jour :
 * `sessions_used_on` compte toute séance non-`rejected`). Combiné à
 * `max_sessions_per_day = 1`, la prochaine déclaration du membre lèvera
 * `DAILY_LIMIT_REACHED` → la modale de demande de séance supplémentaire.
 */
export async function seedTodaySession(groupId: string, userId: string): Promise<void> {
  const { error } = await admin().from("sessions").insert({
    group_id: groupId,
    user_id: userId,
    activity_type: "Course",
    duration_min: 30,
    performed_at: todayISO(),
    week_start: currentMonday(),
    status: "validated",
  });
  if (error) throw error;
}

/**
 * Fait « terminer » un défi : recule `challenge_end` à hier. `unlock_pot` exige
 * `challenge_end <= aujourd'hui` (ou statut completed/cancelled) → le bouton
 * « Débloquer la cagnotte » de l'app fonctionne alors réellement (RPC serveur).
 */
export async function endChallenge(groupId: string): Promise<void> {
  // On recule DÉBUT et FIN dans le passé (fin = hier, début = il y a une semaine) : la
  // contrainte `valid_challenge_dates` impose fin ≥ début, et `unlock_pot` exige fin ≤
  // aujourd'hui. Reculer seulement la fin sous un début = aujourd'hui violerait la contrainte.
  const iso = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const { error } = await admin()
    .from("groups")
    .update({ challenge_start: iso(-8), challenge_end: iso(-1) })
    .eq("id", groupId);
  if (error) throw error;
}
