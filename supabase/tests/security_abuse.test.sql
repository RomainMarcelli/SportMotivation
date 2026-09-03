-- ============================================================================
-- pgTAP — Sécurité : scénarios d'ABUS (RLS + autorisation RPC + anti-triche)
-- ============================================================================
-- BUT : verrouiller durablement les invariants de sécurité audités à la main.
-- Chaque test rejoue une tentative d'abus et vérifie qu'elle échoue (ou qu'un
-- accès légitime réussit). Si une migration rouvre une faille, un test vire au ROUGE.
--
-- ────────────────────────────────────────────────────────────────────────────
-- COMMENT L'EXÉCUTER (dashboard Supabase → SQL editor) :
--   1. Colle TOUT ce fichier.  2. Run (Ctrl/Cmd+Entrée).
--   3. À la fin, une **erreur rouge volontaire** s'affiche : c'est le RÉCAPITULATIF
--      (le seul moyen d'afficher toutes les lignes dans l'éditeur + de tout annuler).
--      → Lis-la : `TOUS OK ✅` = parfait ; sinon les lignes `not ok` listées sont
--        les invariants cassés. Copie-moi ce bloc.
--
-- ZÉRO EFFET DE BORD : tout est dans une transaction annulée par l'erreur finale.
-- Aucune donnée n'est créée ni modifiée, même en cas d'échec de test.
--
-- SI UN *SEED* PLANTE (colonne/contrainte inattendue) : décalage schéma réel vs
-- types générés — colle-moi l'erreur, j'ajuste le fixture. La logique EST la spec.
--
-- HYPOTHÈSE : Supabase accorde SELECT à `authenticated` sur les tables `public`
-- (c'est pour ça que la RLS est la ligne de défense). Les tests de visibilité
-- basculent en rôle `authenticated` pour que la RLS s'applique vraiment.
--
-- ⚠ T26/T27 (verrou cron) SUPPOSENT que `056_harden_cron_grants.sql` est exécuté ;
--   sinon ils virent au rouge — c'est le rappel de lancer 056.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = extensions, public, pg_temp;  -- pgtap peut être en public OU extensions
SELECT no_plan();

-- Collecteur : chaque assertion pgTAP renvoie sa ligne TAP → on la stocke ici, et
-- on affiche TOUT à la fin (l'éditeur ne montre que le dernier résultat).
CREATE TEMP TABLE _tap(ord serial PRIMARY KEY, line text);

-- Helper « se connecter en tant que » : pose le claim JWT lu par auth.uid().
CREATE FUNCTION pg_temp._as(p uuid) RETURNS void LANGUAGE plpgsql AS $fn$
BEGIN
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', p, 'role', 'authenticated')::text, true);
END $fn$;

-- ============================================================================
-- FIXTURES (posées en superuser → RLS contournée, voulu pour le seed)
--   uAdmin=admin A · uMember=membre A arrivé AVANT publi (éligible) ·
--   uLate=membre A arrivé APRÈS publi (inéligible) · uOutsider=membre de B (étranger à A)
-- ============================================================================
INSERT INTO auth.users (instance_id, id, aud, role, email) VALUES
  ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-00000000ad01','authenticated','authenticated','admin@test.dev'),
  ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-00000000e302','authenticated','authenticated','member@test.dev'),
  ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-0000000041a3','authenticated','authenticated','late@test.dev'),
  ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-00000000c504','authenticated','authenticated','outsider@test.dev')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, username) VALUES
  ('00000000-0000-0000-0000-00000000ad01','admin@test.dev','t_admin'),
  ('00000000-0000-0000-0000-00000000e302','member@test.dev','t_member'),
  ('00000000-0000-0000-0000-0000000041a3','late@test.dev','t_late'),
  ('00000000-0000-0000-0000-00000000c504','outsider@test.dev','t_outsider')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.groups (id, name, invite_code, penalty_amount, blame_threshold,
                           challenge_start, challenge_end, created_by, status) VALUES
  ('00000000-0000-0000-0000-0000000000a1','Groupe A','TESTAAA', 10, 3,
   current_date - 30, current_date + 30, '00000000-0000-0000-0000-00000000ad01','active'),
  ('00000000-0000-0000-0000-0000000000b2','Groupe B','TESTBBB', 10, 3,
   current_date - 30, current_date + 30, '00000000-0000-0000-0000-00000000c504','active')
ON CONFLICT (id) DO NOTHING;

-- joined_at choisi vs published_at (= now()-2j) : uMember éligible, uLate non.
INSERT INTO public.group_members (group_id, user_id, weekly_target, role, joined_at) VALUES
  ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000ad01', 3, 'admin',  now() - interval '20 days'),
  ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000e302', 3, 'member', now() - interval '10 days'),
  ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000041a3', 3, 'member', now() - interval  '1 days'),
  ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-00000000c504', 3, 'admin',  now() - interval '20 days')
ON CONFLICT DO NOTHING;

INSERT INTO public.sessions (id, group_id, user_id, activity_type, duration_min,
                             performed_at, published_at, week_start, status) VALUES
  ('00000000-0000-0000-0000-0000000005a1','00000000-0000-0000-0000-0000000000a1',
   '00000000-0000-0000-0000-00000000ad01','Course', 30,
   now() - interval '2 days', now() - interval '2 days',
   date_trunc('week', now())::date, 'pending_vote')
ON CONFLICT (id) DO NOTHING;

-- Données financières/sensibles de A pour tester l'isolation RLS en lecture.
INSERT INTO public.pots (group_id) VALUES ('00000000-0000-0000-0000-0000000000a1')
ON CONFLICT (group_id) DO NOTHING;
INSERT INTO public.penalties (group_id, user_id, amount, penalty_type, week_start) VALUES
  ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000e302', 10,
   'missed_session', date_trunc('week', now())::date);
INSERT INTO public.blames (group_id, user_id, session_id, settled) VALUES
  ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000e302',
   '00000000-0000-0000-0000-0000000005a1', false)
