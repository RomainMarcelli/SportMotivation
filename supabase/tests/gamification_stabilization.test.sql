-- ============================================================================
-- pgTAP — Stabilisation 071 : ancien membre + rattrapage des défis terminés
-- ============================================================================
-- À exécuter APRÈS `071_stabilize_gamification.sql` depuis le SQL editor Supabase.
-- Le récapitulatif final est volontairement levé comme une erreur afin d'afficher
-- toutes les assertions et d'annuler la transaction : aucun fixture ne persiste.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = extensions, public, pg_temp;
SELECT no_plan();

CREATE TEMP TABLE _tap(ord serial PRIMARY KEY, line text);

CREATE FUNCTION pg_temp._as(p uuid) RETURNS void LANGUAGE plpgsql AS $fn$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', p, 'role', 'authenticated')::text,
    true
  );
END
$fn$;

-- Utilisateurs isolés de ce test.
INSERT INTO auth.users (instance_id, id, aud, role, email) VALUES
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000007101',
   'authenticated', 'authenticated', 'gamification-old-member@test.dev'),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000007102',
   'authenticated', 'authenticated', 'gamification-completed@test.dev'),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000007103',
   'authenticated', 'authenticated', 'gamification-unlock@test.dev')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, username) VALUES
  ('00000000-0000-0000-0000-000000007101',
   'gamification-old-member@test.dev', 'test_gamification_old'),
  ('00000000-0000-0000-0000-000000007102',
   'gamification-completed@test.dev', 'test_gamification_done'),
  ('00000000-0000-0000-0000-000000007103',
   'gamification-unlock@test.dev', 'test_gamification_unlock')
ON CONFLICT (id) DO NOTHING;

-- ==========================================================================
-- CAS 1 — Un ancien membre garde son cache, sans +1 live ni badge artificiel.
-- ==========================================================================
INSERT INTO public.groups (
  id, name, invite_code, penalty_amount, blame_threshold,
  challenge_start, challenge_end, created_by, status
) VALUES (
  '00000000-0000-0000-0000-000000007111', 'Test 071 ancien membre', 'T071OLD', 10, 3,
  current_date - 14, current_date + 14,
  '00000000-0000-0000-0000-000000007101', 'active'
);

INSERT INTO public.group_members (
  group_id, user_id, weekly_target, role, joined_at, left_at
) VALUES (
  '00000000-0000-0000-0000-000000007111',
  '00000000-0000-0000-0000-000000007101',
  1, 'member', now() - interval '14 days', now() - interval '1 hour'
);

INSERT INTO public.member_group_progress (
  group_id, user_id, current_streak, best_streak,
  last_success_week, last_processed_week
) VALUES (
  '00000000-0000-0000-0000-000000007111',
  '00000000-0000-0000-0000-000000007101',
  1, 1,
  date_trunc('week', now() AT TIME ZONE 'Europe/Paris')::date - 7,
  date_trunc('week', now() AT TIME ZONE 'Europe/Paris')::date - 7
);

-- Une ancienne séance validée dans la semaine courante reproduit le chemin du
-- backfill de badges de 071. L'ancien code transformait target=0 en succès live.
INSERT INTO public.sessions (
  id, group_id, user_id, activity_type, duration_min,
  performed_at, published_at, week_start, status
) VALUES (
  '00000000-0000-0000-0000-000000007121',
  '00000000-0000-0000-0000-000000007111',
  '00000000-0000-0000-0000-000000007101',
  'Course', 30, now() - interval '2 hours', now() - interval '2 hours',
  date_trunc('week', now() AT TIME ZONE 'Europe/Paris')::date,
  'validated'
);

INSERT INTO _tap(line) SELECT is(
  public.live_streak_for(
    '00000000-0000-0000-0000-000000007111',
    '00000000-0000-0000-0000-000000007101'
  ),
  1,
  'T1 ancien membre : live_streak_for renvoie uniquement le streak persisté'
);

DO $award_old_member$
BEGIN
  PERFORM public.award_progress_badges(
    '00000000-0000-0000-0000-000000007101',
    '00000000-0000-0000-0000-000000007111'
  );
END
$award_old_member$;

INSERT INTO _tap(line) SELECT is(
  (SELECT count(*)::integer
   FROM public.user_badges
   WHERE user_id = '00000000-0000-0000-0000-000000007101'
     AND badge_key = 'streak_2'),
  0,
  'T2 backfill badges : aucun streak_2 artificiel pour un ancien membre'
);

