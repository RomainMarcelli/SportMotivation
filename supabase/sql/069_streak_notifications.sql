-- ============================================================================
-- 069 — Notifications conscientes de la série (Phase 6)
-- ============================================================================
-- À exécuter APRÈS 068 (type `objective_reached`). Idempotent.
-- N'ajoute AUCUNE règle métier : ne fait que notifier, en respectant à la lettre
-- la définition « semaine réussie » déjà en place (excuses standard → objectif
-- effectif ; suspension / excuse majeure → semaine neutralisée, série sauve).
--
-- 1. `celebrate_weekly_objective()` — à la validation d'une séance, si l'objectif
--    EFFECTIF de la SEMAINE EN COURS est atteint, une notification `objective_reached`
--    (une seule par défi/semaine) félicite le membre et rappelle sa série.
-- 2. `resolve_session` (reprend 043 À L'IDENTIQUE) + appelle (1) dans le bloc validé.
-- 3. `send_weekly_reminders` (reprend 045) devient STREAK-AWARE et aligné sur
--    l'objectif effectif : on ne relance pas un membre déjà à l'abri (suspendu /
--    excuse majeure / objectif effectif atteint) et on lui dit ce qu'il risque de
--    perdre (« ta série de N semaines est en jeu »).
-- 4. `notification_category()` (reprend 035) classe explicitement `objective_reached`
--    en célébration personnelle (NULL → non filtrable).
-- ============================================================================


-- 1. Célébration « objectif hebdo atteint » ----------------------------------
-- Réservée à la SEMAINE EN COURS : valider une séance d'une semaine passée (vote
-- expiré résolu tardivement) ne relance pas une fête a posteriori. Idempotente :
-- une seule notification par (défi, semaine), quelle que soit la revalidation.
CREATE OR REPLACE FUNCTION public.celebrate_weekly_objective(
  p_group_id   UUID,
  p_user_id    UUID,
  p_week_start DATE
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_week   DATE := date_trunc('week', (now() AT TIME ZONE 'Europe/Paris')::date::timestamp)::date;
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

  SELECT gm.weekly_target INTO v_target
  FROM public.group_members gm
  WHERE gm.group_id = p_group_id AND gm.user_id = p_user_id AND gm.left_at IS NULL;
  IF v_target IS NULL THEN RETURN; END IF;

  -- Excuses acceptées de la semaine (mêmes règles que get_group_streak).
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

  -- Objectif effectif RÉEL atteint : semaine ni neutralisée (suspension / excuse
  -- majeure) ni triviale (objectif effectif nul). Sinon rien à fêter.
  IF v_eff < 1 OR v_susp OR v_major OR v_valid < v_eff THEN RETURN; END IF;

  -- Une seule célébration par (défi, semaine).
  IF EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = p_user_id
      AND n.type = 'objective_reached'
      AND (n.data->>'group_id')   = p_group_id::text
      AND (n.data->>'week_start') = v_week::text
  ) THEN
    RETURN;
  END IF;

  SELECT g.name INTO v_name FROM public.groups g WHERE g.id = p_group_id;
  -- Série INCLUANT la semaine en cours (on vient de confirmer qu'elle est réussie).
  v_streak := public.live_streak_for(p_group_id, p_user_id);

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    p_user_id,
    'objective_reached',
    'Objectif de la semaine atteint 🎯',
    CASE
      WHEN v_streak >= 2
        THEN 'Objectif validé dans « ' || v_name || ' » — ta série passe à '
             || v_streak || ' semaines. Continue ! 🔥'
      ELSE 'Objectif de la semaine validé dans « ' || v_name || ' ». Bravo !'
    END,
    jsonb_build_object('group_id', p_group_id, 'week_start', v_week, 'streak', v_streak)
  );
END;
$$;


