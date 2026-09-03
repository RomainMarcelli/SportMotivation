-- ============================================================================
-- 072 — Détails sportifs des séances et description de preuve externe
-- ============================================================================
-- À exécuter APRÈS 071. Idempotent.
--
-- Ajoute une distance canonique et facultative aux séances, sans stocker les
-- métriques dérivées (allure/vitesse). La description d'une preuve externe est
-- séparée du commentaire de séance afin qu'aucune des deux saisies ne soit perdue.
--
-- `declare_session` change de signature : PostgreSQL identifie une fonction par
-- ses types d'arguments, donc l'ancienne version à 5 paramètres est supprimée
-- avant de créer l'unique version canonique à 6 paramètres. Le dernier paramètre
-- garde DEFAULT NULL : les anciens clients qui ne l'envoient pas restent valides.
-- ============================================================================

-- 1. Colonnes et contraintes -------------------------------------------------
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS distance_km NUMERIC(8, 3);

COMMENT ON COLUMN public.sessions.distance_km IS
  'Distance facultative et canonique de la séance en kilomètres. Allure et vitesse restent calculées côté client.';

ALTER TABLE public.session_proofs
  ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.session_proofs.description IS
  'Description propre à la preuve externe, distincte du commentaire général de la séance.';

DO $constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.sessions'::regclass
      AND conname = 'sessions_distance_km_check'
  ) THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_distance_km_check
      CHECK (distance_km IS NULL OR (distance_km > 0 AND distance_km <= 5000));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.session_proofs'::regclass
      AND conname = 'session_proofs_description_length_check'
  ) THEN
    ALTER TABLE public.session_proofs
      ADD CONSTRAINT session_proofs_description_length_check
      CHECK (description IS NULL OR char_length(description) <= 500);
  END IF;
END
$constraints$;

-- 2. Backfill prudent des anciennes preuves Strava --------------------------
-- JSON numérique uniquement : aucune conversion de texte libre. Les valeurs
-- nulles, null JSON, <= 0 ou hors de la plage acceptée sont laissées intactes.
WITH candidates AS (
  SELECT DISTINCT ON (sp.session_id)
         sp.session_id,
         round(((sp.strava_data ->> 'distance_m')::numeric / 1000), 3) AS distance_km
  FROM public.session_proofs sp
  WHERE sp.proof_type = 'strava'
    AND sp.strava_data IS NOT NULL
    AND jsonb_typeof(sp.strava_data -> 'distance_m') = 'number'
    AND (sp.strava_data ->> 'distance_m')::numeric > 0
    AND (sp.strava_data ->> 'distance_m')::numeric <= 5000000
  ORDER BY sp.session_id, sp.created_at
)
UPDATE public.sessions s
SET distance_km = c.distance_km
FROM candidates c
WHERE s.id = c.session_id
  AND s.distance_km IS NULL;

-- 3. RPC canonique de déclaration -------------------------------------------
DROP FUNCTION IF EXISTS public.declare_session(UUID, TEXT, INTEGER, DATE, TEXT);