-- ==========================================================================
-- CAS 2 — Défi déjà completed : dernière semaine fermée avant les badges.
-- ==========================================================================
INSERT INTO public.groups (
  id, name, invite_code, penalty_amount, blame_threshold,
  challenge_start, challenge_end, created_by, status
) VALUES (
  '00000000-0000-0000-0000-000000007112', 'Test 071 completed', 'T071END', 10, 3,
  date_trunc('week', now() AT TIME ZONE 'Europe/Paris')::date - 21,
  date_trunc('week', now() AT TIME ZONE 'Europe/Paris')::date - 8,
  '00000000-0000-0000-0000-000000007102', 'completed'
);

INSERT INTO public.group_members (group_id, user_id, weekly_target, role, joined_at)
VALUES (
  '00000000-0000-0000-0000-000000007112',
  '00000000-0000-0000-0000-000000007102',
  1, 'admin', now() - interval '40 days'
);

INSERT INTO public.sessions (
  id, group_id, user_id, activity_type, duration_min,
  performed_at, published_at, week_start, status
) VALUES
  (
    '00000000-0000-0000-0000-000000007122',
    '00000000-0000-0000-0000-000000007112',
    '00000000-0000-0000-0000-000000007102',
    'Course', 30,
    date_trunc('week', now() AT TIME ZONE 'Europe/Paris') - interval '20 days',
    date_trunc('week', now() AT TIME ZONE 'Europe/Paris') - interval '20 days',
    date_trunc('week', now() AT TIME ZONE 'Europe/Paris')::date - 21,
    'validated'
  ),
  (
    '00000000-0000-0000-0000-000000007123',
    '00000000-0000-0000-0000-000000007112',
    '00000000-0000-0000-0000-000000007102',
    'Course', 30,
    date_trunc('week', now() AT TIME ZONE 'Europe/Paris') - interval '13 days',
    date_trunc('week', now() AT TIME ZONE 'Europe/Paris') - interval '13 days',
    date_trunc('week', now() AT TIME ZONE 'Europe/Paris')::date - 14,
    'validated'
  );

-- Première semaine déjà historisée ; seule la dernière manque.
INSERT INTO public.weekly_closures (group_id, week_start)
VALUES (
  '00000000-0000-0000-0000-000000007112',
  date_trunc('week', now() AT TIME ZONE 'Europe/Paris')::date - 21
);

INSERT INTO public.member_weekly_outcomes (
  group_id, user_id, week_start, status, neutral_reason,
  initial_target, effective_target, validated_sessions,
  standard_excuses, major_excuse, joker_used
) VALUES (
  '00000000-0000-0000-0000-000000007112',
  '00000000-0000-0000-0000-000000007102',
  date_trunc('week', now() AT TIME ZONE 'Europe/Paris')::date - 21,
  'success', NULL, 1, 1, 1, 0, FALSE, FALSE
);

DO $complete_once$
BEGIN
  PERFORM public.complete_expired_challenges();
END
$complete_once$;

INSERT INTO _tap(line) SELECT is(
  (SELECT count(*)::integer FROM public.weekly_closures
   WHERE group_id = '00000000-0000-0000-0000-000000007112'),
  2,
  'T3 défi completed : la dernière semaine manquante est clôturée'
);

INSERT INTO _tap(line) SELECT ok(
  (SELECT badges_finalized_at IS NOT NULL FROM public.groups
   WHERE id = '00000000-0000-0000-0000-000000007112'),
  'T4 défi completed : les badges sont finalisés après toutes les clôtures'
);

INSERT INTO _tap(line) SELECT is(
  (SELECT status FROM public.member_weekly_outcomes
   WHERE group_id = '00000000-0000-0000-0000-000000007112'
     AND user_id = '00000000-0000-0000-0000-000000007102'
     AND week_start = date_trunc('week', now() AT TIME ZONE 'Europe/Paris')::date - 14),
  'success',
  'T5 défi completed : la semaine rattrapée produit le bon outcome'
);

-- Réexécution avec toutes les semaines déjà fermées et les badges déjà figés.
DO $complete_twice$
BEGIN
  PERFORM public.complete_expired_challenges();
END
$complete_twice$;

INSERT INTO _tap(line) SELECT is(
  (SELECT count(*)::integer FROM public.weekly_closures
   WHERE group_id = '00000000-0000-0000-0000-000000007112'),
  2,
  'T6 idempotence : aucune clôture supplémentaire'
);