ON CONFLICT DO NOTHING;
INSERT INTO public.pot_transactions (pot_id, user_id, amount, transaction_type)
SELECT p.id, '00000000-0000-0000-0000-00000000e302', 10, 'penalty_added'
FROM public.pots p WHERE p.group_id = '00000000-0000-0000-0000-0000000000a1';

-- id de la cagnotte de A (test direct de pot_transactions, sans JOIN qui masquerait une fuite).
SELECT set_config('test.pot_a',
  (SELECT id FROM public.pots WHERE group_id='00000000-0000-0000-0000-0000000000a1')::text, true);

-- ============================================================================
-- BLOC A — Autorisation des RPC de suspension (impersonation JWT, sans SET ROLE :
--          les fonctions RAISENT sur is_group_admin/auth.uid()).
-- ============================================================================
SELECT pg_temp._as('00000000-0000-0000-0000-00000000e302');
INSERT INTO _tap(line) SELECT throws_ok(
  $q$ SELECT public.admin_suspend_member('00000000-0000-0000-0000-0000000000a1',
        '00000000-0000-0000-0000-0000000041a3', current_date, current_date + 3, 'x') $q$,
  'NOT_ADMIN', 'T1  admin_suspend_member refusé à un membre non-admin');

SELECT pg_temp._as('00000000-0000-0000-0000-00000000c504');
INSERT INTO _tap(line) SELECT throws_ok(
  $q$ SELECT public.admin_suspend_member('00000000-0000-0000-0000-0000000000a1',
        '00000000-0000-0000-0000-0000000041a3', current_date, current_date + 3, 'x') $q$,
  'NOT_ADMIN', 'T2  admin_suspend_member refusé à un étranger au groupe');

SELECT pg_temp._as('00000000-0000-0000-0000-00000000ad01');
INSERT INTO _tap(line) SELECT lives_ok(
  $q$ SELECT public.admin_suspend_member('00000000-0000-0000-0000-0000000000a1',
        '00000000-0000-0000-0000-0000000041a3', current_date, current_date + 3, 'blessure') $q$,
  'T3  admin_suspend_member accepté pour l''admin');

