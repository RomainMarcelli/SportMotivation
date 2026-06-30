-- ============================================================================
-- 018 — Vote des séances par le groupe (Étape 7)
-- ============================================================================
-- À exécuter après 006_sessions.sql.
-- Crée : anti-double-vote (index unique), RLS lecture des votes par les membres,
-- et la RPC `cast_vote` (vote + résolution basique du scrutin).
-- Les CONSÉQUENCES (cagnotte, blâmes/pénalités) = Étape 9 → simple TODO ici.
-- ============================================================================

-- 1. Un seul vote de séance par votant ---------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS votes_session_voter_uidx
  ON public.votes (session_id, voter_id)
  WHERE session_id IS NOT NULL;

-- 2. RLS — un membre du groupe peut LIRE les votes des séances du groupe (tally)
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "votes_select_members" ON public.votes;
CREATE POLICY "votes_select_members" ON public.votes
  FOR SELECT USING (
    session_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = votes.session_id
        AND public.is_group_member(s.group_id)
    )
  );
-- (Pas de policy INSERT : on passe par la RPC SECURITY DEFINER ci-dessous.)

-- 3. RPC cast_vote — enregistre un vote puis résout le scrutin ----------------
CREATE OR REPLACE FUNCTION public.cast_vote(
  p_session_id UUID,
  p_value      BOOLEAN,
  p_comment    TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_session   public.sessions%ROWTYPE;
  v_group     public.groups%ROWTYPE;
  v_yes       INT;
  v_no        INT;
  v_others    INT;
  v_threshold INT;
  v_deadline  TIMESTAMP;
  v_expired   BOOLEAN;
  v_status    public.session_status;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'SESSION_NOT_FOUND'; END IF;

  IF NOT public.is_group_member(v_session.group_id) THEN RAISE EXCEPTION 'NOT_MEMBER'; END IF;
  IF v_session.user_id = v_uid THEN RAISE EXCEPTION 'CANNOT_VOTE_OWN'; END IF;
  IF v_session.status <> 'pending_vote' THEN RAISE EXCEPTION 'SESSION_NOT_PENDING'; END IF;

  -- Enregistre le vote (anti-double-vote via l'index unique).
  BEGIN
    INSERT INTO public.votes (session_id, voter_id, vote_value, comment)
    VALUES (p_session_id, v_uid, p_value, NULLIF(p_comment, ''));
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'ALREADY_VOTED';
  END;

  SELECT * INTO v_group FROM public.groups WHERE id = v_session.group_id;

  SELECT
    count(*) FILTER (WHERE vote_value),
    count(*) FILTER (WHERE NOT vote_value)
  INTO v_yes, v_no
  FROM public.votes
  WHERE session_id = p_session_id;

  -- Membres pouvant voter = membres actifs (left_at IS NULL) sauf l'auteur.
  SELECT count(*) INTO v_others
  FROM public.group_members gm
  WHERE gm.group_id = v_session.group_id
    AND gm.left_at IS NULL
    AND gm.user_id <> v_session.user_id;

  v_threshold := GREATEST(1, (v_others / 2) + 1);

  -- Date limite de vote selon la règle du groupe.
  v_deadline := CASE v_group.vote_deadline
    WHEN 'end_of_week' THEN (v_session.week_start + 7)::timestamp
    ELSE ((v_session.published_at AT TIME ZONE 'Europe/Paris')::date + 1)::timestamp
  END;
  v_expired := (NOW() AT TIME ZONE 'Europe/Paris') >= v_deadline;

  -- Résolution basique.
  v_status := 'pending_vote';
  IF v_yes >= v_threshold THEN
    v_status := 'validated';
  ELSIF v_no >= v_threshold THEN
    v_status := 'rejected';
  ELSIF (v_yes + v_no) >= v_others OR v_expired THEN
    IF v_yes = 0 AND v_no = 0 THEN
      v_status := 'expired';
    ELSE
      v_status := CASE WHEN v_yes >= v_no THEN 'validated' ELSE 'rejected' END;
    END IF;
  END IF;

  IF v_status <> 'pending_vote' THEN
    UPDATE public.sessions
      SET status = v_status,
          validated_at = now()
      WHERE id = p_session_id;
    -- TODO Étape 9 : conséquences (créditer la cagnotte si 'validated',
    -- blâme/pénalité si 'rejected' ou 'expired').
  END IF;

  RETURN v_status::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_vote(UUID, BOOLEAN, TEXT) TO authenticated;
