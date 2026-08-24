-- ============================================================================
-- 054 — Blâme = NE PAS voter à l'échéance (Chantier 5, refonte de 048)
-- ============================================================================
-- À exécuter APRÈS 053. Idempotent. Nécessite `pg_cron`.
--
-- CHANGEMENT DE MODÈLE (validé par Romain) :
--   AVANT (048) : blâme = ta séance est REFUSÉE au vote.  ← manipulable : des amis
--                 mal intentionnés refusent tes séances pour te faire payer.
--   APRÈS (054) : blâme = TU N'AS PAS VOTÉ une séance d'un autre avant l'échéance.
--                 Anti-collusion + pousse à l'engagement : ne pas voter AIDE
--                 l'auteur (séance validée par défaut) et PÉNALISE le non-votant.
--
-- Règles :
--   • Échéance effective d'une séance = max(échéance du groupe, publication + 24h).
--     Le +24h garantit qu'une séance publiée tard laisse quand même 24h pour voter.
--   • À l'échéance (cron horaire) : RÉSOLUTION — pas de majorité de refus ⇒ VALIDÉE
--     par défaut (plus de statut « expired »). Puis +1 blâme à chaque membre qui
--     n'a pas voté, SAUF l'auteur et les SUSPENDUS (052), et sauf ceux qui n'étaient
--     pas encore membres à l'échéance.
--   • Seuil = `groups.blame_threshold` (3 « vies »). Au dépassement ⇒ 1 pénalité
--     (montant du membre) + on solde `seuil` blâmes (le compteur repart). Cascade :
--     7 blâmes d'un coup ⇒ 2 pénalités (boucle).
--   • Notif à l'ADMIN quand un joueur atteint le seuil.
--   • L'EXCUSE ne dispense PAS de voter — seule la SUSPENSION exonère.
--
-- On RETIRE le trigger « refus → blâme » de 048 (le modèle a changé).
--
-- Garde-fou de déploiement : le cron ne blâme que les séances dont l'échéance est
-- passée depuis moins de `p_lookback_days` (défaut 30). Évite qu'au 1er run il
-- distribue rétroactivement des blâmes sur de vieilles séances de test restées
-- `pending_vote`. En régime permanent (cron horaire) rien ne dépasse jamais 1 j.
-- ============================================================================

-- 0. Nettoyage : le blâme ne vient plus d'un refus (retrait de 048) -----------
DROP TRIGGER IF EXISTS trg_sessions_blame ON public.sessions;
DROP FUNCTION IF EXISTS public.trg_blame_on_rejection();
DROP FUNCTION IF EXISTS public.apply_blame_on_rejection(UUID);

-- Un blâme est désormais posé par (séance, membre non-votant) : clé unique dessus.
-- (Sous l'ancien modèle il y avait 1 blâme par séance → cet index ne peut pas
--  entrer en conflit avec les données existantes.)
CREATE UNIQUE INDEX IF NOT EXISTS blames_session_user_uidx
  ON public.blames (session_id, user_id);


-- 1. Échéance effective d'une séance (heure de Paris, naïve) ------------------
CREATE OR REPLACE FUNCTION public.session_effective_deadline(p_session_id UUID)
RETURNS TIMESTAMP
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(
    -- Échéance « nominale » du groupe.
    CASE g.vote_deadline
      WHEN 'end_of_week' THEN (s.week_start + 7)::timestamp                       -- dimanche 23h59
      ELSE ((s.published_at AT TIME ZONE 'Europe/Paris')::date + 1)::timestamp     -- jour même 23h59
    END,
    -- Filet : au moins 24 h après la publication.
    (s.published_at AT TIME ZONE 'Europe/Paris') + interval '24 hours'
  )
  FROM public.sessions s
  JOIN public.groups g ON g.id = s.group_id
  WHERE s.id = p_session_id;
$$;