INSERT INTO _tap(line) SELECT is(public.is_suspended('00000000-0000-0000-0000-0000000000a1',
     '00000000-0000-0000-0000-0000000041a3', current_date), true,
     'T4  is_suspended = true pendant la suspension active');
INSERT INTO _tap(line) SELECT is(public.is_suspended('00000000-0000-0000-0000-0000000000a1',
     '00000000-0000-0000-0000-0000000041a3', current_date + 60), false,
     'T5  is_suspended = false hors de la période');

-- Demande PENDING (uMember) → NE dispense PAS (invariant anti-triche).
SELECT pg_temp._as('00000000-0000-0000-0000-00000000e302');
SELECT set_config('test.susp_id',
  public.request_suspension('00000000-0000-0000-0000-0000000000a1',
     current_date, current_date + 2, 'congés')::text, true);
INSERT INTO _tap(line) SELECT is(public.is_suspended('00000000-0000-0000-0000-0000000000a1',
     '00000000-0000-0000-0000-00000000e302', current_date), false,
     'T6  une demande PENDING ne dispense de rien (pas d''auto-exonération)');

SELECT pg_temp._as('00000000-0000-0000-0000-00000000c504');
INSERT INTO _tap(line) SELECT throws_ok(
  $q$ SELECT public.request_suspension('00000000-0000-0000-0000-0000000000a1',
        current_date, current_date + 2, 'congés') $q$,
  'NOT_MEMBER', 'T7  request_suspension refusé à un non-membre');

SELECT pg_temp._as('00000000-0000-0000-0000-00000000e302');
INSERT INTO _tap(line) SELECT throws_ok(
  $q$ SELECT public.request_suspension('00000000-0000-0000-0000-0000000000a1',
        current_date, current_date + 2, '   ') $q$,
  'REASON_REQUIRED', 'T8  request_suspension exige un motif non vide');

SELECT pg_temp._as('00000000-0000-0000-0000-0000000041a3');
INSERT INTO _tap(line) SELECT throws_ok(
  format($q$ SELECT public.decide_suspension(%L, true, null) $q$, current_setting('test.susp_id')),
  'NOT_ADMIN', 'T9  decide_suspension refusé à un non-admin');

SELECT pg_temp._as('00000000-0000-0000-0000-00000000ad01');
INSERT INTO _tap(line) SELECT is(
  (SELECT public.decide_suspension(current_setting('test.susp_id')::uuid, true, null)),
  'active', 'T10 decide_suspension(accept) renvoie active pour l''admin');
INSERT INTO _tap(line) SELECT is(public.is_suspended('00000000-0000-0000-0000-0000000000a1',
     '00000000-0000-0000-0000-00000000e302', current_date), true,
     'T11 demande ACCEPTÉE → exonération effective');

