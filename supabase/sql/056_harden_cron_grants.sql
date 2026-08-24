-- ============================================================================
-- 056 — Durcissement : fonctions INTERNES non appelables depuis le client
-- ============================================================================
-- À exécuter APRÈS 054. Idempotent.
--
-- POURQUOI (confirmé par le diagnostic `rls_posture` sur la base réelle) :
--   Supabase accorde AUTOMATIQUEMENT EXECUTE aux rôles `anon` et `authenticated`
--   sur CHAQUE fonction créée dans `public` (default privileges). Un simple
--   `REVOKE ... FROM PUBLIC` (ce que faisaient 031/033/034/045… et ma 1re version
--   de ce fichier) NE retire PAS ces grants explicites → les fonctions « internes »
--   restent appelables via PostgREST par n'importe quel porteur de la clé anon.
--
-- CAS CRITIQUE prouvé par le diagnostic :
--   `delete_account_internal(user_id, ...)` — SECURITY DEFINER, supprime/anonymise
--   le compte passé en PARAMÈTRE sans vérifier l'appelant (par design : réservé à
--   la service_role via l'Edge Function). Or son ACL montrait `anon=X | authenticated=X`
--   → AVANT ce fichier, n'importe qui pouvait supprimer le compte d'autrui par UUID.
--
-- CORRECTIF : révoquer EXECUTE à `PUBLIC`, `anon` ET `authenticated` sur les
--   fonctions internes / de cron / de trigger applicatif. Elles ne sont appelées
--   QUE par d'autres fonctions SECURITY DEFINER, par pg_cron, ou par la service_role
--   (Edge) — tous ces appelants tournent sous le propriétaire (postgres) ou
--   service_role, donc NON impactés par ce REVOKE.
--
-- On ne touche PAS aux RPC légitimes du client (cast_vote, admin_suspend_member,
-- declare_session, …) : elles vérifient `auth.uid()` elles-mêmes (un appel anon y
-- lève NOT_AUTHENTICATED/NOT_MEMBER), donc les exposer est sans danger.
--
-- Robuste aux signatures : on boucle sur `pg_proc` (regprocedure) → pas besoin de
-- réécrire chaque signature à la main, et un nom absent est simplement ignoré.
-- ============================================================================

DO $harden$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        -- 🔴 CRITIQUE : suppression de compte par UUID, sans contrôle d'appelant.
        'delete_account_internal',
        -- Cron / résolution / blâmes / clôture : effets financiers, jamais côté client.
        'resolve_pending_votes',
        'apply_session_blames',
        'resolve_group_pending_votes',
        'run_weekly_closure',
        'complete_expired_challenges',
        'send_weekly_reminders',
        -- Notifs internes (déclenchées par d'autres RPC) : pas d'appel direct client.
        'notify_member_joined',
        'notify_member_left',
        'notify_session_declared',
        -- Helpers de calcul internes (lecture) : inutiles au client.
        'is_suspended',
        'session_effective_deadline'
      )
  LOOP
    -- PUBLIC + anon + authenticated : on couvre le grant par défaut ET les grants
    -- explicites que Supabase ajoute à la création. service_role/postgres gardent
    -- leurs droits (delete_account_internal reste utilisable par l'Edge Function).
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    RAISE NOTICE 'Verrouillé : %', r.sig;
  END LOOP;
END
$harden$;

NOTIFY pgrst, 'reload schema';