-- 2. resolve_session v3 — échéance effective + PLUS de statut « expired » -----
-- (mêmes notifs de verdict que 043 §4.) Trois changements :
--   • échéance = échéance effective (max(règle du groupe, publication + 24h)) ;
--   • clôture anticipée UNIQUEMENT si participation complète (sinon on attend
--     l'échéance, pour que les non-votants restent blâmables) ;
--   • plus de statut « expired » : à l'échéance sans majorité de refus → VALIDÉE.
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

  -- Votes des membres ENCORE actifs ET ÉLIGIBLES (présents avant la publication :
  -- un membre arrivé après n'avait pas à voter cette séance — cf. item Romain).
  SELECT count(*) FILTER (WHERE vote_value), count(*) FILTER (WHERE NOT vote_value)
    INTO v_yes, v_no
    FROM public.votes v
   WHERE v.session_id = p_session_id
     AND EXISTS (
       SELECT 1 FROM public.group_members gm
       WHERE gm.group_id = v_session.group_id AND gm.user_id = v.voter_id AND gm.left_at IS NULL
         AND gm.joined_at <= v_session.published_at
     );

  -- Votants potentiels = membres actifs, présents avant la publication, sauf l'auteur.
  SELECT count(*) INTO v_others
    FROM public.group_members gm
   WHERE gm.group_id = v_session.group_id AND gm.left_at IS NULL
     AND gm.user_id <> v_session.user_id
     AND gm.joined_at <= v_session.published_at;

  v_threshold := GREATEST(1, (v_others / 2) + 1);

  v_deadline := public.session_effective_deadline(p_session_id);
  v_expired  := (NOW() AT TIME ZONE 'Europe/Paris') >= v_deadline;

  -- Résolution : on ne clôt AVANT l'échéance que si TOUT LE MONDE a voté (aucun
  -- non-votant à blâmer). Sinon on ATTEND l'échéance — c'est ce qui met la
  -- pression : un retardataire peut encore voter pour éviter le blâme du cron.
  -- (On ne résout donc plus sur simple majorité anticipée, à dessein.)
  v_status := 'pending_vote';
  IF (v_yes + v_no) >= v_others THEN
    -- Participation complète → on tranche tout de suite (égalité = validée).
    v_status := CASE WHEN v_yes >= v_no THEN 'validated' ELSE 'rejected' END;
  ELSIF v_expired THEN
    -- Échéance atteinte : refus majoritaire → refusée, sinon VALIDÉE PAR DÉFAUT.
    v_status := CASE WHEN v_no >= v_threshold THEN 'rejected' ELSE 'validated' END;
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


-- 3. apply_session_blames — +1 blâme aux non-votants, puis seuil → pénalité ---
-- À appeler APRÈS résolution (le cron s'en charge). N'agit que sur une séance
-- résolue. Idempotent (index unique blâme + reset des blâmes soldés).
CREATE OR REPLACE FUNCTION public.apply_session_blames(p_session_id UUID)
RETURNS INTEGER  -- nombre de blâmes créés
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session   public.sessions%ROWTYPE;
  v_group     public.groups%ROWTYPE;
  v_deadline  TIMESTAMP;
  v_dl_date   DATE;
  v_threshold INT;
  v_mbr       RECORD;
  v_admin     RECORD;
  v_unsettled INT;
  v_penalty   NUMERIC;
  v_pen_id    UUID;
  v_created   INT := 0;
BEGIN
  SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  -- On ne blâme que sur une séance RÉSOLUE (le vote est clos).
  IF v_session.status = 'pending_vote' THEN RETURN 0; END IF;

  SELECT * INTO v_group FROM public.groups WHERE id = v_session.group_id;
  v_threshold := COALESCE(v_group.blame_threshold, 3);
  v_deadline  := public.session_effective_deadline(p_session_id);
  v_dl_date   := v_deadline::date;

  -- Membres qui AURAIENT DÛ voter et ne l'ont pas fait :
  --   actifs, hors auteur, PRÉSENTS AVANT LA PUBLICATION (un membre arrivé après
  --   n'avait pas à voter → pas de blâme), non suspendus, sans vote.
  FOR v_mbr IN
    SELECT gm.user_id
    FROM public.group_members gm
    WHERE gm.group_id = v_session.group_id
      AND gm.left_at IS NULL
      AND gm.user_id <> v_session.user_id
      AND gm.joined_at <= v_session.published_at
      AND NOT public.is_suspended(v_session.group_id, gm.user_id, v_dl_date)
      AND NOT EXISTS (
        SELECT 1 FROM public.votes vv
        WHERE vv.session_id = p_session_id AND vv.voter_id = gm.user_id
      )
  LOOP
    -- 1 blâme par (séance, membre) — idempotent via l'index unique.
    INSERT INTO public.blames (group_id, user_id, session_id, settled)
    VALUES (v_session.group_id, v_mbr.user_id, p_session_id, FALSE)
    ON CONFLICT (session_id, user_id) DO NOTHING;
    IF NOT FOUND THEN CONTINUE; END IF;   -- déjà posé (rejeu du cron)

    v_created := v_created + 1;

    -- Prévenir le non-votant (drive engagement).
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_mbr.user_id,
      'blame_received',
      'Vote manqué',
      'Tu n''as pas voté une séance dans « ' || v_group.name || ' » avant l''échéance : +1 blâme.',
      jsonb_build_object('group_id', v_session.group_id, 'session_id', p_session_id)
    );

    -- Seuil atteint → pénalité(s). Boucle = cascade (7 blâmes ⇒ 2 pénalités).
    LOOP
      SELECT count(*) INTO v_unsettled
      FROM public.blames
      WHERE group_id = v_session.group_id AND user_id = v_mbr.user_id AND NOT settled;

      EXIT WHEN v_unsettled < v_threshold;

      SELECT COALESCE(gm.penalty_amount, v_group.penalty_amount) INTO v_penalty
      FROM public.group_members gm
      WHERE gm.group_id = v_session.group_id AND gm.user_id = v_mbr.user_id AND gm.left_at IS NULL;

      INSERT INTO public.penalties
        (group_id, user_id, amount, penalty_type, related_session_id, week_start)
      VALUES
        (v_session.group_id, v_mbr.user_id, COALESCE(v_penalty, 0),
         'blame_threshold', p_session_id, v_session.week_start)
      RETURNING id INTO v_pen_id;

      -- Solder `seuil` blâmes (les plus anciens) → le compteur repart.
      UPDATE public.blames SET settled = TRUE
      WHERE id IN (
        SELECT id FROM public.blames
        WHERE group_id = v_session.group_id AND user_id = v_mbr.user_id AND NOT settled
        ORDER BY created_at
        LIMIT v_threshold
      );

      -- Réconciliation cagnotte (sûr avec/sans trigger de base) + recalcul.
      INSERT INTO public.pot_transactions
        (pot_id, user_id, amount, transaction_type, related_penalty_id, is_paid)
      SELECT p.id, v_mbr.user_id, COALESCE(v_penalty, 0), 'penalty_added', v_pen_id, FALSE
      FROM public.pots p
      WHERE p.group_id = v_session.group_id
        AND NOT EXISTS (SELECT 1 FROM public.pot_transactions t WHERE t.related_penalty_id = v_pen_id);

      UPDATE public.pots p
      SET total_amount = COALESCE((
            SELECT sum(t.amount) FROM public.pot_transactions t
            WHERE t.pot_id = p.id AND t.transaction_type = 'penalty_added'
          ), 0),
          updated_at = now()
      WHERE p.group_id = v_session.group_id;

      -- Prévenir le joueur (pénalité) — même type que les autres pénalités.
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        v_mbr.user_id,
        'penalty_applied',
        'Seuil de blâmes atteint',
        'Trop de votes manqués dans « ' || v_group.name ||
          ' » : une pénalité a été ajoutée à la cagnotte.',
        jsonb_build_object('group_id', v_session.group_id, 'session_id', p_session_id)
      );

      -- Prévenir l'ADMIN (pour qu'il puisse réagir / prévenir le joueur).
      FOR v_admin IN
        SELECT user_id FROM public.group_members
        WHERE group_id = v_session.group_id AND left_at IS NULL AND role = 'admin'
          AND user_id <> v_mbr.user_id
      LOOP
        INSERT INTO public.notifications (user_id, type, title, body, data)
        VALUES (
          v_admin.user_id,
          'blame_threshold_reached',
          'Seuil de blâmes atteint',
          'Un joueur de « ' || v_group.name || ' » a atteint le seuil de blâmes (votes manqués).',
          jsonb_build_object('group_id', v_session.group_id, 'user_id', v_mbr.user_id)
        );
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN v_created;
END;
$$;


