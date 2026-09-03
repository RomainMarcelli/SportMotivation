-- ============================================================================
-- 071 — Stabilisation streaks / badges / clôture / fin de défi
-- ============================================================================
-- À exécuter APRÈS 070. Idempotent.
--
-- Corrige six défauts constatés pendant l'audit :
--   1. 069 avait réinstallé `resolve_session` dans sa version antérieure à 054
--      (plus de filet 24 h, clôture à la majorité, statut `expired`, membres
--      arrivés après la publication comptés). La version 054 est restaurée et la
--      célébration 069 est conservée.
--   2. la clôture n'était pas protégée contre deux exécutions concurrentes et la
--      dernière semaine d'un défi finissant en milieu de semaine pouvait ne jamais
--      être clôturée avant le passage du défi à `completed`.
--   3. les badges de série n'étaient réévalués qu'après validation d'une séance :
--      une réussite acquise par excuse standard / clôture pouvait être oubliée.
--   4. les helpers SECURITY DEFINER de 060–069 gardaient EXECUTE pour PUBLIC par
--      défaut. Les fonctions internes sont désormais inaccessibles via PostgREST.
--   5. `live_streak_for` traitait un ancien membre comme ayant un objectif zéro,
--      donc comme ayant réussi la semaine courante ; le backfill pouvait alors lui
--      attribuer artificiellement le badge de série suivant.
--   6. un défi déjà `completed` mais encore incomplet n'était pas rattrapé avant la
--      finalisation de ses badges ou le déblocage de sa cagnotte.
--
-- Les migrations déjà exécutées ne sont jamais modifiées rétroactivement.
-- ============================================================================

-- 1. Célébration idempotente et sans emoji -----------------------------------
CREATE OR REPLACE FUNCTION public.celebrate_weekly_objective(
  p_group_id   UUID,
  p_user_id    UUID,
  p_week_start DATE
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_week   DATE := date_trunc('week', now() AT TIME ZONE 'Europe/Paris')::date;
  v_target INTEGER;
  v_std    INTEGER;
  v_major  BOOLEAN;
  v_valid  INTEGER;
  v_susp   BOOLEAN;
  v_eff    INTEGER;
  v_streak INTEGER;
  v_name   TEXT;
BEGIN
  IF p_week_start IS DISTINCT FROM v_week THEN RETURN; END IF;

  -- Sérialise les validations concurrentes d'un même objectif. L'ancien couple
  -- EXISTS + INSERT pouvait créer deux notifications dans deux transactions.
  PERFORM pg_advisory_xact_lock(hashtext(
    p_group_id::text || ':' || p_user_id::text || ':' || p_week_start::text
  ));

  SELECT gm.weekly_target INTO v_target
  FROM public.group_members gm
  WHERE gm.group_id = p_group_id AND gm.user_id = p_user_id AND gm.left_at IS NULL;
  IF v_target IS NULL THEN RETURN; END IF;

  SELECT COALESCE(count(*) FILTER (WHERE e.excuse_type = 'standard'), 0),
         COALESCE(bool_or(e.excuse_type = 'major'), FALSE)
    INTO v_std, v_major
  FROM public.excuses e
  WHERE e.group_id = p_group_id AND e.user_id = p_user_id
    AND e.week_start = v_week AND e.status = 'accepted';

  SELECT count(*) INTO v_valid
  FROM public.sessions s
  WHERE s.group_id = p_group_id AND s.user_id = p_user_id
    AND s.week_start = v_week AND s.status = 'validated';

  SELECT EXISTS (
    SELECT 1 FROM public.suspensions s
    WHERE s.group_id = p_group_id AND s.user_id = p_user_id AND s.status = 'active'
      AND s.start_date <= v_week + 6 AND s.end_date >= v_week
  ) INTO v_susp;

  v_eff := GREATEST(0, v_target - v_std);
  IF v_eff < 1 OR v_susp OR v_major OR v_valid < v_eff THEN RETURN; END IF;

  IF EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = p_user_id
      AND n.type = 'objective_reached'
      AND (n.data->>'group_id') = p_group_id::text
      AND (n.data->>'week_start') = v_week::text
  ) THEN
    RETURN;
  END IF;

  SELECT g.name INTO v_name FROM public.groups g WHERE g.id = p_group_id;
  v_streak := public.live_streak_for(p_group_id, p_user_id);

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    p_user_id,
    'objective_reached',
    'Objectif de la semaine atteint',
    CASE
      WHEN v_streak >= 2
        THEN 'Objectif validé dans « ' || v_name || ' » — ta série passe à '
             || v_streak || ' semaines. Continue !'
      ELSE 'Objectif de la semaine validé dans « ' || v_name || ' ». Bravo !'
    END,
    jsonb_build_object('group_id', p_group_id, 'week_start', v_week, 'streak', v_streak)
  );
END;
$$;


