-- ============================================================================
-- 024 — Notifications in-app pour les excuses
-- ============================================================================
-- À exécuter après 022_excuses.sql.
-- 1. Quand un membre SOUMET une excuse → notification `vote_pending_excuse`
--    à tous les AUTRES membres actifs du groupe.
-- 2. Quand le scrutin se RÉSOUT → notification `excuse_accepted` / `excuse_rejected`
--    à l'auteur de l'excuse (nouvelles valeurs d'enum).
-- Les RPC sont réaffirmées en entier (CREATE OR REPLACE, idempotent).
-- ============================================================================

-- 0. Nouvelles valeurs d'enum pour le résultat --------------------------------
-- (PG 12+ : autorisé en transaction tant que la valeur n'est pas UTILISÉE dans
--  la même transaction — ici elles ne servent qu'à l'exécution des RPC.)
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'excuse_accepted';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'excuse_rejected';

-- 1. submit_excuse : + notification aux autres membres ------------------------
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
  v_author TEXT;
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

  -- Notification in-app aux autres membres actifs du groupe.
  SELECT COALESCE(NULLIF(first_name, ''), NULLIF(username, ''), 'Un membre')
    INTO v_author FROM public.users WHERE id = auth.uid();

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT gm.user_id,
         'vote_pending_excuse',
         'Demande d''excuse à voter',
         v_author || ' demande une excuse cette semaine dans « ' || v_group.name || ' ». Donne ton vote.',
         jsonb_build_object('group_id', p_group_id, 'excuse_id', v_id)
  FROM public.group_members gm
  WHERE gm.group_id = p_group_id
    AND gm.left_at IS NULL
    AND gm.user_id <> auth.uid();

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_excuse(UUID, public.excuse_type, TEXT, TEXT) TO authenticated;

-- 2. cast_excuse_vote : + notification du résultat à l'auteur -----------------
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
  v_group     public.groups%ROWTYPE;
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

    -- Notification du résultat à l'auteur.
    SELECT * INTO v_group FROM public.groups WHERE id = v_excuse.group_id;
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_excuse.user_id,
      CASE WHEN v_status = 'accepted'
        THEN 'excuse_accepted'::public.notification_type
        ELSE 'excuse_rejected'::public.notification_type END,
      CASE WHEN v_status = 'accepted' THEN 'Excuse acceptée' ELSE 'Excuse refusée' END,
      CASE WHEN v_status = 'accepted'
        THEN 'Le groupe « ' || v_group.name || ' » a accepté ton excuse de la semaine.'
        ELSE 'Le groupe « ' || v_group.name || ' » a refusé ton excuse de la semaine.' END,
      jsonb_build_object('group_id', v_excuse.group_id, 'excuse_id', p_excuse_id)
    );
    -- TODO Étape 9 : conséquences (exemption de pénalité si 'accepted',
    -- reset complet de la semaine pour une excuse 'major').
  END IF;

  RETURN v_status::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_excuse_vote(UUID, BOOLEAN, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