-- 2. resolve_session v3 — + célébration de l'objectif hebdo -------------------
-- IDENTIQUE à 043 (calcul du verdict + notifs verdict inchangés). Seul ajout : dans
-- le bloc « validated », un appel à celebrate_weekly_objective (idempotent, borné à
-- la semaine en cours). Le trigger de badges (065) reste, lui, câblé sur l'UPDATE.
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
    IF v_status = 'validated' THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (v_session.user_id, 'session_validated', 'Séance validée',
              'Ta séance du ' || to_char(v_session.performed_at, 'DD/MM') || ' a été validée par « '
                || v_group.name || ' ».',
              jsonb_build_object('group_id', v_session.group_id, 'session_id', p_session_id));

      -- Célébration « objectif hebdo atteint » (semaine en cours, idempotent).
      PERFORM public.celebrate_weekly_objective(
        v_session.group_id, v_session.user_id, v_session.week_start);
    ELSIF v_status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (v_session.user_id, 'session_rejected', 'Séance refusée',
              'Ta séance du ' || to_char(v_session.performed_at, 'DD/MM') || ' a été refusée par « '
                || v_group.name || ' ». Tu peux en refaire une.',
              jsonb_build_object('group_id', v_session.group_id, 'session_id', p_session_id));
    END IF;
  END IF;

  RETURN v_status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_session(UUID) TO authenticated;


-- 3. send_weekly_reminders v2 — streak-aware + objectif effectif --------------
-- Reprend 045 (garde temporelle, idempotence, préférence session_reminders) et
-- affine : on saute les membres déjà à l'abri (semaine neutralisée par suspension
-- ou excuse majeure, ou objectif EFFECTIF déjà atteint) et on rappelle la série en
-- jeu. Type/catégorie inchangés (session_reminder → catégorie session_reminders).
CREATE OR REPLACE FUNCTION public.send_weekly_reminders(p_force BOOLEAN DEFAULT FALSE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paris      TIMESTAMP := (now() AT TIME ZONE 'Europe/Paris');
  v_week_start DATE := (date_trunc('week', (now() AT TIME ZONE 'Europe/Paris')))::date;
  v_today      DATE := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_count      INTEGER := 0;
  v_eff        INTEGER;
  v_remaining  INTEGER;
  v_streak     INTEGER;
  v_body       TEXT;
  r            RECORD;
BEGIN
  IF NOT p_force
     AND (EXTRACT(DOW  FROM v_paris) <> 6      -- 6 = samedi
       OR EXTRACT(HOUR FROM v_paris) <> 9) THEN
    RETURN 0;
  END IF;

  FOR r IN
    SELECT gm.user_id,
           gm.group_id,
           g.name           AS group_name,
           gm.weekly_target AS target,
           COALESCE(done.cnt, 0)     AS done,
           COALESCE(ex.std, 0)       AS std,
           COALESCE(ex.major, FALSE) AS major,
           COALESCE(su.suspended, FALSE) AS suspended
    FROM public.group_members gm
    JOIN public.groups g ON g.id = gm.group_id
    JOIN public.users  u ON u.id = gm.user_id
    LEFT JOIN (
      SELECT user_id, group_id, COUNT(*) AS cnt
      FROM public.sessions
      WHERE week_start = v_week_start AND status = 'validated'
      GROUP BY user_id, group_id
    ) done ON done.user_id = gm.user_id AND done.group_id = gm.group_id
    LEFT JOIN (
      SELECT e.user_id, e.group_id,
             COUNT(*) FILTER (WHERE e.excuse_type = 'standard') AS std,
             bool_or(e.excuse_type = 'major')                   AS major
      FROM public.excuses e
      WHERE e.week_start = v_week_start AND e.status = 'accepted'
      GROUP BY e.user_id, e.group_id
    ) ex ON ex.user_id = gm.user_id AND ex.group_id = gm.group_id
    LEFT JOIN LATERAL (
      SELECT TRUE AS suspended
      FROM public.suspensions s
      WHERE s.group_id = gm.group_id AND s.user_id = gm.user_id AND s.status = 'active'
        AND s.start_date <= v_week_start + 6 AND s.end_date >= v_week_start
      LIMIT 1
    ) su ON TRUE
    WHERE gm.left_at IS NULL
      AND g.status = 'active'
      AND v_today BETWEEN g.challenge_start AND g.challenge_end
      -- Préférence « rappels de séance » (défaut = activé si clé absente).
      AND COALESCE(u.notification_prefs->>'session_reminders', 'true') <> 'false'
      -- Pas déjà rappelé cette semaine pour ce défi (idempotence).
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = gm.user_id
          AND n.type = 'session_reminder'
          AND (n.data->>'group_id')   = gm.group_id::text
          AND (n.data->>'week_start') = v_week_start::text
      )
  LOOP
    -- Semaine neutralisée (suspension / excuse majeure) : la série est déjà sauve.
    CONTINUE WHEN r.suspended OR r.major;

    v_eff := GREATEST(0, r.target - r.std);
    -- Objectif effectif nul ou déjà atteint : rien à rappeler.
    CONTINUE WHEN v_eff < 1 OR r.done >= v_eff;

    v_remaining := v_eff - r.done;
    -- Série EN JEU = série en cours qu'un échec cette semaine ferait tomber. L'objectif
    -- n'étant pas atteint, live_streak_for renvoie le cache (sans +1) — exactement ça.
    v_streak := public.live_streak_for(r.group_id, r.user_id);

    v_body :=
      CASE WHEN v_remaining = 1
        THEN 'Il te reste 1 séance à valider dans « ' || r.group_name
             || ' » avant dimanche soir.'
        ELSE 'Il te reste ' || v_remaining || ' séances à valider dans « '
             || r.group_name || ' » avant dimanche soir.'
      END
      || CASE
           WHEN v_streak >= 1
             THEN ' Ta série de ' || v_streak
                  || CASE WHEN v_streak = 1 THEN ' semaine' ELSE ' semaines' END
                  || ' est en jeu 🔥'
           ELSE ' Ne lâche rien !'
         END;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      r.user_id,
      'session_reminder',
      'Tes séances de la semaine',
      v_body,
      jsonb_build_object(
        'group_id',   r.group_id,
        'week_start', v_week_start,
        'remaining',  v_remaining,
        'streak',     v_streak
      )
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Seul le planificateur déclenche ce job (le cron de 045 appelle la fonction par
-- son nom : le CREATE OR REPLACE ci-dessus suffit, pas de reschedule nécessaire).
REVOKE ALL ON FUNCTION public.send_weekly_reminders(BOOLEAN) FROM PUBLIC;


