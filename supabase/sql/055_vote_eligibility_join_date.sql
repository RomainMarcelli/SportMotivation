-- ============================================================================
-- 055 — Éligibilité de vote : pas de vote sur une séance publiée AVANT l'arrivée
-- ============================================================================
-- À exécuter APRÈS 054. Idempotent.
--
-- Règle (retour Romain) : quand un joueur intègre un groupe, il ne doit PAS pouvoir
-- voter les séances publiées AVANT son arrivée (ex. l'admin publie lundi, le joueur
-- arrive mardi → il ne vote pas la séance de lundi). On compare `group_members.joined_at`
-- à `sessions.published_at`.
--
-- Le comptage/résolution/blâmes utilisent déjà `joined_at <= published_at` (patch 054).
-- Ici on complète par le garde-fou d'ÉCRITURE : `cast_vote` refuse un vote inéligible
-- (le deck client le cache déjà, mais on verrouille aussi côté serveur).
--
-- = 043 §5 (cast_vote v4) + 2 ajouts : garde d'éligibilité pour MOI, et même garde
--   sur les défis « jumeaux » partagés (036).
-- ============================================================================

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

  -- NOUVEAU : éligibilité — présent AVANT la publication.
  IF EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = v_session.group_id AND gm.user_id = v_uid AND gm.left_at IS NULL
      AND gm.joined_at > v_session.published_at
  ) THEN
    RAISE EXCEPTION 'JOINED_AFTER_PUBLICATION';
  END IF;

  BEGIN
    INSERT INTO public.votes (session_id, voter_id, vote_value, comment)
    VALUES (p_session_id, v_uid, p_value, v_comment);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'ALREADY_VOTED';
  END;

  -- Refus d'un membre → l'auteur est prévenu, avec l'explication s'il y en a une.
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

  -- Le même avis vaut pour toutes les copies partagées (cf. 036), en respectant
  -- l'éligibilité dans CHAQUE défi jumeau (présent avant la publication de la copie).
  FOR v_twin IN
    SELECT s.id FROM public.sessions s
    WHERE s.shared_id = v_session.shared_id AND s.id <> p_session_id
      AND s.status = 'pending_vote'
      AND EXISTS (
        SELECT 1 FROM public.group_members gm
        WHERE gm.group_id = s.group_id AND gm.user_id = v_uid AND gm.left_at IS NULL
          AND gm.joined_at <= s.published_at
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

NOTIFY pgrst, 'reload schema';
