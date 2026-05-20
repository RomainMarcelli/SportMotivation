// Edge Function : suppression de compte avec ANONYMISATION (soft delete).
//
// On ne supprime PAS la ligne public.users ni ses séances/pénalités (pour ne pas
// fausser les cagnottes et historiques des groupes). À la place :
//   - on anonymise le profil (nom → « Compte supprimé », username/avatar effacés)
//   - on fait quitter tous ses groupes (group_members.left_at = now())
//   - on bannit le compte auth et on brouille son email pour bloquer toute reconnexion
//
// Déploiement : Dashboard Supabase → Edge Functions (voir docs/guides/ACCOUNT_DELETION.md).
// Secrets requis : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (souvent déjà fournis par défaut).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non authentifié" }, 401);

    // Identifie l'appelant à partir de son JWT
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Session invalide" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const uid = user.id;

    // 1. Anonymise le profil public (la ligne reste pour préserver les FK)
    const { error: anonError } = await admin
      .from("users")
      .update({
        first_name: "Compte",
        last_name: "supprimé",
        username: null,
        avatar_url: null,
        expo_push_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", uid);
    if (anonError) throw anonError;

    // 2. Quitte tous les groupes actifs
    const { error: leaveError } = await admin
      .from("group_members")
      .update({ left_at: new Date().toISOString() })
      .eq("user_id", uid)
      .is("left_at", null);
    if (leaveError) throw leaveError;

    // 3. Bannit le compte auth + brouille l'email pour libérer l'adresse et bloquer la connexion
    const { error: banError } = await admin.auth.admin.updateUserById(uid, {
      email: `deleted_${uid}@deleted.invalid`,
      ban_duration: "876000h", // ~100 ans
      user_metadata: { deleted: true },
    });
    if (banError) throw banError;

    return json({ ok: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Erreur inconnue" }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
