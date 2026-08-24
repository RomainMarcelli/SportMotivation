-- ============================================================================
-- 043 — Décisions sur les sports (refus / vote) + notifications de résultat de séance
-- ============================================================================
-- ⚠ Exécuter APRÈS 042 (valeurs d'enum).
--
-- 1. add_group_activity v2  : prévient AUSSI les autres membres, pas que le demandeur
-- 2. reject_group_activity  : l'admin refuse (commentaire facultatif) → notif au demandeur
-- 3. Vote de groupe pour ajouter un sport (majorité, égalité = pas ajouté)
-- 4. resolve_session v2     : notifie l'auteur du VERDICT (validée / refusée)
-- 5. cast_vote v4           : notifie l'auteur à CHAQUE refus d'un membre (avec explication)
-- ============================================================================


-- 1. add_group_activity v2 — prévenir tout le groupe ------------------------
CREATE OR REPLACE FUNCTION public.add_group_activity(
  p_group_id     UUID,
  p_activity     TEXT,
  p_requester_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity TEXT := btrim(COALESCE(p_activity, ''));
  v_group    public.groups%ROWTYPE;
  v_list     JSONB;
  v_member   RECORD;
BEGIN
  IF NOT public.is_group_admin(p_group_id) THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;
  IF v_activity = '' THEN RAISE EXCEPTION 'ACTIVITY_REQUIRED'; END IF;

  SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'GROUP_NOT_FOUND'; END IF;

  v_list := COALESCE(v_group.accepted_activities, '[]'::jsonb);

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(v_list) a
    WHERE lower(btrim(a)) = lower(v_activity)
  ) THEN
    RETURN v_list;  -- déjà présent : idempotent, pas de notification en double
  END IF;

  v_list := v_list || to_jsonb(v_activity);
  UPDATE public.groups SET accepted_activities = v_list, updated_at = NOW() WHERE id = p_group_id;

  -- Prévenir TOUT le groupe (sauf l'admin qui vient de l'ajouter). Le demandeur
  -- a droit à un message qui reconnaît SA demande ; les autres à une info simple.
  FOR v_member IN
    SELECT user_id FROM public.group_members
     WHERE group_id = p_group_id AND left_at IS NULL AND user_id <> auth.uid()
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_member.user_id,
      'activity_added',
      'Sport ajouté au défi',
      CASE WHEN v_member.user_id = p_requester_id
        THEN 'Ta demande a été acceptée : « ' || v_activity || ' » compte maintenant dans « '
             || v_group.name || ' ».'
        ELSE '« ' || v_activity || ' » a été ajouté aux sports de « ' || v_group.name || ' ».'
      END,
      jsonb_build_object('group_id', p_group_id, 'activity', v_activity)
    );
  END LOOP;

  RETURN v_list;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_group_activity(UUID, TEXT, UUID) TO authenticated;


-- 2. reject_group_activity — l'admin refuse l'ajout -------------------------
CREATE OR REPLACE FUNCTION public.reject_group_activity(
  p_group_id     UUID,
  p_activity     TEXT,
  p_requester_id UUID,
  p_comment      TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity TEXT := btrim(COALESCE(p_activity, ''));
  v_group    public.groups%ROWTYPE;
  v_comment  TEXT := NULLIF(btrim(COALESCE(p_comment, '')), '');
BEGIN
  IF NOT public.is_group_admin(p_group_id) THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;
  IF v_activity = '' THEN RAISE EXCEPTION 'ACTIVITY_REQUIRED'; END IF;

  SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'GROUP_NOT_FOUND'; END IF;

  IF p_requester_id IS NULL OR p_requester_id = auth.uid() THEN RETURN; END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    p_requester_id,
    'activity_rejected',
    'Sport non ajouté',
    'Ta demande d''ajouter « ' || v_activity || ' » à « ' || v_group.name || ' » a été refusée.'
      || COALESCE(' « ' || v_comment || ' »', ''),
    jsonb_build_object('group_id', p_group_id, 'activity', v_activity, 'comment', v_comment)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_group_activity(UUID, TEXT, UUID, TEXT) TO authenticated;


-- 3. Vote de groupe pour ajouter un sport -----------------------------------
CREATE TABLE IF NOT EXISTS public.activity_proposals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  activity     TEXT NOT NULL,
  requested_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  started_by   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.activity_proposal_votes (
  proposal_id UUID NOT NULL REFERENCES public.activity_proposals(id) ON DELETE CASCADE,
  voter_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  value       BOOLEAN NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (proposal_id, voter_id)
);

ALTER TABLE public.activity_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_proposal_votes ENABLE ROW LEVEL SECURITY;

-- Les membres du groupe voient la proposition et les votes ; on écrit via RPC.
DROP POLICY IF EXISTS activity_proposals_select ON public.activity_proposals;
CREATE POLICY activity_proposals_select ON public.activity_proposals
  FOR SELECT USING (public.is_group_member(group_id));

DROP POLICY IF EXISTS activity_proposal_votes_select ON public.activity_proposal_votes;
CREATE POLICY activity_proposal_votes_select ON public.activity_proposal_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.activity_proposals p
      WHERE p.id = proposal_id AND public.is_group_member(p.group_id)
    )
  );

