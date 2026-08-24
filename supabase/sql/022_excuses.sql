-- ============================================================================
-- 022 — Excuses (Étape 8) : soumission + vote du groupe
-- ============================================================================
-- À exécuter après 018_vote_session.sql et 019 (is_group_member).
-- Crée : anti-doublon (1 excuse active / membre / semaine), RLS lecture des
-- excuses + des votes d'excuse, RPC `submit_excuse` et `cast_excuse_vote`
-- (vote à la majorité simple), et le bucket privé `excuse-justifications`.
-- Les CONSÉQUENCES (exemption de pénalité, reset de semaine) = Étape 9 → TODO.
-- ============================================================================

-- 1. Anti-doublon : une seule excuse NON refusée par membre et par semaine -----
CREATE UNIQUE INDEX IF NOT EXISTS excuses_one_active_per_week
  ON public.excuses (group_id, user_id, week_start)
  WHERE status <> 'rejected';

-- 2. Anti-double-vote d'excuse (un vote par votant et par excuse) --------------
CREATE UNIQUE INDEX IF NOT EXISTS votes_excuse_voter_uidx
  ON public.votes (excuse_id, voter_id)
  WHERE excuse_id IS NOT NULL;

-- 3. RLS — un membre lit les excuses de son groupe ----------------------------
ALTER TABLE public.excuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "excuses_select_members" ON public.excuses;
CREATE POLICY "excuses_select_members" ON public.excuses
  FOR SELECT USING (public.is_group_member(group_id));
-- (Pas de policy INSERT/UPDATE : on passe par les RPC SECURITY DEFINER ci-dessous.)

-- 4. RLS votes — étend la lecture aux votes d'EXCUSE (pas seulement de séance) --
DROP POLICY IF EXISTS "votes_select_members" ON public.votes;
CREATE POLICY "votes_select_members" ON public.votes
  FOR SELECT USING (
    (
      session_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.id = votes.session_id AND public.is_group_member(s.group_id)
      )
    )
    OR (
      excuse_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.excuses e
        WHERE e.id = votes.excuse_id AND public.is_group_member(e.group_id)
      )
    )
  );

-- 5. RPC submit_excuse --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_excuse(
  p_group_id          UUID,
  p_excuse_type       public.excuse_type,
  p_reason            TEXT,
  p_justification_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group  public.groups%ROWTYPE;
  v_week   DATE := (date_trunc('week', (NOW() AT TIME ZONE 'Europe/Paris')::date::timestamp))::date;
  v_id     UUID;
  v_exists BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF NOT public.is_group_member(p_group_id) THEN RAISE EXCEPTION 'NOT_MEMBER'; END IF;

  SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'GROUP_NOT_FOUND'; END IF;
  IF v_group.status NOT IN ('setup', 'active') THEN RAISE EXCEPTION 'GROUP_NOT_ACTIVE'; END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.excuses
    WHERE group_id = p_group_id AND user_id = auth.uid()
      AND week_start = v_week AND status <> 'rejected'
  ) INTO v_exists;
  IF v_exists THEN RAISE EXCEPTION 'EXCUSE_ALREADY_EXISTS'; END IF;

  INSERT INTO public.excuses
    (group_id, user_id, week_start, excuse_type, reason, justification_url, status)
  VALUES
    (p_group_id, auth.uid(), v_week, p_excuse_type, trim(p_reason),
     NULLIF(p_justification_url, ''), 'pending_vote')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_excuse(UUID, public.excuse_type, TEXT, TEXT) TO authenticated;

-- 6. RPC cast_excuse_vote — vote + résolution (majorité simple) ---------------
CREATE OR REPLACE FUNCTION public.cast_excuse_vote(
  p_excuse_id UUID,
  p_value     BOOLEAN,
  p_comment   TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_excuse    public.excuses%ROWTYPE;
  v_yes       INT;
  v_no        INT;
  v_others    INT;
  v_threshold INT;
  v_status    public.excuse_status;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT * INTO v_excuse FROM public.excuses WHERE id = p_excuse_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'EXCUSE_NOT_FOUND'; END IF;

  IF NOT public.is_group_member(v_excuse.group_id) THEN RAISE EXCEPTION 'NOT_MEMBER'; END IF;
  IF v_excuse.user_id = v_uid THEN RAISE EXCEPTION 'CANNOT_VOTE_OWN'; END IF;
  IF v_excuse.status <> 'pending_vote' THEN RAISE EXCEPTION 'EXCUSE_NOT_PENDING'; END IF;

  BEGIN
    INSERT INTO public.votes (excuse_id, voter_id, vote_value, comment)
    VALUES (p_excuse_id, v_uid, p_value, NULLIF(p_comment, ''));
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'ALREADY_VOTED';
  END;

  SELECT
    count(*) FILTER (WHERE vote_value),
    count(*) FILTER (WHERE NOT vote_value)
  INTO v_yes, v_no
  FROM public.votes WHERE excuse_id = p_excuse_id;

  -- Votants = membres actifs sauf l'auteur de l'excuse.
  SELECT count(*) INTO v_others
  FROM public.group_members gm
  WHERE gm.group_id = v_excuse.group_id
    AND gm.left_at IS NULL
    AND gm.user_id <> v_excuse.user_id;

  v_threshold := GREATEST(1, (v_others / 2) + 1);

  v_status := 'pending_vote';
  IF v_yes >= v_threshold THEN
    v_status := 'accepted';
  ELSIF v_no >= v_threshold THEN
    v_status := 'rejected';
  ELSIF (v_yes + v_no) >= v_others THEN
    v_status := CASE WHEN v_yes >= v_no THEN 'accepted' ELSE 'rejected' END; -- égalité = acceptée
  END IF;

  IF v_status <> 'pending_vote' THEN
    UPDATE public.excuses
      SET status = v_status, resolved_at = now()
      WHERE id = p_excuse_id;
    -- TODO Étape 9 : conséquences (exemption de pénalité si 'accepted',
    -- reset complet de la semaine pour une excuse 'major').
  END IF;

  RETURN v_status::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_excuse_vote(UUID, BOOLEAN, TEXT) TO authenticated;

-- 7. Bucket privé pour les justificatifs --------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('excuse-justifications', 'excuse-justifications', false)
ON CONFLICT (id) DO NOTHING;

-- Upload : l'auteur uniquement (chemin = `{user_id}/...`).
DROP POLICY IF EXISTS "excuse_just_insert_owner" ON storage.objects;
CREATE POLICY "excuse_just_insert_owner" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'excuse-justifications'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Lecture : l'auteur OU un membre d'un groupe qu'il partage (pour les votants).
DROP POLICY IF EXISTS "excuse_just_select_shared" ON storage.objects;
CREATE POLICY "excuse_just_select_shared" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'excuse-justifications'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1
        FROM public.group_members gm_owner
        JOIN public.group_members gm_me ON gm_me.group_id = gm_owner.group_id
        WHERE gm_owner.user_id = ((storage.foldername(name))[1])::uuid
          AND gm_me.user_id = auth.uid()
          AND gm_owner.left_at IS NULL
          AND gm_me.left_at IS NULL
      )
    )
  );

NOTIFY pgrst, 'reload schema';