-- 2. Résolution de vote : version 054 + célébration 069 ----------------------
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
  -- Verrou de ligne : deux appels concurrents ne peuvent plus écrire deux verdicts
  -- ni deux notifications. Le second relit le statut déjà finalisé et retourne.
  SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_session.status <> 'pending_vote' THEN RETURN v_session.status; END IF;

  SELECT * INTO v_group FROM public.groups WHERE id = v_session.group_id;

  SELECT count(*) FILTER (WHERE vote_value), count(*) FILTER (WHERE NOT vote_value)
    INTO v_yes, v_no
  FROM public.votes v
  WHERE v.session_id = p_session_id
    AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = v_session.group_id
        AND gm.user_id = v.voter_id
        AND gm.left_at IS NULL
        AND gm.joined_at <= v_session.published_at
    );

  SELECT count(*) INTO v_others
  FROM public.group_members gm
  WHERE gm.group_id = v_session.group_id
    AND gm.left_at IS NULL
    AND gm.user_id <> v_session.user_id
    AND gm.joined_at <= v_session.published_at;

  v_threshold := GREATEST(1, (v_others / 2) + 1);
  v_deadline := public.session_effective_deadline(p_session_id);
  v_expired := (now() AT TIME ZONE 'Europe/Paris') >= v_deadline;

  v_status := 'pending_vote';
  IF (v_yes + v_no) >= v_others THEN
    v_status := CASE WHEN v_yes >= v_no THEN 'validated' ELSE 'rejected' END;
  ELSIF v_expired THEN
    v_status := CASE WHEN v_no >= v_threshold THEN 'rejected' ELSE 'validated' END;
  END IF;

  IF v_status <> 'pending_vote' THEN
    UPDATE public.sessions
    SET status = v_status, validated_at = now()
    WHERE id = p_session_id;

    IF v_status = 'validated' THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        v_session.user_id,
        'session_validated',
        'Séance validée',
        'Ta séance du ' || to_char(v_session.performed_at, 'DD/MM')
          || ' a été validée par « ' || v_group.name || ' ».',
        jsonb_build_object('group_id', v_session.group_id, 'session_id', p_session_id)
      );
      PERFORM public.celebrate_weekly_objective(
        v_session.group_id, v_session.user_id, v_session.week_start
      );
    ELSE
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        v_session.user_id,
        'session_rejected',
        'Séance refusée',
        'Ta séance du ' || to_char(v_session.performed_at, 'DD/MM')
          || ' a été refusée par « ' || v_group.name || ' ». Tu peux en refaire une.',
        jsonb_build_object('group_id', v_session.group_id, 'session_id', p_session_id)
      );
    END IF;
  END IF;

  RETURN v_status;
END;
$$;