-- 4. notification_category — classer objective_reached -----------------------
-- Reprend 035 À L'IDENTIQUE, en ajoutant `objective_reached` au groupe des
-- célébrations personnelles (NULL → toujours délivrées, non filtrables), aux côtés
-- de badge_unlocked / session_validated / etc.
CREATE OR REPLACE FUNCTION public.notification_category(p_type public.notification_type)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_type
    WHEN 'session_reminder'      THEN 'session_reminders'
    WHEN 'weekly_recap'          THEN 'weekly_recap'
    WHEN 'vote_pending_session'  THEN 'votes'
    WHEN 'vote_pending_excuse'   THEN 'votes'
    WHEN 'member_joined'         THEN 'group_activity'
    WHEN 'member_left'           THEN 'group_activity'
    WHEN 'admin_transferred'     THEN 'group_activity'
    WHEN 'blame_received'        THEN 'group_activity'
    WHEN 'challenge_ending_soon' THEN 'challenge_end'
    WHEN 'challenge_completed'   THEN 'challenge_end'
    -- Célébrations & décisions personnelles → NULL (toujours délivrées) :
    -- group_invitation, penalty_change_request, penalty_applied, session_validated,
    -- session_rejected, excuse_accepted, excuse_rejected, badge_unlocked,
    -- objective_reached.
    ELSE NULL
  END;
$$;

NOTIFY pgrst, 'reload schema';
