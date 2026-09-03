-- ============================================================================
-- pgTAP — 072 : distance, preuves distinctes et publication multi-défis
-- ============================================================================
-- À exécuter APRÈS `072_session_details_proof.sql` dans le SQL editor Supabase.
-- Le récapitulatif final est levé comme une erreur pour afficher toutes les
-- assertions et annuler la transaction : aucun fixture ne persiste.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = extensions, public, pg_temp;
SELECT no_plan();

CREATE TEMP TABLE _tap(ord serial PRIMARY KEY, line text);
CREATE TEMP TABLE _session_ids(name text PRIMARY KEY, id uuid NOT NULL);

CREATE FUNCTION pg_temp._as(p uuid) RETURNS void LANGUAGE plpgsql AS $fn$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', p, 'role', 'authenticated')::text,
    true
  );
END
$fn$;

INSERT INTO auth.users (instance_id, id, aud, role, email) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000007201',
  'authenticated', 'authenticated', 'session-details-072@test.dev'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, username) VALUES (
  '00000000-0000-0000-0000-000000007201',
  'session-details-072@test.dev', 'test_session_details_072'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.groups (
  id, name, invite_code, penalty_amount, blame_threshold,
  challenge_start, challenge_end, created_by, status, max_sessions_per_day
) VALUES
  (
    '00000000-0000-0000-0000-000000007211', 'Test 072 origine', 'T072SRC', 10, 3,
    current_date - 7, current_date + 7,
    '00000000-0000-0000-0000-000000007201', 'active', NULL
  ),
  (
    '00000000-0000-0000-0000-000000007212', 'Test 072 copie', 'T072CPY', 10, 3,
    current_date - 7, current_date + 7,
    '00000000-0000-0000-0000-000000007201', 'active', NULL
  );

INSERT INTO public.group_members (group_id, user_id, weekly_target, role, joined_at)
VALUES
  ('00000000-0000-0000-0000-000000007211',
   '00000000-0000-0000-0000-000000007201', 1, 'admin', now() - interval '8 days'),
  ('00000000-0000-0000-0000-000000007212',
   '00000000-0000-0000-0000-000000007201', 1, 'admin', now() - interval '8 days');

SELECT pg_temp._as('00000000-0000-0000-0000-000000007201');

-- Une seule fonction publique porte chaque nom : aucun overload ambigu pour PostgREST.
INSERT INTO _tap(line) SELECT is(
  (SELECT count(*)::integer
   FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'declare_session'),
  1,
  'T1 declare_session : une seule signature canonique'
);

INSERT INTO _tap(line) SELECT ok(
  (SELECT p.pronargs = 6 AND p.pronargdefaults = 2
   FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'declare_session'),
  'T2 declare_session : distance en 6e argument et deux paramètres finaux optionnels'
);

INSERT INTO _tap(line) SELECT is(
  (SELECT count(*)::integer
   FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'publish_session_to_my_groups'),
  1,
  'T3 publish_session_to_my_groups : une seule signature canonique'
);

-- Ancien appel à cinq arguments : le DEFAULT du 6e doit le garder compatible.
INSERT INTO _session_ids(name, id)
SELECT 'legacy', public.declare_session(
  '00000000-0000-0000-0000-000000007211',
  'Course', 45, current_date, 'Ancien appel sans distance'
);

INSERT INTO _tap(line) SELECT is(
  (SELECT s.distance_km
   FROM public.sessions s JOIN _session_ids i ON i.id = s.id WHERE i.name = 'legacy'),
  NULL::numeric,
  'T4 ancien appel : la distance reste NULL'
);

-- Nouvelle séance : commentaire général et description de preuve sont distincts.
INSERT INTO _session_ids(name, id)
SELECT 'detailed', public.declare_session(
  p_group_id      => '00000000-0000-0000-0000-000000007211',
  p_activity_type => 'Course',
  p_duration_min  => 42,
  p_performed_at  => current_date,
  p_comment       => 'Commentaire de séance',
  p_distance_km   => 8.2
);

INSERT INTO public.session_proofs (
  session_id, proof_type, external_url, description
)
SELECT id, 'external_link', 'https://example.com/proof', 'Description de preuve'
FROM _session_ids WHERE name = 'detailed';

INSERT INTO _tap(line) SELECT is(
  (SELECT s.distance_km
   FROM public.sessions s JOIN _session_ids i ON i.id = s.id WHERE i.name = 'detailed'),
  8.200::numeric,
  'T5 nouvelle séance : la distance canonique est conservée'
);

INSERT INTO _tap(line) SELECT is(
  (SELECT s.comment
   FROM public.sessions s JOIN _session_ids i ON i.id = s.id WHERE i.name = 'detailed'),
  'Commentaire de séance',
  'T6 preuve externe : le commentaire général n’est pas remplacé'
);

INSERT INTO _tap(line) SELECT is(
  (SELECT sp.description
   FROM public.session_proofs sp
   JOIN _session_ids i ON i.id = sp.session_id WHERE i.name = 'detailed'),
  'Description de preuve',
  'T7 preuve externe : sa description possède son propre champ'
);

DO $publish$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM _session_ids WHERE name = 'detailed';
  PERFORM public.publish_session_to_my_groups(
    v_id,
    ARRAY['00000000-0000-0000-0000-000000007212'::uuid]
  );
END
$publish$;

INSERT INTO _tap(line) SELECT is(
  (SELECT s.distance_km
   FROM public.sessions s
   JOIN _session_ids i ON i.name = 'detailed'
   JOIN public.sessions src ON src.id = i.id
   WHERE s.shared_id = src.shared_id
     AND s.group_id = '00000000-0000-0000-0000-000000007212'),
  8.200::numeric,
  'T8 multi-défis : la distance est recopiée'
);

INSERT INTO _tap(line) SELECT ok(
  (SELECT s.comment = 'Commentaire de séance'
          AND sp.description = 'Description de preuve'
   FROM public.sessions s
   JOIN _session_ids i ON i.name = 'detailed'
   JOIN public.sessions src ON src.id = i.id
   JOIN public.session_proofs sp ON sp.session_id = s.id
   WHERE s.shared_id = src.shared_id
     AND s.group_id = '00000000-0000-0000-0000-000000007212'),
  'T9 multi-défis : commentaire et description de preuve restent distincts'
);

INSERT INTO _tap(line) SELECT throws_ok(
  $q$ SELECT public.declare_session(
        '00000000-0000-0000-0000-000000007211', 'Course', 30,
        current_date, NULL, 0) $q$,
  'DISTANCE_INVALID',
  'T10 distance nulle refusée'
);

INSERT INTO _tap(line) SELECT throws_ok(
  $q$ SELECT public.declare_session(
        '00000000-0000-0000-0000-000000007211', 'Course', 30,
        current_date, NULL, 5001) $q$,
  'DISTANCE_INVALID',
  'T11 distance hors plage refusée'
);

INSERT INTO _tap(line) SELECT throws_ok(
  $q$ SELECT public.declare_session(
        '00000000-0000-0000-0000-000000007211', 'Course', 0,
        current_date, NULL, NULL) $q$,
  'DURATION_TOO_SHORT',
  'T12 durée nulle refusée même sans minimum de groupe'
);

INSERT INTO _tap(line) SELECT throws_ok(
  $q$ SELECT public.declare_session(
        '00000000-0000-0000-0000-000000007211', 'Course', 1441,
        current_date, NULL, NULL) $q$,
  'DURATION_TOO_LONG',
  'T13 durée supérieure à 1440 minutes refusée'
);

DO $final$
DECLARE
  nfail   INTEGER;
  summary TEXT;
BEGIN
  SELECT count(*) FILTER (WHERE line LIKE 'not ok%') INTO nfail FROM _tap;
  SELECT string_agg(line, E'\n' ORDER BY (line LIKE 'not ok%') DESC, ord)
    INTO summary
  FROM _tap;

  RAISE EXCEPTION E'=== pgTAP 072 : % ===\n%\n(transaction annulée — aucune donnée sauvegardée)',
    CASE WHEN nfail = 0 THEN 'TOUS OK' ELSE nfail::text || ' ÉCHEC(S)' END,
    summary;
END
$final$;

ROLLBACK;