-- 3. Lecture live sans double incrément si la semaine a déjà été clôturée ------
CREATE OR REPLACE FUNCTION public.live_streak_for(p_group_id UUID, p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_week      DATE := date_trunc('week', now() AT TIME ZONE 'Europe/Paris')::date;
  v_target    INTEGER;
  v_std       INTEGER;
  v_major     BOOLEAN;
  v_valid     INTEGER;
  v_susp      BOOLEAN;
  v_eff       INTEGER;
  v_base      INTEGER;
  v_processed DATE;
  v_active_member BOOLEAN := FALSE;
BEGIN
  -- Le cache persiste après un départ : il reste la seule valeur légitime à
  -- retourner pour un ancien membre, sans projection sur la semaine courante.
  SELECT COALESCE(mgp.current_streak, 0), mgp.last_processed_week
    INTO v_base, v_processed
  FROM public.member_group_progress mgp
  WHERE mgp.group_id = p_group_id AND mgp.user_id = p_user_id;
  IF v_base IS NULL THEN v_base := 0; END IF;

  -- Le booléen explicite évite de dépendre de FOUND après d'autres SELECT.
  SELECT gm.weekly_target, TRUE INTO v_target, v_active_member
  FROM public.group_members gm
  WHERE gm.group_id = p_group_id AND gm.user_id = p_user_id AND gm.left_at IS NULL;
  IF NOT COALESCE(v_active_member, FALSE) THEN RETURN v_base; END IF;

  SELECT COALESCE(count(*) FILTER (WHERE e.excuse_type = 'standard'), 0),
         COALESCE(bool_or(e.excuse_type = 'major'), FALSE)
    INTO v_std, v_major
  FROM public.excuses e
  WHERE e.group_id = p_group_id AND e.user_id = p_user_id
    AND e.week_start = v_week AND e.status = 'accepted';

  SELECT count(*) INTO v_valid
  FROM public.sessions s
  WHERE s.group_id = p_group_id AND s.user_id = p_user_id
    AND s.week_start = v_week AND s.status = 'validated';

  SELECT EXISTS (
    SELECT 1 FROM public.suspensions s
    WHERE s.group_id = p_group_id AND s.user_id = p_user_id AND s.status = 'active'
      AND s.start_date <= v_week + 6 AND s.end_date >= v_week
  ) INTO v_susp;

  -- Une clôture forcée de la semaine courante est déjà reflétée dans le cache.
  IF v_processed = v_week THEN RETURN v_base; END IF;

  v_eff := GREATEST(0, v_target - v_std);
  IF NOT v_susp AND NOT v_major AND v_valid >= v_eff THEN
    RETURN v_base + 1;
  END IF;
  RETURN v_base;
END;
$$;


CREATE OR REPLACE FUNCTION public.get_group_streak(p_group_id UUID)
RETURNS TABLE (
  current_streak         INTEGER,
  best_streak            INTEGER,
  current_week_completed BOOLEAN,
  remaining_sessions     INTEGER
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_week      DATE := date_trunc('week', now() AT TIME ZONE 'Europe/Paris')::date;
  v_target    INTEGER;
  v_std       INTEGER;
  v_major     BOOLEAN;
  v_valid     INTEGER;
  v_susp      BOOLEAN;
  v_eff       INTEGER;
  v_completed BOOLEAN;
  v_base      INTEGER;
  v_best      INTEGER;
  v_processed DATE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF NOT public.is_group_member(p_group_id) THEN RAISE EXCEPTION 'NOT_MEMBER'; END IF;

  SELECT gm.weekly_target INTO v_target
  FROM public.group_members gm
  WHERE gm.group_id = p_group_id AND gm.user_id = v_uid AND gm.left_at IS NULL;
  IF v_target IS NULL THEN v_target := 0; END IF;

  SELECT COALESCE(count(*) FILTER (WHERE e.excuse_type = 'standard'), 0),
         COALESCE(bool_or(e.excuse_type = 'major'), FALSE)
    INTO v_std, v_major
  FROM public.excuses e
  WHERE e.group_id = p_group_id AND e.user_id = v_uid
    AND e.week_start = v_week AND e.status = 'accepted';

  SELECT count(*) INTO v_valid
  FROM public.sessions s
  WHERE s.group_id = p_group_id AND s.user_id = v_uid
    AND s.week_start = v_week AND s.status = 'validated';

  SELECT EXISTS (
    SELECT 1 FROM public.suspensions s
    WHERE s.group_id = p_group_id AND s.user_id = v_uid AND s.status = 'active'
      AND s.start_date <= v_week + 6 AND s.end_date >= v_week
  ) INTO v_susp;

  v_eff := GREATEST(0, v_target - v_std);
  v_completed := NOT v_susp AND NOT v_major AND v_valid >= v_eff;

  SELECT COALESCE(mgp.current_streak, 0), COALESCE(mgp.best_streak, 0),
         mgp.last_processed_week
    INTO v_base, v_best, v_processed
  FROM public.member_group_progress mgp
  WHERE mgp.group_id = p_group_id AND mgp.user_id = v_uid;
  IF v_base IS NULL THEN v_base := 0; END IF;
  IF v_best IS NULL THEN v_best := 0; END IF;

  current_streak := v_base
    + CASE WHEN v_completed AND v_processed IS DISTINCT FROM v_week THEN 1 ELSE 0 END;
  best_streak := GREATEST(v_best, current_streak);
  current_week_completed := v_completed;
  remaining_sessions := GREATEST(0, v_eff - v_valid);
  RETURN NEXT;
END;
$$;


-- 4. Clôture atomique d'UN groupe / UNE semaine ------------------------------
CREATE OR REPLACE FUNCTION public.close_group_week(p_group_id UUID, p_week_start DATE)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_grp       RECORD;
  v_mbr       RECORD;
  v_target    INTEGER;
  v_valid     INTEGER;
  v_miss      INTEGER;
  v_joker     UUID;
  v_std       INTEGER;
  v_major     BOOLEAN;
  v_susp      BOOLEAN;
  v_status    TEXT;
  v_reason    TEXT;
  v_joker_used BOOLEAN;
  v_previous_streak INTEGER;
  v_session_id UUID;
  v_claimed   UUID;
  v_created   INTEGER := 0;
BEGIN
  SELECT g.id, g.name, g.penalty_amount, g.status,
         date_trunc('week', g.challenge_start::timestamp)::date AS first_week,
         date_trunc('week', g.challenge_end::timestamp)::date AS last_week
    INTO v_grp
  FROM public.groups g
  WHERE g.id = p_group_id AND g.status IN ('active', 'completed');

  IF NOT FOUND OR p_week_start < v_grp.first_week OR p_week_start > v_grp.last_week THEN
    RETURN 0;
  END IF;

  -- Une séance publiée tard le dimanche conserve au moins 24 h pour être votée
  -- (`session_effective_deadline`, SQL 054). La clôture horaire du lundi ne doit
  -- donc pas la compter comme manquante à 00:00. On résout les scrutins réellement
  -- échus, applique les blâmes idempotents, puis on diffère toute la semaine tant
  -- qu'un scrutin reste légitimement ouvert.
  FOR v_session_id IN
    SELECT s.id
    FROM public.sessions s
    WHERE s.group_id = p_group_id
      AND s.week_start = p_week_start
      AND s.status = 'pending_vote'
      AND public.session_effective_deadline(s.id)
          <= (now() AT TIME ZONE 'Europe/Paris')
  LOOP
    PERFORM public.resolve_session(v_session_id);
    PERFORM public.apply_session_blames(v_session_id);
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.group_id = p_group_id
      AND s.week_start = p_week_start
      AND s.status = 'pending_vote'
  ) THEN
    RETURN 0;
  END IF;

  -- Le marqueur est pris AVANT les écritures. Son unicité joue le rôle de verrou
  -- inter-transactions ; une erreur ultérieure annule aussi ce marqueur.
  INSERT INTO public.weekly_closures (group_id, week_start)
  VALUES (p_group_id, p_week_start)
  ON CONFLICT (group_id, week_start) DO NOTHING
  RETURNING group_id INTO v_claimed;
  IF v_claimed IS NULL THEN RETURN 0; END IF;

  FOR v_mbr IN
    SELECT gm.user_id, gm.weekly_target,
           COALESCE(gm.penalty_amount, v_grp.penalty_amount) AS penalty
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND (gm.joined_at AT TIME ZONE 'Europe/Paris')::date <= p_week_start + 6
      -- La fermeture historique ne doit jamais recréer une dette pour quelqu'un
      -- qui a déjà quitté le groupe. C'est le comportement de 047/053/061.
      AND gm.left_at IS NULL
  LOOP
    SELECT COALESCE(count(*) FILTER (WHERE e.excuse_type = 'standard'), 0),
           COALESCE(bool_or(e.excuse_type = 'major'), FALSE)
      INTO v_std, v_major
    FROM public.excuses e
    WHERE e.group_id = p_group_id AND e.user_id = v_mbr.user_id
      AND e.week_start = p_week_start AND e.status = 'accepted';

    SELECT count(*) INTO v_valid
    FROM public.sessions s
    WHERE s.group_id = p_group_id AND s.user_id = v_mbr.user_id
      AND s.week_start = p_week_start AND s.status = 'validated';

    SELECT EXISTS (
      SELECT 1 FROM public.suspensions s
      WHERE s.group_id = p_group_id AND s.user_id = v_mbr.user_id
        AND s.status = 'active'
        AND s.start_date <= p_week_start + 6 AND s.end_date >= p_week_start
    ) INTO v_susp;

    SELECT COALESCE((
      SELECT mgp.current_streak FROM public.member_group_progress mgp
      WHERE mgp.group_id = p_group_id AND mgp.user_id = v_mbr.user_id
    ), 0) INTO v_previous_streak;

    v_target := GREATEST(0, v_mbr.weekly_target - v_std);
    v_joker_used := FALSE;
    v_reason := NULL;

    IF v_susp THEN
      v_status := 'neutral';
      v_reason := 'suspension';
    ELSIF v_major THEN
      v_status := 'neutral';
      v_reason := 'major_excuse';
    ELSE
      v_miss := GREATEST(0, v_target - v_valid);
      IF v_miss = 0 THEN
        v_status := 'success';
      ELSE
        v_joker := NULL;
        SELECT j.id INTO v_joker
        FROM public.jokers j
        WHERE j.group_id = p_group_id AND j.user_id = v_mbr.user_id
          AND j.month_start = date_trunc('month', p_week_start)::date
          AND j.consumed_at IS NULL
        ORDER BY j.created_at
        LIMIT 1
        FOR UPDATE;

        IF v_joker IS NOT NULL THEN
          v_miss := v_miss - 1;
          UPDATE public.jokers SET consumed_at = now() WHERE id = v_joker;
          v_joker_used := TRUE;
        END IF;

        IF v_miss = 0 THEN
          v_status := 'neutral';
          v_reason := 'joker';
        ELSE
          v_status := 'fail';
          INSERT INTO public.penalties
            (group_id, user_id, amount, penalty_type, week_start)
          SELECT p_group_id, v_mbr.user_id, v_mbr.penalty, 'missed_session', p_week_start
          FROM generate_series(1, v_miss);
          v_created := v_created + v_miss;

          INSERT INTO public.notifications (user_id, type, title, body, data)
          VALUES (
            v_mbr.user_id,
            'penalty_applied',
            CASE WHEN v_miss > 1 THEN 'Séances manquées' ELSE 'Séance manquée' END,
            v_miss || CASE WHEN v_miss > 1 THEN ' séances manquées' ELSE ' séance manquée' END
              || ' cette semaine dans « ' || v_grp.name || ' ». Pénalité ajoutée à la cagnotte.'
              || CASE WHEN v_previous_streak > 0
                   THEN ' Ta série de ' || v_previous_streak
                     || CASE WHEN v_previous_streak = 1 THEN ' semaine s''arrête.' ELSE ' semaines s''arrête.' END
                   ELSE ''
                 END,
            jsonb_build_object(
              'group_id', p_group_id,
              'week_start', p_week_start,
              'streak_lost', v_previous_streak > 0,
              'previous_streak', v_previous_streak
            )
          );
        END IF;
      END IF;
    END IF;

    INSERT INTO public.member_weekly_outcomes
      (group_id, user_id, week_start, status, neutral_reason, initial_target,
       effective_target, validated_sessions, standard_excuses, major_excuse,
       joker_used, finalized_at)
    VALUES
      (p_group_id, v_mbr.user_id, p_week_start, v_status, v_reason,
       v_mbr.weekly_target, v_target, v_valid, v_std, v_major, v_joker_used, now())
    ON CONFLICT (group_id, user_id, week_start) DO UPDATE
      SET status = EXCLUDED.status,
          neutral_reason = EXCLUDED.neutral_reason,
          initial_target = EXCLUDED.initial_target,
          effective_target = EXCLUDED.effective_target,
          validated_sessions = EXCLUDED.validated_sessions,
          standard_excuses = EXCLUDED.standard_excuses,
          major_excuse = EXCLUDED.major_excuse,
          joker_used = EXCLUDED.joker_used,
          finalized_at = now();

    PERFORM public.rebuild_member_group_progress(p_group_id, v_mbr.user_id);
    -- Attrape aussi les seuils atteints grâce à une excuse standard / la clôture,
    -- sans attendre une hypothétique séance validée la semaine suivante.
    PERFORM public.award_progress_badges(v_mbr.user_id, p_group_id);
  END LOOP;

  INSERT INTO public.pot_transactions
    (pot_id, user_id, amount, transaction_type, related_penalty_id, is_paid)
  SELECT p.id, pen.user_id, pen.amount, 'penalty_added', pen.id, FALSE
  FROM public.penalties pen
  JOIN public.pots p ON p.group_id = pen.group_id
  WHERE pen.group_id = p_group_id
    AND NOT EXISTS (
      SELECT 1 FROM public.pot_transactions t WHERE t.related_penalty_id = pen.id
    );

  UPDATE public.pots p
  SET total_amount = COALESCE((
        SELECT sum(t.amount) FROM public.pot_transactions t
        WHERE t.pot_id = p.id AND t.transaction_type = 'penalty_added'
      ), 0),
      updated_at = now()
  WHERE p.group_id = p_group_id;

  RETURN v_created;
END;
$$;


CREATE OR REPLACE FUNCTION public.run_weekly_closure(
  p_week_start DATE DEFAULT NULL,
  p_force      BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_paris  TIMESTAMP := now() AT TIME ZONE 'Europe/Paris';
  v_week   DATE;
  v_grp    RECORD;
  v_created INTEGER := 0;
BEGIN
  v_week := COALESCE(p_week_start, date_trunc('week', v_paris)::date - 7);
  IF NOT p_force AND EXTRACT(DOW FROM v_paris) <> 1 THEN RETURN 0; END IF;

  FOR v_grp IN
    SELECT g.id
    FROM public.groups g
    WHERE g.status = 'active'
      AND v_week >= date_trunc('week', g.challenge_start::timestamp)::date
      AND v_week <= date_trunc('week', g.challenge_end::timestamp)::date
  LOOP
    v_created := v_created + public.close_group_week(v_grp.id, v_week);
  END LOOP;
  RETURN v_created;
END;
$$;


-- 5. Backfill : inclut aussi les anciens membres et attribue les badges oubliés --
CREATE OR REPLACE FUNCTION public.backfill_weekly_outcomes(p_group_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_grp     RECORD;
  v_mbr     RECORD;
  v_week    DATE;
  v_std     INTEGER;
  v_major   BOOLEAN;
  v_valid   INTEGER;
  v_susp    BOOLEAN;
  v_eff     INTEGER;
  v_haspen  BOOLEAN;
  v_status  TEXT;
  v_reason  TEXT;
  v_joker_used BOOLEAN;
  v_created INTEGER := 0;
BEGIN
  FOR v_grp IN
    SELECT g.id FROM public.groups g
    WHERE p_group_id IS NULL OR g.id = p_group_id
  LOOP
    FOR v_mbr IN
      SELECT gm.user_id, gm.weekly_target, gm.joined_at, gm.left_at
      FROM public.group_members gm
      WHERE gm.group_id = v_grp.id
    LOOP
      FOR v_week IN
        SELECT wc.week_start
        FROM public.weekly_closures wc
        WHERE wc.group_id = v_grp.id
          -- Rejoue exactement l'effectif présent au moment de la clôture, afin de
          -- ne pas inventer d'outcome avant une arrivée ou après un départ.
          AND v_mbr.joined_at <= wc.closed_at
          AND (
            v_mbr.left_at IS NULL
            OR v_mbr.left_at > wc.closed_at
          )
        ORDER BY wc.week_start
      LOOP
        CONTINUE WHEN EXISTS (
          SELECT 1 FROM public.member_weekly_outcomes o
          WHERE o.group_id = v_grp.id AND o.user_id = v_mbr.user_id
            AND o.week_start = v_week
        );

        SELECT COALESCE(count(*) FILTER (WHERE e.excuse_type = 'standard'), 0),
               COALESCE(bool_or(e.excuse_type = 'major'), FALSE)
          INTO v_std, v_major
        FROM public.excuses e
        WHERE e.group_id = v_grp.id AND e.user_id = v_mbr.user_id
          AND e.week_start = v_week AND e.status = 'accepted';

        SELECT count(*) INTO v_valid
        FROM public.sessions s
        WHERE s.group_id = v_grp.id AND s.user_id = v_mbr.user_id
          AND s.week_start = v_week AND s.status = 'validated';

        SELECT EXISTS (
          SELECT 1 FROM public.suspensions s
          WHERE s.group_id = v_grp.id AND s.user_id = v_mbr.user_id
            AND s.status = 'active'
            AND s.start_date <= v_week + 6 AND s.end_date >= v_week
        ) INTO v_susp;

        SELECT EXISTS (
          SELECT 1 FROM public.penalties p
          WHERE p.group_id = v_grp.id AND p.user_id = v_mbr.user_id
            AND p.week_start = v_week AND p.penalty_type = 'missed_session'
        ) INTO v_haspen;

        v_eff := GREATEST(0, v_mbr.weekly_target - v_std);
        v_reason := NULL;
        v_joker_used := FALSE;
        IF v_susp THEN
          v_status := 'neutral'; v_reason := 'suspension';
        ELSIF v_major THEN
          v_status := 'neutral'; v_reason := 'major_excuse';
        ELSIF v_haspen THEN
          v_status := 'fail';
        ELSIF v_valid >= v_eff THEN
          v_status := 'success';
        ELSE
          -- Limite historique : sans lien joker→semaine, « clôturée sans pénalité
          -- et objectif non atteint » est le meilleur signal disponible.
          v_status := 'neutral'; v_reason := 'joker'; v_joker_used := TRUE;
        END IF;

        INSERT INTO public.member_weekly_outcomes
          (group_id, user_id, week_start, status, neutral_reason, initial_target,
           effective_target, validated_sessions, standard_excuses, major_excuse,
           joker_used, finalized_at)
        VALUES
          (v_grp.id, v_mbr.user_id, v_week, v_status, v_reason,
           v_mbr.weekly_target, v_eff, v_valid, v_std, v_major, v_joker_used, now())
        ON CONFLICT (group_id, user_id, week_start) DO NOTHING;
        v_created := v_created + 1;
      END LOOP;

      PERFORM public.rebuild_member_group_progress(v_grp.id, v_mbr.user_id);
      PERFORM public.award_progress_badges(v_mbr.user_id, v_grp.id);
    END LOOP;
  END LOOP;
  RETURN v_created;
END;
$$;


-- 6. Badges et classement final alignés sur les outcomes ---------------------
CREATE OR REPLACE FUNCTION public.finalize_challenge_badges(p_group_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_start   DATE;
  v_end     DATE;
  v_status  TEXT;
  v_done    TIMESTAMPTZ;
  v_name    TEXT;
  v_first_monday DATE;
  v_last_monday  DATE;
  v_meta    JSONB;
  r         RECORD;
  v_fail    BOOLEAN;
  v_success BOOLEAN;
  v_pen     BOOLEAN;
BEGIN
  SELECT g.challenge_start, g.challenge_end, g.status, g.badges_finalized_at, g.name
    INTO v_start, v_end, v_status, v_done, v_name
  FROM public.groups g WHERE g.id = p_group_id
  FOR UPDATE;

  IF NOT FOUND OR v_done IS NOT NULL OR v_status <> 'completed' THEN RETURN; END IF;

  v_first_monday := date_trunc('week', v_start::timestamp)::date;
  v_last_monday := date_trunc('week', v_end::timestamp)::date;

  -- Ne jamais figer les badges avant que toutes les semaines du défi aient une
  -- décision success/fail/neutral.
  IF EXISTS (
    SELECT 1
    FROM generate_series(
      v_first_monday::timestamp,
      v_last_monday::timestamp,
      interval '7 days'
    ) week
    WHERE NOT EXISTS (
      SELECT 1 FROM public.weekly_closures wc
      WHERE wc.group_id = p_group_id AND wc.week_start = week::date
    )
  ) THEN
    RETURN;
  END IF;

  v_meta := jsonb_build_object('group_id', p_group_id, 'group_name', v_name);

  FOR r IN
    WITH members AS (
      SELECT gm.user_id,
             (SELECT count(*) FROM public.sessions s
              WHERE s.group_id = p_group_id AND s.user_id = gm.user_id
                AND s.status = 'validated')::int AS validated,
             (SELECT count(*) FILTER (WHERE o.status = 'success')
              FROM public.member_weekly_outcomes o
              WHERE o.group_id = p_group_id AND o.user_id = gm.user_id)::int AS successes,
             (SELECT count(*) FILTER (WHERE o.status IN ('success', 'fail'))
              FROM public.member_weekly_outcomes o
              WHERE o.group_id = p_group_id AND o.user_id = gm.user_id)::int AS decided
      FROM public.group_members gm
      WHERE gm.group_id = p_group_id AND gm.left_at IS NULL
    ),
    rated AS (
      SELECT user_id, validated,
             CASE WHEN decided > 0
               THEN round(100.0 * successes / decided)::int
               ELSE 0
             END AS rate
      FROM members
    ),
    top AS (
      SELECT rate, validated FROM rated ORDER BY rate DESC, validated DESC LIMIT 1
    )
    SELECT rated.user_id, rated.validated, rated.rate,
           (rated.rate = top.rate AND rated.validated = top.validated) AS is_champion
    FROM rated, top
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.member_weekly_outcomes o
      WHERE o.group_id = p_group_id AND o.user_id = r.user_id AND o.status = 'fail'
    ) INTO v_fail;
    SELECT EXISTS (
      SELECT 1 FROM public.member_weekly_outcomes o
      WHERE o.group_id = p_group_id AND o.user_id = r.user_id AND o.status = 'success'
    ) INTO v_success;
    SELECT EXISTS (
      SELECT 1 FROM public.penalties p
      WHERE p.group_id = p_group_id AND p.user_id = r.user_id
    ) INTO v_pen;

    IF v_success THEN
      PERFORM public.grant_badge(r.user_id, 'challenge_first', 'Premier défi',
        'Terminer un premier défi', p_group_id, v_meta);
    END IF;
    IF v_success AND NOT v_fail THEN
      PERFORM public.grant_badge(r.user_id, 'challenge_perfect', 'Défi parfait',
        '100 % des objectifs hebdo atteints sur un défi', p_group_id, v_meta);
    END IF;
    IF v_success AND NOT v_pen THEN
      PERFORM public.grant_badge(r.user_id, 'challenge_flawless', 'Intouchable',
        'Terminer un défi sans aucune pénalité', p_group_id, v_meta);
    END IF;
    IF r.is_champion AND r.validated > 0 THEN
      PERFORM public.grant_badge(r.user_id, 'challenge_champion', 'Champion',
        'Terminer premier au classement d''un défi', p_group_id,
        v_meta || jsonb_build_object('rate', r.rate, 'validated', r.validated));
      INSERT INTO public.challenge_champions (group_id, user_id, rate, validated)
      VALUES (p_group_id, r.user_id, r.rate, r.validated)
      ON CONFLICT (group_id, user_id) DO UPDATE
        SET rate = EXCLUDED.rate, validated = EXCLUDED.validated;
    END IF;
  END LOOP;

  UPDATE public.groups
  SET badges_finalized_at = now()
  WHERE id = p_group_id AND badges_finalized_at IS NULL;
END;
$$;


CREATE OR REPLACE FUNCTION public.complete_expired_challenges()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_count INTEGER := 0;
  r       RECORD;
  v_week  DATE;
BEGIN
  FOR r IN
    SELECT id, challenge_start, challenge_end
    FROM public.groups
    WHERE status = 'active' AND challenge_end < v_today
  LOOP
    -- Ferme aussi une dernière semaine partielle et rattrape une éventuelle semaine
    -- manquée par le cron, avant de figer classement et trophées.
    FOR v_week IN
      SELECT week::date
      FROM generate_series(
        date_trunc('week', r.challenge_start::timestamp),
        date_trunc('week', r.challenge_end::timestamp),
        interval '7 days'
      ) week
    LOOP
      PERFORM public.close_group_week(r.id, v_week);
    END LOOP;

    -- Un vote encore dans son délai effectif diffère la clôture, donc aussi le
    -- passage à `completed`. Le cron quotidien réessaiera sans figer un faux bilan.
    CONTINUE WHEN EXISTS (
      SELECT 1
      FROM generate_series(
        date_trunc('week', r.challenge_start::timestamp),
        date_trunc('week', r.challenge_end::timestamp),
        interval '7 days'
      ) week
      WHERE NOT EXISTS (
        SELECT 1 FROM public.weekly_closures wc
        WHERE wc.group_id = r.id AND wc.week_start = week::date
      )
    );

    UPDATE public.groups SET status = 'completed' WHERE id = r.id;
    PERFORM public.finalize_challenge_badges(r.id);
    v_count := v_count + 1;
  END LOOP;

  -- Rattrape un défi déjà marqué completed dont la clôture/badge avait été différé.
  -- Il suit exactement le même ordre que le chemin actif : semaines d'abord,
  -- finalisation ensuite. Un vote encore ouvert laisse le défi à reprendre au
  -- prochain passage, sans figer des badges sur un historique incomplet.
  FOR r IN
    SELECT id, challenge_start, challenge_end FROM public.groups
    WHERE status = 'completed' AND badges_finalized_at IS NULL
  LOOP
    FOR v_week IN
      SELECT week::date
      FROM generate_series(
        date_trunc('week', r.challenge_start::timestamp),
        date_trunc('week', r.challenge_end::timestamp),
        interval '7 days'
      ) week
    LOOP
      PERFORM public.close_group_week(r.id, v_week);
    END LOOP;

    CONTINUE WHEN EXISTS (
      SELECT 1
      FROM generate_series(
        date_trunc('week', r.challenge_start::timestamp),
        date_trunc('week', r.challenge_end::timestamp),
        interval '7 days'
      ) week
      WHERE NOT EXISTS (
        SELECT 1 FROM public.weekly_closures wc
        WHERE wc.group_id = r.id AND wc.week_start = week::date
      )
    );

    PERFORM public.finalize_challenge_badges(r.id);
  END LOOP;

  RETURN v_count;
END;
$$;


CREATE OR REPLACE FUNCTION public.unlock_pot(p_group_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid      UUID := auth.uid();
  v_role     TEXT;
  v_start    DATE;
  v_end      DATE;
  v_status   TEXT;
  v_today    DATE := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_week     DATE;
  v_pot_id   UUID;
  v_unlocked TIMESTAMPTZ;
BEGIN
  SELECT gm.role INTO v_role
  FROM public.group_members gm
  WHERE gm.group_id = p_group_id AND gm.user_id = v_uid AND gm.left_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_MEMBER'; END IF;
  IF v_role NOT IN ('admin', 'treasurer') THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;

  SELECT g.challenge_start, g.challenge_end, g.status
    INTO v_start, v_end, v_status
  FROM public.groups g WHERE g.id = p_group_id;

  -- challenge_end est inclusif : le défi n'est fini qu'au jour suivant.
  IF NOT (v_end < v_today OR v_status IN ('completed', 'cancelled')) THEN
    RAISE EXCEPTION 'CHALLENGE_NOT_ENDED';
  END IF;

  -- Un ancien défi déjà `completed` peut provenir de la version 066, qui passait
  -- ce statut avant de garantir toutes les clôtures. Réparer aussi ce chemin avant
  -- de finaliser les badges ou de rendre la cagnotte déblocable.
  IF v_status IN ('active', 'completed') THEN
    FOR v_week IN
      SELECT week::date
      FROM generate_series(
        date_trunc('week', v_start::timestamp),
        date_trunc('week', v_end::timestamp),
        interval '7 days'
      ) week
    LOOP
      PERFORM public.close_group_week(p_group_id, v_week);
    END LOOP;

    IF EXISTS (
      SELECT 1
      FROM generate_series(
        date_trunc('week', v_start::timestamp),
        date_trunc('week', v_end::timestamp),
        interval '7 days'
      ) week
      WHERE NOT EXISTS (
        SELECT 1 FROM public.weekly_closures wc
        WHERE wc.group_id = p_group_id AND wc.week_start = week::date
      )
    ) THEN
      RAISE EXCEPTION 'PENDING_VOTES';
    END IF;
    IF v_status = 'active' THEN
      UPDATE public.groups SET status = 'completed' WHERE id = p_group_id;
      v_status := 'completed';
    END IF;
  END IF;

  IF v_status = 'completed' THEN
    PERFORM public.finalize_challenge_badges(p_group_id);
  END IF;

  SELECT p.id, p.unlocked_at INTO v_pot_id, v_unlocked
  FROM public.pots p WHERE p.group_id = p_group_id;
  IF v_pot_id IS NULL THEN RAISE EXCEPTION 'NO_POT'; END IF;
  IF v_unlocked IS NOT NULL THEN RETURN v_unlocked; END IF;

  UPDATE public.pots
  SET status = 'unlocked', unlocked_at = now(), updated_at = now()
  WHERE id = v_pot_id
  RETURNING unlocked_at INTO v_unlocked;
  RETURN v_unlocked;
END;
$$;


-- 7. Rattrapage historique non destructif ------------------------------------
-- 062 ne lançait pas son propre backfill. Cet appel n'écrase aucune ligne déjà
-- historisée ; il ajoute seulement les couples membre/semaine encore absents.
SELECT public.backfill_weekly_outcomes();

-- Les badges de séances historiques sont eux aussi réévalués sans doublon.
DO $backfill_badges$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT s.user_id, s.group_id
    FROM public.sessions s
    WHERE s.status = 'validated'
  LOOP
    PERFORM public.award_progress_badges(r.user_id, r.group_id);
  END LOOP;
END
$backfill_badges$;


-- 8. Durcissement SECURITY DEFINER ------------------------------------------
-- Les rôles Supabase `anon` / `authenticated` peuvent recevoir des grants par
-- défaut : révoquer PUBLIC seul ne suffit pas (leçon de l'audit 056/057).
REVOKE ALL ON FUNCTION public.rebuild_member_group_progress(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.live_streak_for(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_badge(UUID, TEXT, TEXT, TEXT, UUID, JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.award_session_badges(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.award_streak_badges(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.award_progress_badges(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_award_badges_on_session_validate()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.celebrate_weekly_objective(UUID, UUID, DATE)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.close_group_week(UUID, DATE)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.run_weekly_closure(DATE, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.backfill_weekly_outcomes(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_challenge_badges(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_expired_challenges()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.send_weekly_reminders(BOOLEAN)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notification_category(public.notification_type)
  FROM PUBLIC, anon, authenticated;

-- RPC réellement appelées par le client : auth obligatoire et gardes internes.
REVOKE ALL ON FUNCTION public.get_group_streak(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_group_streak(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.get_my_trophies() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_trophies() TO authenticated;

REVOKE ALL ON FUNCTION public.mark_badges_seen(TEXT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_badges_seen(TEXT[]) TO authenticated;

REVOKE ALL ON FUNCTION public.get_my_profile_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile_stats() TO authenticated;

REVOKE ALL ON FUNCTION public.resolve_session(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_session(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.unlock_pot(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_pot(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