INSERT INTO _tap(line) SELECT is(
  (SELECT count(*)::integer FROM public.member_weekly_outcomes
   WHERE group_id = '00000000-0000-0000-0000-000000007112'),
  2,
  'T7 idempotence : aucun outcome supplémentaire'
);

INSERT INTO _tap(line) SELECT is(
  (SELECT count(*)::integer FROM public.user_badges
   WHERE user_id = '00000000-0000-0000-0000-000000007102'
     AND badge_key LIKE 'challenge_%'),
  4,
  'T8 idempotence : les quatre badges de défi restent uniques'
);

-- ==========================================================================
-- CAS 3 — unlock_pot répare aussi un ancien défi completed incomplet.
-- ==========================================================================
-- Ce fixture est créé après complete_expired_challenges afin de tester réellement
-- le chemin propre à unlock_pot, sans rattrapage préalable par le cron.
INSERT INTO public.groups (
  id, name, invite_code, penalty_amount, blame_threshold,
  challenge_start, challenge_end, created_by, status
) VALUES (
  '00000000-0000-0000-0000-000000007113', 'Test 071 unlock', 'T071POT', 10, 3,
  date_trunc('week', now() AT TIME ZONE 'Europe/Paris')::date - 14,
  date_trunc('week', now() AT TIME ZONE 'Europe/Paris')::date - 8,
  '00000000-0000-0000-0000-000000007103', 'completed'
);

INSERT INTO public.group_members (group_id, user_id, weekly_target, role, joined_at)
VALUES (
  '00000000-0000-0000-0000-000000007113',
  '00000000-0000-0000-0000-000000007103',
  1, 'admin', now() - interval '30 days'
);

INSERT INTO public.sessions (
  id, group_id, user_id, activity_type, duration_min,
  performed_at, published_at, week_start, status
) VALUES (
  '00000000-0000-0000-0000-000000007124',
  '00000000-0000-0000-0000-000000007113',
  '00000000-0000-0000-0000-000000007103',
  'Course', 30,
  date_trunc('week', now() AT TIME ZONE 'Europe/Paris') - interval '13 days',
  date_trunc('week', now() AT TIME ZONE 'Europe/Paris') - interval '13 days',
  date_trunc('week', now() AT TIME ZONE 'Europe/Paris')::date - 14,
  'validated'
);

INSERT INTO public.pots (group_id)
VALUES ('00000000-0000-0000-0000-000000007113')
ON CONFLICT (group_id) DO NOTHING;

SELECT pg_temp._as('00000000-0000-0000-0000-000000007103');

INSERT INTO _tap(line) SELECT lives_ok(
  $q$ SELECT public.unlock_pot('00000000-0000-0000-0000-000000007113') $q$,
  'T9 unlock_pot accepte un ancien défi completed après l''avoir réparé'
);

INSERT INTO _tap(line) SELECT is(
  (SELECT count(*)::integer FROM public.weekly_closures
   WHERE group_id = '00000000-0000-0000-0000-000000007113'),
  1,
  'T10 unlock_pot : la clôture manquante a été créée'
);

INSERT INTO _tap(line) SELECT ok(
  (SELECT badges_finalized_at IS NOT NULL FROM public.groups
   WHERE id = '00000000-0000-0000-0000-000000007113'),
  'T11 unlock_pot : les badges sont finalisés après la clôture'
);

INSERT INTO _tap(line) SELECT ok(
  (SELECT status = 'unlocked' AND unlocked_at IS NOT NULL
   FROM public.pots
   WHERE group_id = '00000000-0000-0000-0000-000000007113'),
  'T12 unlock_pot : la cagnotte est débloquée dans un état cohérent'
);

-- Récapitulatif complet + rollback volontaire de tous les fixtures.
DO $final$
DECLARE
  nfail   INTEGER;
  summary TEXT;
BEGIN
  SELECT count(*) FILTER (WHERE line LIKE 'not ok%') INTO nfail FROM _tap;
  SELECT string_agg(line, E'\n' ORDER BY (line LIKE 'not ok%') DESC, ord)
    INTO summary
  FROM _tap;

  RAISE EXCEPTION E'=== pgTAP 071 : % ===\n%\n(transaction annulée — aucune donnée sauvegardée)',
    CASE WHEN nfail = 0 THEN 'TOUS OK' ELSE nfail::text || ' ÉCHEC(S)' END,
    summary;
END
$final$;

ROLLBACK;