-- 3.a L'admin ouvre un vote plutôt que de trancher lui-même.
CREATE OR REPLACE FUNCTION public.start_activity_vote(
  p_group_id     UUID,
  p_activity     TEXT,
  p_requester_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity    TEXT := btrim(COALESCE(p_activity, ''));
  v_group       public.groups%ROWTYPE;
  v_proposal_id UUID;
  v_starter     TEXT;
  v_member      RECORD;
BEGIN
  IF NOT public.is_group_admin(p_group_id) THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;
  IF v_activity = '' THEN RAISE EXCEPTION 'ACTIVITY_REQUIRED'; END IF;

  SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'GROUP_NOT_FOUND'; END IF;

  -- Déjà dans la liste, ou déjà un vote ouvert pour ce sport : on ne double pas.
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(COALESCE(v_group.accepted_activities, '[]'::jsonb)) a
    WHERE lower(btrim(a)) = lower(v_activity)
  ) THEN
    RAISE EXCEPTION 'ALREADY_ADDED';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.activity_proposals p
    WHERE p.group_id = p_group_id AND p.status = 'pending'
      AND lower(btrim(p.activity)) = lower(v_activity)
  ) THEN
    RAISE EXCEPTION 'VOTE_ALREADY_OPEN';
  END IF;

  INSERT INTO public.activity_proposals (group_id, activity, requested_by, started_by)
  VALUES (p_group_id, v_activity, p_requester_id, auth.uid())
  RETURNING id INTO v_proposal_id;

  SELECT COALESCE(first_name, username, 'L''admin') INTO v_starter
    FROM public.users WHERE id = auth.uid();

  -- Tout le monde vote (y compris l'admin et le demandeur).
  FOR v_member IN
    SELECT user_id FROM public.group_members
     WHERE group_id = p_group_id AND left_at IS NULL
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_member.user_id,
      'activity_vote',
      'Ajouter un sport ?',
      v_starter || ' propose d''ajouter « ' || v_activity || ' » à « ' || v_group.name
        || ' ». La majorité décide.',
      jsonb_build_object('group_id', p_group_id, 'activity', v_activity, 'proposal_id', v_proposal_id)
    );
  END LOOP;

  RETURN v_proposal_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_activity_vote(UUID, TEXT, UUID) TO authenticated;