-- ============================================================================
-- BLOC B — Éligibilité de vote (cast_vote). Les RAISE d'éligibilité passent AVANT
--          le vote heureux T15 (cast_vote teste le statut pending_vote AVANT l'éligibilité).
-- ============================================================================
SELECT pg_temp._as('00000000-0000-0000-0000-00000000c504');
INSERT INTO _tap(line) SELECT throws_ok(
  $q$ SELECT public.cast_vote('00000000-0000-0000-0000-0000000005a1', true, null) $q$,
  'NOT_MEMBER', 'T12 cast_vote refusé à un non-membre');

SELECT pg_temp._as('00000000-0000-0000-0000-00000000ad01');
INSERT INTO _tap(line) SELECT throws_ok(
  $q$ SELECT public.cast_vote('00000000-0000-0000-0000-0000000005a1', true, null) $q$,
  'CANNOT_VOTE_OWN', 'T13 cast_vote refusé à l''auteur de la séance');

SELECT pg_temp._as('00000000-0000-0000-0000-0000000041a3');
INSERT INTO _tap(line) SELECT throws_ok(
  $q$ SELECT public.cast_vote('00000000-0000-0000-0000-0000000005a1', true, null) $q$,
  'JOINED_AFTER_PUBLICATION', 'T14 cast_vote refusé à un membre arrivé après la publication');

SELECT pg_temp._as('00000000-0000-0000-0000-00000000e302');
INSERT INTO _tap(line) SELECT lives_ok(
  $q$ SELECT public.cast_vote('00000000-0000-0000-0000-0000000005a1', true, null) $q$,
  'T15 cast_vote accepté pour un membre éligible');

-- ============================================================================
-- BLOC C — Isolation RLS en LECTURE (bascule rôle authenticated + capture GUC).
--          Comptages encadrés : permission denied → 0 (cas sûr, n'aborte pas le test).
-- ============================================================================
SELECT pg_temp._as('00000000-0000-0000-0000-00000000c504');
SET LOCAL ROLE authenticated;
DO $cap_o$
DECLARE v int;
BEGIN
  BEGIN v := (SELECT count(*) FROM public.sessions        WHERE group_id='00000000-0000-0000-0000-0000000000a1');           EXCEPTION WHEN insufficient_privilege THEN v:=0; END; PERFORM set_config('test.o_sessions', v::text, true);
  BEGIN v := (SELECT count(*) FROM public.suspensions      WHERE group_id='00000000-0000-0000-0000-0000000000a1');           EXCEPTION WHEN insufficient_privilege THEN v:=0; END; PERFORM set_config('test.o_susp',     v::text, true);
  BEGIN v := (SELECT count(*) FROM public.blames           WHERE group_id='00000000-0000-0000-0000-0000000000a1');           EXCEPTION WHEN insufficient_privilege THEN v:=0; END; PERFORM set_config('test.o_blames',   v::text, true);
  BEGIN v := (SELECT count(*) FROM public.penalties        WHERE group_id='00000000-0000-0000-0000-0000000000a1');           EXCEPTION WHEN insufficient_privilege THEN v:=0; END; PERFORM set_config('test.o_pen',      v::text, true);
  BEGIN v := (SELECT count(*) FROM public.pots             WHERE group_id='00000000-0000-0000-0000-0000000000a1');           EXCEPTION WHEN insufficient_privilege THEN v:=0; END; PERFORM set_config('test.o_pots',     v::text, true);
  BEGIN v := (SELECT count(*) FROM public.pot_transactions WHERE pot_id = current_setting('test.pot_a')::uuid);              EXCEPTION WHEN insufficient_privilege THEN v:=0; END; PERFORM set_config('test.o_pottx',    v::text, true);
  BEGIN v := (SELECT count(*) FROM public.votes            WHERE session_id='00000000-0000-0000-0000-0000000005a1');         EXCEPTION WHEN insufficient_privilege THEN v:=0; END; PERFORM set_config('test.o_votes',    v::text, true);
END $cap_o$;
RESET ROLE;

INSERT INTO _tap(line) SELECT is(current_setting('test.o_sessions'), '0', 'T16 étranger ne lit AUCUNE séance du groupe A (RLS)');
INSERT INTO _tap(line) SELECT is(current_setting('test.o_susp'),     '0', 'T17 étranger ne lit AUCUNE suspension du groupe A (RLS)');
INSERT INTO _tap(line) SELECT is(current_setting('test.o_blames'),   '0', 'T18 étranger ne lit AUCUN blâme du groupe A (RLS) — sensible');
INSERT INTO _tap(line) SELECT is(current_setting('test.o_pen'),      '0', 'T19 étranger ne lit AUCUNE pénalité du groupe A (RLS) — financier');
INSERT INTO _tap(line) SELECT is(current_setting('test.o_pots'),     '0', 'T20 étranger ne lit AUCUNE cagnotte du groupe A (RLS) — financier');
INSERT INTO _tap(line) SELECT is(current_setting('test.o_pottx'),    '0', 'T21 étranger ne lit AUCUNE transaction de cagnotte (RLS) — financier');
INSERT INTO _tap(line) SELECT is(current_setting('test.o_votes'),    '0', 'T22 étranger ne lit AUCUN vote de la séance (RLS)');

-- Contrôle positif : un membre voit bien son groupe.
SELECT pg_temp._as('00000000-0000-0000-0000-00000000e302');
SET LOCAL ROLE authenticated;
DO $cap_m$
DECLARE v int;
BEGIN
  BEGIN v := (SELECT count(*) FROM public.sessions   WHERE group_id='00000000-0000-0000-0000-0000000000a1'); EXCEPTION WHEN insufficient_privilege THEN v:=0; END; PERFORM set_config('test.m_sessions', v::text, true);
  BEGIN v := (SELECT count(*) FROM public.suspensions WHERE group_id='00000000-0000-0000-0000-0000000000a1'); EXCEPTION WHEN insufficient_privilege THEN v:=0; END; PERFORM set_config('test.m_susp',     v::text, true);
END $cap_m$;
RESET ROLE;

INSERT INTO _tap(line) SELECT cmp_ok(current_setting('test.m_sessions')::int, '>=', 1, 'T23 un membre lit bien les séances de son groupe');
INSERT INTO _tap(line) SELECT cmp_ok(current_setting('test.m_susp')::int,     '>=', 1, 'T24 un membre lit bien les suspensions de son groupe');

-- ============================================================================
-- BLOC D — Escalade : un membre ne doit PAS pouvoir s'auto-promouvoir admin.
-- ============================================================================
SELECT pg_temp._as('00000000-0000-0000-0000-00000000e302');
SET LOCAL ROLE authenticated;
DO $esc$
DECLARE n int;
BEGIN
  UPDATE public.group_members SET role='admin'
    WHERE user_id='00000000-0000-0000-0000-00000000e302'
      AND group_id='00000000-0000-0000-0000-0000000000a1';
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('test.esc', n::text, true);   -- 0 = bloqué (attendu) ; 1 = FAILLE
EXCEPTION WHEN others THEN
  PERFORM set_config('test.esc', '0', true);        -- refus dur (grant/RLS) = bloqué aussi
END $esc$;
RESET ROLE;
INSERT INTO _tap(line) SELECT is(current_setting('test.esc'), '0',
     'T25 un membre ne peut pas s''auto-promouvoir admin (RLS écriture group_members)');

-- ============================================================================
-- BLOC E — Verrou cron (056) : NON appelable par authenticated.
-- ============================================================================
SELECT pg_temp._as('00000000-0000-0000-0000-00000000e302');
SET LOCAL ROLE authenticated;
DO $c1$
BEGIN
  PERFORM public.resolve_pending_votes(99999);
  PERFORM set_config('test.cron_r', 'NON', true);
EXCEPTION
  WHEN insufficient_privilege THEN PERFORM set_config('test.cron_r', 'OUI', true);
  WHEN undefined_function      THEN PERFORM set_config('test.cron_r', 'OUI', true);
  WHEN others                  THEN PERFORM set_config('test.cron_r', 'autre:'||SQLERRM, true);
END $c1$;
DO $c2$
BEGIN
  PERFORM public.apply_session_blames('00000000-0000-0000-0000-0000000005a1');
  PERFORM set_config('test.cron_a', 'NON', true);
EXCEPTION
  WHEN insufficient_privilege THEN PERFORM set_config('test.cron_a', 'OUI', true);
  WHEN undefined_function      THEN PERFORM set_config('test.cron_a', 'OUI', true);
  WHEN others                  THEN PERFORM set_config('test.cron_a', 'autre:'||SQLERRM, true);
END $c2$;
RESET ROLE;
INSERT INTO _tap(line) SELECT is(current_setting('test.cron_r'), 'OUI',
     'T26 resolve_pending_votes NON appelable par authenticated (056)');
INSERT INTO _tap(line) SELECT is(current_setting('test.cron_a'), 'OUI',
     'T27 apply_session_blames NON appelable par authenticated (056)');

-- ============================================================================
-- BLOC F — Écritures directes malveillantes fermées par la RLS (057) + 056.
--          (Rouges tant que 056/057 ne sont pas exécutés — c'est le rappel.)
-- ============================================================================

-- T28 : l'auteur ne peut pas auto-valider sa séance (UPDATE direct fermé).
SELECT pg_temp._as('00000000-0000-0000-0000-00000000ad01');
SET LOCAL ROLE authenticated;
DO $f1$
DECLARE n int;
BEGIN
  UPDATE public.sessions SET status='validated'
    WHERE id='00000000-0000-0000-0000-0000000005a1' AND user_id='00000000-0000-0000-0000-00000000ad01';
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('test.f_selfval', n::text, true);   -- 0 = bloqué ; 1 = FAILLE
EXCEPTION WHEN others THEN PERFORM set_config('test.f_selfval', '0', true);
END $f1$;
RESET ROLE;
INSERT INTO _tap(line) SELECT is(current_setting('test.f_selfval'), '0',
  'T28 auteur ne peut pas auto-valider sa séance (sessions UPDATE fermé) [057]');

-- T29 : insertion directe d'un vote refusée (contourne cast_vote / l'éligibilité).
SELECT pg_temp._as('00000000-0000-0000-0000-0000000041a3');
SET LOCAL ROLE authenticated;
DO $f2$
BEGIN
  INSERT INTO public.votes (session_id, voter_id, vote_value)
    VALUES ('00000000-0000-0000-0000-0000000005a1','00000000-0000-0000-0000-0000000041a3', true);
  PERFORM set_config('test.f_vote', 'NON', true);        -- a réussi = FAILLE
EXCEPTION WHEN others THEN PERFORM set_config('test.f_vote', 'OUI', true);
END $f2$;
RESET ROLE;
INSERT INTO _tap(line) SELECT is(current_setting('test.f_vote'), 'OUI',
  'T29 insertion directe de vote refusée (votes INSERT fermé) [057]');

-- T30 : s'insérer admin dans un groupe qu'on n'a PAS créé → refusé.
SELECT pg_temp._as('00000000-0000-0000-0000-00000000e302');
SET LOCAL ROLE authenticated;
DO $f3$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, weekly_target, role)
    VALUES ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-00000000e302', 1, 'admin');
  PERFORM set_config('test.f_join', 'NON', true);        -- a réussi = FAILLE
EXCEPTION WHEN others THEN PERFORM set_config('test.f_join', 'OUI', true);
END $f3$;
RESET ROLE;
INSERT INTO _tap(line) SELECT is(current_setting('test.f_join'), 'OUI',
  'T30 s''insérer admin dans un groupe non créé refusé (group_members INSERT resserré) [057]');

-- T31 : CRITIQUE — delete_account_internal NON appelable par authenticated [056].
SELECT pg_temp._as('00000000-0000-0000-0000-00000000e302');
SET LOCAL ROLE authenticated;
DO $f4$
BEGIN
  PERFORM public.delete_account_internal('00000000-0000-0000-0000-00000000ad01', false);
  PERFORM set_config('test.f_del', 'NON', true);         -- a pu viser autrui = FAILLE CRITIQUE
EXCEPTION
  WHEN insufficient_privilege THEN PERFORM set_config('test.f_del', 'OUI', true);
  WHEN undefined_function      THEN PERFORM set_config('test.f_del', 'OUI', true);
  WHEN others                  THEN PERFORM set_config('test.f_del', 'autre:'||SQLERRM, true);
END $f4$;
RESET ROLE;
INSERT INTO _tap(line) SELECT is(current_setting('test.f_del'), 'OUI',
  'T31 CRITIQUE: delete_account_internal non appelable par authenticated [056]');

-- T32 : mise/objectif figés après adhésion — un membre ne peut pas baisser sa mise [057].
SELECT pg_temp._as('00000000-0000-0000-0000-00000000e302');
SET LOCAL ROLE authenticated;
DO $f5$
BEGIN
  UPDATE public.group_members SET penalty_amount = 0
    WHERE user_id='00000000-0000-0000-0000-00000000e302' AND group_id='00000000-0000-0000-0000-0000000000a1';
  PERFORM set_config('test.f_mise', 'NON', true);        -- a réussi = FAILLE
EXCEPTION WHEN others THEN PERFORM set_config('test.f_mise', 'OUI', true);
END $f5$;
RESET ROLE;
INSERT INTO _tap(line) SELECT is(current_setting('test.f_mise'), 'OUI',
  'T32 un membre ne peut pas baisser sa mise après adhésion (colonne verrouillée) [057]');

-- T33 : CRITIQUE — impossible de s'attribuer un badge arbitraire [071].
SELECT pg_temp._as('00000000-0000-0000-0000-00000000e302');
SET LOCAL ROLE authenticated;
DO $f6$
BEGIN
  PERFORM public.grant_badge(
    '00000000-0000-0000-0000-00000000e302', 'badge_triche', 'Triche', 'Interdit'
  );
  PERFORM set_config('test.f_badge', 'NON', true);
EXCEPTION WHEN insufficient_privilege THEN PERFORM set_config('test.f_badge', 'OUI', true);
END $f6$;
RESET ROLE;
INSERT INTO _tap(line) SELECT is(current_setting('test.f_badge'), 'OUI',
  'T33 CRITIQUE: grant_badge non appelable par authenticated [071]');

-- T34 : le backfill est un job interne, pas une RPC client [071].
SELECT pg_temp._as('00000000-0000-0000-0000-00000000e302');
SET LOCAL ROLE authenticated;
DO $f7$
BEGIN
  PERFORM public.backfill_weekly_outcomes(NULL);
  PERFORM set_config('test.f_backfill', 'NON', true);
EXCEPTION WHEN insufficient_privilege THEN PERFORM set_config('test.f_backfill', 'OUI', true);
END $f7$;
RESET ROLE;
INSERT INTO _tap(line) SELECT is(current_setting('test.f_backfill'), 'OUI',
  'T34 backfill_weekly_outcomes non appelable par authenticated [071]');

-- T35 : un membre ne peut pas figer prématurément les badges d'un défi [071].
SELECT pg_temp._as('00000000-0000-0000-0000-00000000e302');
SET LOCAL ROLE authenticated;
DO $f8$
BEGIN
  PERFORM public.finalize_challenge_badges('00000000-0000-0000-0000-0000000000a1');
  PERFORM set_config('test.f_finalize', 'NON', true);
EXCEPTION WHEN insufficient_privilege THEN PERFORM set_config('test.f_finalize', 'OUI', true);
END $f8$;
RESET ROLE;
INSERT INTO _tap(line) SELECT is(current_setting('test.f_finalize'), 'OUI',
  'T35 finalize_challenge_badges non appelable par authenticated [071]');

-- ============================================================================
-- RÉCAP + ROLLBACK : on lève une erreur volontaire contenant tout le TAP.
-- → l'éditeur affiche le bloc ; l'erreur annule la transaction (rien n'est sauvegardé).
-- ============================================================================
DO $final$
DECLARE nfail int; summary text;
BEGIN
  SELECT count(*) FILTER (WHERE line LIKE 'not ok%') INTO nfail FROM _tap;
  SELECT string_agg(line, E'\n' ORDER BY (line LIKE 'not ok%') DESC, ord) INTO summary FROM _tap;
  RAISE EXCEPTION E'=== pgTAP : % ===\n%\n(transaction annulée — aucune donnée sauvegardée)',
    CASE WHEN nfail = 0 THEN 'TOUS OK ✅' ELSE nfail::text || ' ÉCHEC(S) ❌' END,
    summary;
END $final$;

ROLLBACK;  -- filet (non atteint : l'erreur ci-dessus a déjà annulé la transaction)