CREATE OR REPLACE FUNCTION public.declare_session(
  p_group_id      UUID,
  p_activity_type TEXT,
  p_duration_min  INTEGER,
  p_performed_at  DATE,
  p_comment       TEXT DEFAULT NULL,
  p_distance_km   NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group      public.groups%ROWTYPE;
  v_today      DATE := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_week       DATE;
  v_allowance  INTEGER;
  v_session_id UUID;
BEGIN
  IF NOT public.is_group_member(p_group_id) THEN RAISE EXCEPTION 'NOT_MEMBER'; END IF;

  SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'GROUP_NOT_FOUND'; END IF;
  IF v_group.status NOT IN ('setup', 'active') THEN RAISE EXCEPTION 'GROUP_NOT_ACTIVE'; END IF;

  IF p_activity_type IS NULL OR length(trim(p_activity_type)) = 0 THEN
    RAISE EXCEPTION 'ACTIVITY_REQUIRED';
  END IF;
  IF p_duration_min IS NULL
     OR p_duration_min < GREATEST(1, v_group.min_duration_min) THEN
    RAISE EXCEPTION 'DURATION_TOO_SHORT';
  END IF;
  IF p_duration_min > 1440 THEN RAISE EXCEPTION 'DURATION_TOO_LONG'; END IF;
  IF p_distance_km IS NOT NULL
     AND (p_distance_km <= 0 OR p_distance_km > 5000) THEN
    RAISE EXCEPTION 'DISTANCE_INVALID';
  END IF;
  IF p_performed_at IS NULL THEN RAISE EXCEPTION 'DATE_REQUIRED'; END IF;
  IF p_performed_at > v_today THEN RAISE EXCEPTION 'DATE_IN_FUTURE'; END IF;
  IF v_group.publication_deadline = 'same_day' AND p_performed_at <> v_today THEN
    RAISE EXCEPTION 'PUBLICATION_TOO_LATE';
  END IF;

  v_allowance := public.daily_session_allowance(p_group_id, auth.uid(), p_performed_at);
  IF v_allowance IS NOT NULL
     AND public.sessions_used_on(p_group_id, auth.uid(), p_performed_at) >= v_allowance THEN
    RAISE EXCEPTION 'DAILY_LIMIT_REACHED';
  END IF;

  v_week := date_trunc('week', p_performed_at::timestamp)::date;

  INSERT INTO public.sessions
    (group_id, user_id, activity_type, duration_min, distance_km, comment,
     performed_at, week_start, status)
  VALUES
    (p_group_id, auth.uid(), trim(p_activity_type), p_duration_min, p_distance_km,
     NULLIF(trim(p_comment), ''), p_performed_at, v_week, 'pending_vote')
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

REVOKE ALL ON FUNCTION public.declare_session(UUID, TEXT, INTEGER, DATE, TEXT, NUMERIC)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.declare_session(UUID, TEXT, INTEGER, DATE, TEXT, NUMERIC)
  TO authenticated;

-- 4. Publication multi-défis : même signature, distance et description copiées
-- L'ancien overload à un argument de 036 doit rester absent. La version à deux
-- arguments conserve son DEFAULT NULL, donc les appels existants restent valides.
DROP FUNCTION IF EXISTS public.publish_session_to_my_groups(UUID);

CREATE OR REPLACE FUNCTION public.publish_session_to_my_groups(
  p_session_id UUID,
  p_group_ids  UUID[] DEFAULT NULL
)
RETURNS TABLE (group_id UUID, group_name TEXT, session_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_src    public.sessions%ROWTYPE;
  v_new_id UUID;
  v_group  RECORD;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT * INTO v_src FROM public.sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'SESSION_NOT_FOUND'; END IF;
  IF v_src.user_id <> v_uid THEN RAISE EXCEPTION 'NOT_AUTHOR'; END IF;

  FOR v_group IN
    SELECT g.id, g.name
    FROM public.group_members gm
    JOIN public.groups g ON g.id = gm.group_id
    WHERE gm.user_id = v_uid
      AND gm.left_at IS NULL
      AND g.status IN ('setup', 'active')
      AND g.id <> v_src.group_id
      AND (p_group_ids IS NULL OR g.id = ANY (p_group_ids))
      AND NOT EXISTS (
        SELECT 1 FROM public.sessions s2
        WHERE s2.shared_id = v_src.shared_id AND s2.group_id = g.id
      )
  LOOP
    INSERT INTO public.sessions
      (group_id, user_id, activity_type, duration_min, distance_km, comment,
       performed_at, week_start, status, shared_id, published_at)
    VALUES
      (v_group.id, v_uid, v_src.activity_type, v_src.duration_min, v_src.distance_km,
       v_src.comment, v_src.performed_at, v_src.week_start, 'pending_vote',
       v_src.shared_id, v_src.published_at)
    RETURNING id INTO v_new_id;

    INSERT INTO public.session_proofs
      (session_id, proof_type, media_url, external_url, description,
       latitude, longitude, captured_at, strava_data)
    SELECT v_new_id, sp.proof_type, sp.media_url, sp.external_url, sp.description,
           sp.latitude, sp.longitude, sp.captured_at, sp.strava_data
    FROM public.session_proofs sp
    WHERE sp.session_id = p_session_id;
  END LOOP;

  RETURN QUERY
    SELECT s.group_id, g.name, s.id
    FROM public.sessions s
    JOIN public.groups g ON g.id = s.group_id
    WHERE s.shared_id = v_src.shared_id
    ORDER BY g.name;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_session_to_my_groups(UUID, UUID[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_session_to_my_groups(UUID, UUID[])
  TO authenticated;

NOTIFY pgrst, 'reload schema';