-- 3.b Un membre vote ; on résout dès que l'issue est certaine (majorité stricte).
CREATE OR REPLACE FUNCTION public.cast_activity_vote(
  p_proposal_id UUID,
  p_value       BOOLEAN
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      UUID := auth.uid();
  v_prop     public.activity_proposals%ROWTYPE;
  v_members  INT;
  v_yes      INT;
  v_no       INT;
  v_needed   INT;
  v_status   TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT * INTO v_prop FROM public.activity_proposals WHERE id = p_proposal_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROPOSAL_NOT_FOUND'; END IF;
  IF NOT public.is_group_member(v_prop.group_id) THEN RAISE EXCEPTION 'NOT_MEMBER'; END IF;
  IF v_prop.status <> 'pending' THEN RETURN v_prop.status; END IF;

  INSERT INTO public.activity_proposal_votes (proposal_id, voter_id, value)
  VALUES (p_proposal_id, v_uid, p_value)
  ON CONFLICT (proposal_id, voter_id) DO UPDATE SET value = EXCLUDED.value;

  SELECT count(*) INTO v_members FROM public.group_members
    WHERE group_id = v_prop.group_id AND left_at IS NULL;

  SELECT count(*) FILTER (WHERE value), count(*) FILTER (WHERE NOT value)
    INTO v_yes, v_no
    FROM public.activity_proposal_votes WHERE proposal_id = p_proposal_id;

  v_needed := (v_members / 2) + 1;  -- majorité stricte des membres

  IF v_yes >= v_needed THEN
    v_status := 'accepted';
  ELSIF v_yes + (v_members - v_yes - v_no) < v_needed THEN
    -- Même en gagnant tous les votes restants, le « oui » ne peut plus atteindre
    -- la majorité → refusé. (Couvre aussi l'égalité : égalité = pas ajouté.)
    v_status := 'rejected';
  ELSE
    RETURN 'pending';
  END IF;

  UPDATE public.activity_proposals
     SET status = v_status, resolved_at = NOW()
   WHERE id = p_proposal_id AND status = 'pending';

  IF NOT FOUND THEN RETURN v_status; END IF;  -- un autre vote a déjà résolu

  IF v_status = 'accepted' THEN
    -- Ajout + notification à tout le groupe. `add_group_activity` exige d'être
    -- admin ; ici on est en SECURITY DEFINER mais `auth.uid()` peut être un
    -- simple membre → on fait l'ajout directement, puis on notifie.
    UPDATE public.groups
       SET accepted_activities = COALESCE(accepted_activities, '[]'::jsonb) || to_jsonb(v_prop.activity),
           updated_at = NOW()
     WHERE id = v_prop.group_id
       AND NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements_text(COALESCE(accepted_activities, '[]'::jsonb)) a
         WHERE lower(btrim(a)) = lower(v_prop.activity)
       );

    INSERT INTO public.notifications (user_id, type, title, body, data)
    SELECT gm.user_id, 'activity_added', 'Sport ajouté au défi',
           'Le groupe a voté : « ' || v_prop.activity || ' » est ajouté au défi.',
           jsonb_build_object('group_id', v_prop.group_id, 'activity', v_prop.activity)
    FROM public.group_members gm
    WHERE gm.group_id = v_prop.group_id AND gm.left_at IS NULL;
  ELSE
    -- Refusé : on prévient surtout le demandeur (ou celui qui a lancé le vote).
    INSERT INTO public.notifications (user_id, type, title, body, data)
    SELECT COALESCE(v_prop.requested_by, v_prop.started_by),
           'activity_rejected', 'Sport non ajouté',
           'Le groupe a voté contre l''ajout de « ' || v_prop.activity || ' ».',
           jsonb_build_object('group_id', v_prop.group_id, 'activity', v_prop.activity);
  END IF;

  RETURN v_status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_activity_vote(UUID, BOOLEAN) TO authenticated;


-- 4. resolve_session v2 — prévenir l'auteur du verdict ----------------------
-- (identique à 036 sur le calcul ; on ajoute la notification finale à l'auteur.)
CREATE OR REPLACE FUNCTION public.resolve_session(p_session_id UUID)
RETURNS public.session_status
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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
  SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_session.status <> 'pending_vote' THEN RETURN v_session.status; END IF;

  SELECT * INTO v_group FROM public.groups WHERE id = v_session.group_id;

  SELECT count(*) FILTER (WHERE vote_value), count(*) FILTER (WHERE NOT vote_value)
    INTO v_yes, v_no
    FROM public.votes v
   WHERE v.session_id = p_session_id
     AND EXISTS (
       SELECT 1 FROM public.group_members gm
       WHERE gm.group_id = v_session.group_id AND gm.user_id = v.voter_id AND gm.left_at IS NULL
     );

  SELECT count(*) INTO v_others
    FROM public.group_members gm
   WHERE gm.group_id = v_session.group_id AND gm.left_at IS NULL
     AND gm.user_id <> v_session.user_id;

  v_threshold := GREATEST(1, (v_others / 2) + 1);

  v_deadline := CASE v_group.vote_deadline
    WHEN 'end_of_week' THEN (v_session.week_start + 7)::timestamp
    ELSE ((v_session.published_at AT TIME ZONE 'Europe/Paris')::date + 1)::timestamp
  END;
  v_expired := (NOW() AT TIME ZONE 'Europe/Paris') >= v_deadline;

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
    UPDATE public.sessions SET status = v_status, validated_at = now() WHERE id = p_session_id;

    -- Notification de VERDICT à l'auteur (une seule fois, à la transition).
    -- Pas de notification à chaque « oui » : seul le résultat complet compte.
    IF v_status = 'validated' THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (v_session.user_id, 'session_validated', 'Séance validée',
              'Ta séance du ' || to_char(v_session.performed_at, 'DD/MM') || ' a été validée par « '
                || v_group.name || ' ».',
              jsonb_build_object('group_id', v_session.group_id, 'session_id', p_session_id));
    ELSIF v_status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (v_session.user_id, 'session_rejected', 'Séance refusée',
              'Ta séance du ' || to_char(v_session.performed_at, 'DD/MM') || ' a été refusée par « '
                || v_group.name || ' ». Tu peux en refaire une.',
              jsonb_build_object('group_id', v_session.group_id, 'session_id', p_session_id));
    END IF;
    -- TODO Étape 9 : conséquences cagnotte / pénalité.
  END IF;

  RETURN v_status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_session(UUID) TO authenticated;


-- 5. cast_vote v4 — prévenir l'auteur à chaque refus d'un membre ------------
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
  v_uid     UUID := auth.uid();
  v_session public.sessions%ROWTYPE;
  v_group   public.groups%ROWTYPE;
  v_voter   TEXT;
  v_comment TEXT := NULLIF(btrim(COALESCE(p_comment, '')), '');
  v_twin    RECORD;
  v_status  public.session_status;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'SESSION_NOT_FOUND'; END IF;

  IF NOT public.is_group_member(v_session.group_id) THEN RAISE EXCEPTION 'NOT_MEMBER'; END IF;
  IF v_session.user_id = v_uid THEN RAISE EXCEPTION 'CANNOT_VOTE_OWN'; END IF;
  IF v_session.status <> 'pending_vote' THEN RAISE EXCEPTION 'SESSION_NOT_PENDING'; END IF;

  BEGIN
    INSERT INTO public.votes (session_id, voter_id, vote_value, comment)
    VALUES (p_session_id, v_uid, p_value, v_comment);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'ALREADY_VOTED';
  END;

  -- Refus d'un membre → l'auteur est prévenu, avec l'explication s'il y en a une.
  -- Une seule notification (celle du défi voté), pas une par défi jumeau.
  IF p_value = FALSE THEN
    SELECT * INTO v_group FROM public.groups WHERE id = v_session.group_id;
    SELECT COALESCE(first_name, username, 'Un membre') INTO v_voter
      FROM public.users WHERE id = v_uid;
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_session.user_id,
      'session_refused_by_member',
      'Un membre a refusé ta séance',
      v_voter || ' a refusé ta séance du ' || to_char(v_session.performed_at, 'DD/MM')
        || ' dans « ' || v_group.name || ' ».' || COALESCE(' « ' || v_comment || ' »', ''),
      jsonb_build_object('group_id', v_session.group_id, 'session_id', p_session_id)
    );
  END IF;

  -- Le même avis vaut pour toutes les copies partagées (cf. 036).
  FOR v_twin IN
    SELECT s.id FROM public.sessions s
    WHERE s.shared_id = v_session.shared_id AND s.id <> p_session_id
      AND s.status = 'pending_vote'
      AND EXISTS (
        SELECT 1 FROM public.group_members gm
        WHERE gm.group_id = s.group_id AND gm.user_id = v_uid AND gm.left_at IS NULL
      )
  LOOP
    INSERT INTO public.votes (session_id, voter_id, vote_value, comment)
    VALUES (v_twin.id, v_uid, p_value, v_comment)
    ON CONFLICT DO NOTHING;
  END LOOP;

  v_status := public.resolve_session(p_session_id);
  FOR v_twin IN
    SELECT s.id FROM public.sessions s
    WHERE s.shared_id = v_session.shared_id AND s.id <> p_session_id
  LOOP
    PERFORM public.resolve_session(v_twin.id);
  END LOOP;

  RETURN v_status::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_vote(UUID, BOOLEAN, TEXT) TO authenticated;
