-- =============================================================================
-- 036 — Une séance, plusieurs défis
--
-- Prérequis : 006, 017, 018 (et 035 pour le filtre des notifications).
--
-- 1. `sessions.shared_id` : relie les copies d'une MÊME séance réelle
-- 2. `publish_session_to_my_groups()` : recopie la séance dans mes autres défis
-- 3. `notify_session_declared()`      : UNE notification par destinataire
-- 4. `resolve_session()`              : résolution d'un scrutin (extraite de 018)
-- 5. `cast_vote()` v3                 : un vote → tous les défis en commun
--
-- MODÈLE RETENU — une ligne `sessions` par défi, reliées par `shared_id`.
-- L'alternative (une seule ligne + table de liaison) aurait obligé à réécrire
-- tout ce qui lit `sessions.group_id` : tableau de bord, statistiques, semaine,
-- pénalités, historique. Ici la lecture ne change pas d'un octet ; seuls la
-- déclaration, le vote et les notifications évoluent.
--
-- RÈGLES DE GESTION (validées) :
--  · la séance part dans TOUS mes défis en cours, sans filtre de règles —
--    c'est le vote de chaque groupe qui tranche, y compris une séance trop
--    courte pour l'un d'eux ;
--  · chaque groupe résout SON scrutin avec SES membres et SON seuil : une
--    séance peut être validée ici et refusée là. Un membre d'un défi n'a pas à
--    décider pour un défi dont il ne fait pas partie ;
--  · un votant ne vote qu'une fois : son vote est recopié dans tous les défis
--    qu'il partage avec l'auteur.
-- =============================================================================

-- 1. Lien entre les copies d'une même séance --------------------------------
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS shared_id UUID;

-- Séances existantes : chacune est seule de son espèce.
UPDATE public.sessions SET shared_id = id WHERE shared_id IS NULL;

ALTER TABLE public.sessions ALTER COLUMN shared_id SET DEFAULT gen_random_uuid();
ALTER TABLE public.sessions ALTER COLUMN shared_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS sessions_shared_id_idx ON public.sessions (shared_id);

COMMENT ON COLUMN public.sessions.shared_id IS
  'Même séance réelle publiée dans plusieurs défis. Une seule notification, un seul vote.';

-- 2. Publication dans mes autres défis ---------------------------------------
DROP FUNCTION IF EXISTS public.publish_session_to_my_groups(UUID);
CREATE OR REPLACE FUNCTION public.publish_session_to_my_groups(p_session_id UUID)
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
      -- Un défi terminé ou annulé n'accepte plus rien : ce n'est pas une règle
      -- du groupe, c'est le défi qui n'existe plus.
      AND g.status IN ('setup', 'active')
      AND g.id <> v_src.group_id
      -- Idempotent : rappeler la fonction ne crée pas de doublon.
      AND NOT EXISTS (
        SELECT 1 FROM public.sessions s2
        WHERE s2.shared_id = v_src.shared_id AND s2.group_id = g.id
      )
  LOOP
    INSERT INTO public.sessions
      (group_id, user_id, activity_type, duration_min, comment,
       performed_at, week_start, status, shared_id, published_at)
    VALUES
      (v_group.id, v_uid, v_src.activity_type, v_src.duration_min, v_src.comment,
       v_src.performed_at, v_src.week_start, 'pending_vote', v_src.shared_id, v_src.published_at)
    RETURNING id INTO v_new_id;

    -- La preuve suit la séance. Le fichier lui n'est PAS recopié : le chemin de
    -- stockage commence par l'identifiant de l'auteur, et la policy de lecture
    -- autorise tout membre d'un groupe où cet auteur a une séance.
    INSERT INTO public.session_proofs
      (session_id, proof_type, media_url, external_url, latitude, longitude, captured_at, strava_data)
    SELECT v_new_id, sp.proof_type, sp.media_url, sp.external_url,
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

GRANT EXECUTE ON FUNCTION public.publish_session_to_my_groups(UUID) TO authenticated;

