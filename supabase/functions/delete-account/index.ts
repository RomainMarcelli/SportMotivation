// Edge Function : suppression de compte.
//
// ⚠ Cette fonction est un FILET DE SÉCURITÉ, plus le chemin principal.
// Depuis le script SQL 031, l'app appelle directement la RPC `delete_my_account()`.
// Elle n'est utilisée que si cette RPC est refusée faute de privilèges sur le
// schéma `auth` (cf. `features/auth/account.ts`).
//
// Toute la logique métier vit dans `public.delete_account_internal` :
//   - aucun engagement financier  → effacement RÉEL de toutes ses lignes
//   - argent versé ou dû          → anonymisation (sinon les cagnottes seraient fausses)
// Dans les deux cas : passation d'admin, suppression des groupes vides, et
// re-résolution des scrutins en cours (la majorité requise a changé).
//
// Ici on ne fait que la partie qui exige la `service_role` : le compte `auth`.
//
// Déploiement : Dashboard Supabase → Edge Functions (voir docs/guides/ACCOUNT_DELETION.md).
// Secrets requis : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY.

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

    // 1. Tout le travail côté données (transactionnel), sans toucher au compte auth.
    const { data: mode, error: rpcError } = await admin.rpc("delete_account_internal", {
      p_user_id: uid,
      p_delete_auth: false,
    });
    if (rpcError) throw rpcError;

    // 2. Le compte auth, qui lui exige la service_role.
    if (mode === "deleted") {
      const { error } = await admin.auth.admin.deleteUser(uid);
      if (error) throw error;
    } else {
      // Anonymisé : on garde la ligne mais on bloque la connexion et on libère l'e-mail.
      const { error } = await admin.auth.admin.updateUserById(uid, {
        email: `deleted_${uid}@deleted.invalid`,
        ban_duration: "876000h", // ~100 ans
        user_metadata: { deleted: true },
      });
      if (error) throw error;
    }

    return json({ ok: true, mode });
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