-- 4. Cron : résout les séances échues + distribue les blâmes ------------------
CREATE OR REPLACE FUNCTION public.resolve_pending_votes(
  p_lookback_days INTEGER DEFAULT 30
)
RETURNS INTEGER  -- nombre de séances résolues
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now      TIMESTAMP := now() AT TIME ZONE 'Europe/Paris';
  v_sess     RECORD;
  v_deadline TIMESTAMP;
  v_resolved INT := 0;
BEGIN
  FOR v_sess IN
    SELECT id FROM public.sessions WHERE status = 'pending_vote'
  LOOP
    v_deadline := public.session_effective_deadline(v_sess.id);
    -- Pas encore échue, ou trop ancienne (garde-fou de déploiement) → on ignore.
    CONTINUE WHEN v_deadline > v_now;
    CONTINUE WHEN v_deadline < v_now - make_interval(days => p_lookback_days);

    -- Résolution (validée par défaut si pas de majorité de refus) + notif auteur.
    PERFORM public.resolve_session(v_sess.id);
    -- Blâmes aux non-votants (exonère auteur + suspendus) + seuil → pénalité.
    PERFORM public.apply_session_blames(v_sess.id);
    v_resolved := v_resolved + 1;
  END LOOP;

  RETURN v_resolved;
END;
$$;


-- 5. Planification : toutes les heures à :15 (heure UTC ; granularité jour/semaine)
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $cron$
BEGIN
  PERFORM cron.unschedule('resolve-votes');
EXCEPTION WHEN OTHERS THEN NULL;
END
$cron$;

SELECT cron.schedule('resolve-votes', '15 * * * *', $$ SELECT public.resolve_pending_votes(); $$);

NOTIFY pgrst, 'reload schema';