-- 3. Une notification par destinataire ---------------------------------------
CREATE OR REPLACE FUNCTION public.notify_session_declared(p_session_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_src      public.sessions%ROWTYPE;
  v_author   TEXT;
  v_when     TEXT;
  v_sent     INTEGER := 0;
BEGIN
  SELECT * INTO v_src FROM public.sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'SESSION_NOT_FOUND'; END IF;

  -- SECURITY DEFINER : sans ce contrôle, n'importe qui pourrait déclencher des
  -- notifications au nom de n'importe qui.
  IF v_src.user_id <> auth.uid() THEN RAISE EXCEPTION 'NOT_AUTHOR'; END IF;

  -- Une séance ne prévient qu'une fois, même si le client rappelle la fonction
  -- (reprise après coupure réseau, double appui).
  IF EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.type = 'vote_pending_session'
      AND n.data ->> 'shared_id' = v_src.shared_id::text
  ) THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(NULLIF(first_name, ''), NULLIF(username, ''), 'Un membre')
    INTO v_author
    FROM public.users WHERE id = v_src.user_id;

  v_when := to_char(v_src.performed_at, 'DD/MM');

  -- Un destinataire peut partager PLUSIEURS défis avec l'auteur : on ne lui
  -- envoie qu'une notification, et on la rattache à l'un des défis qu'il
  -- partage réellement — sinon le bouton « Voter » ouvrirait un groupe dont il
  -- n'est pas membre.
  WITH shared AS (
    SELECT s.id, s.group_id
    FROM public.sessions s
    WHERE s.shared_id = v_src.shared_id
  ),
  recipients AS (
    SELECT
      gm.user_id,
      count(*)                                        AS group_count,
      min(g.name)                                     AS one_group_name,
      (array_agg(sh.id       ORDER BY g.name))[1]     AS session_id,
      (array_agg(sh.group_id ORDER BY g.name))[1]     AS group_id
    FROM shared sh
    JOIN public.group_members gm
      ON gm.group_id = sh.group_id AND gm.left_at IS NULL
    JOIN public.groups g ON g.id = sh.group_id
    WHERE gm.user_id <> v_src.user_id
    GROUP BY gm.user_id
  )
  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT
    r.user_id,
    'vote_pending_session',
    'Séance à valider',
    v_author || ' a déclaré une séance de ' || v_src.duration_min || ' min le ' || v_when ||
    CASE
      WHEN r.group_count = 1
        THEN ' dans « ' || r.one_group_name || ' ». Donne ton vote.'
      ELSE '. Elle compte dans ' || r.group_count ||
           ' de tes défis : un seul vote suffit pour tous.'
    END,
    jsonb_build_object(
      'group_id',   r.group_id,
      'session_id', r.session_id,
      'shared_id',  v_src.shared_id
    )
  FROM recipients r;

  GET DIAGNOSTICS v_sent = ROW_COUNT;
  RETURN v_sent;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_session_declared(UUID) TO authenticated;

-- 4. Résolution d'un scrutin (extraite de 018, inchangée sur le fond) ---------
CREATE OR REPLACE FUNCTION public.resolve_session(p_session_id UUID)
RETURNS public.session_status
LANGUAGE plpgsql
SECURITY DEFINER
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

  SELECT
    count(*) FILTER (WHERE vote_value),
    count(*) FILTER (WHERE NOT vote_value)
  INTO v_yes, v_no
  FROM public.votes v
  WHERE v.session_id = p_session_id
    -- Seuls comptent les votes de membres ENCORE actifs de CE groupe : la
    -- séance vit dans plusieurs défis, les électorats sont distincts.
    AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = v_session.group_id
        AND gm.user_id = v.voter_id
        AND gm.left_at IS NULL
    );

  SELECT count(*) INTO v_others
  FROM public.group_members gm
  WHERE gm.group_id = v_session.group_id
    AND gm.left_at IS NULL
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
    UPDATE public.sessions
       SET status = v_status, validated_at = now()
     WHERE id = p_session_id;
    -- TODO Étape 9 : conséquences (cagnotte si 'validated', pénalité sinon).
  END IF;

  RETURN v_status;
END;
$$;

-- 5. cast_vote v3 — un vote vaut pour tous les défis en commun ---------------
CREATE OR REPLACE FUNCTION public.cast_vote(
  p_session_id UUID,
  p_value      BOOLEAN,
  p_comment    TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_session public.sessions%ROWTYPE;
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
    VALUES (p_session_id, v_uid, p_value, NULLIF(p_comment, ''));
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'ALREADY_VOTED';
  END;

  -- Le même avis vaut pour toutes les copies de la séance dans les défis que
  -- je partage avec l'auteur : c'est la même séance réelle, on ne demande pas
  -- deux fois son avis à la même personne.
  FOR v_twin IN
    SELECT s.id
    FROM public.sessions s
    WHERE s.shared_id = v_session.shared_id
      AND s.id <> p_session_id
      AND s.status = 'pending_vote'
      AND EXISTS (
        SELECT 1 FROM public.group_members gm
        WHERE gm.group_id = s.group_id
          AND gm.user_id = v_uid
          AND gm.left_at IS NULL
      )
  LOOP
    INSERT INTO public.votes (session_id, voter_id, vote_value, comment)
    VALUES (v_twin.id, v_uid, p_value, NULLIF(p_comment, ''))
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Chaque défi tranche avec SES membres et SON seuil.
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
GRANT EXECUTE ON FUNCTION public.resolve_session(UUID) TO authenticated;
