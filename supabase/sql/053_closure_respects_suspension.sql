-- ============================================================================
-- 053 — La clôture hebdo exonère les membres SUSPENDUS (Chantier 4)
-- ============================================================================
-- À exécuter APRÈS 052 (a besoin de la table `suspensions`). Idempotent.
--
-- Remplace la fonction `run_weekly_closure` de 047 en ajoutant UNE garde : un
-- membre suspendu sur (tout ou partie de) la semaine clôturée ne reçoit AUCUNE
-- pénalité « séance manquée ». Le reste est identique à 047 (même idempotence,
-- même réconciliation de la cagnotte, même garde-fou « lundi Paris »).
--
-- Convention repo : re-CREATE OR REPLACE dans un fichier > 052 pour respecter
-- l'ordre numérique (le helper `is_suspended` est défini en 052). La version de
-- 047 reste dans l'historique ; c'est celle-ci qui fait foi.
--
-- Overlap : on exonère si la suspension ACTIVE recouvre un jour quelconque de la
-- semaine [v_week ; v_week+6]. Généreux à dessein — « suspendu = exonéré de tout
-- sur la période », même si la période ne couvre qu'une partie de la semaine.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.run_weekly_closure(
  p_week_start DATE DEFAULT NULL,
  p_force      BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER  -- nombre de pénalités créées
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paris   TIMESTAMP;
  v_week    DATE;
  v_grp     RECORD;
  v_mbr     RECORD;
  v_target  INTEGER;
  v_valid   INTEGER;
  v_miss    INTEGER;
  v_joker   UUID;
  v_created INTEGER := 0;
BEGIN
  v_paris := now() AT TIME ZONE 'Europe/Paris';
  v_week := COALESCE(p_week_start, (date_trunc('week', v_paris)::date - 7));

  IF NOT p_force AND EXTRACT(DOW FROM v_paris) <> 1 THEN
    RETURN 0;
  END IF;

  FOR v_grp IN
    SELECT g.id, g.name, g.penalty_amount
    FROM public.groups g
    WHERE g.status = 'active'
      AND v_week >= date_trunc('week', g.challenge_start::timestamp)::date
      AND v_week <= g.challenge_end
      AND NOT EXISTS (
        SELECT 1 FROM public.weekly_closures wc
        WHERE wc.group_id = g.id AND wc.week_start = v_week
      )
  LOOP
    FOR v_mbr IN
      SELECT gm.user_id,
             gm.weekly_target,
             COALESCE(gm.penalty_amount, v_grp.penalty_amount) AS penalty
      FROM public.group_members gm
      WHERE gm.group_id = v_grp.id AND gm.left_at IS NULL
    LOOP
      -- (a0) GARDE SUSPENSION : suspendu sur tout ou partie de la semaine → exonéré.
      IF EXISTS (
        SELECT 1 FROM public.suspensions s
        WHERE s.group_id = v_grp.id AND s.user_id = v_mbr.user_id
          AND s.status = 'active'
          AND s.start_date <= v_week + 6 AND s.end_date >= v_week
      ) THEN
        CONTINUE;
      END IF;

      -- (a) Objectif effectif selon les excuses acceptées de la semaine.
      SELECT CASE
               WHEN bool_or(e.excuse_type = 'major') THEN -1
               ELSE v_mbr.weekly_target
                    - count(*) FILTER (WHERE e.excuse_type = 'standard')::int
             END
        INTO v_target
      FROM public.excuses e
      WHERE e.group_id = v_grp.id AND e.user_id = v_mbr.user_id
        AND e.week_start = v_week AND e.status = 'accepted';

      IF v_target IS NULL THEN v_target := v_mbr.weekly_target; END IF;
      IF v_target = -1 THEN CONTINUE; END IF;
      IF v_target < 0 THEN v_target := 0; END IF;

      -- (b) Séances validées de la semaine.
      SELECT count(*) INTO v_valid
      FROM public.sessions s
      WHERE s.group_id = v_grp.id AND s.user_id = v_mbr.user_id
        AND s.week_start = v_week AND s.status = 'validated';

      v_miss := GREATEST(0, v_target - v_valid);

      -- (c) Joker du mois non consommé → annule 1 séance manquée.
      IF v_miss > 0 THEN
        SELECT j.id INTO v_joker
        FROM public.jokers j
        WHERE j.group_id = v_grp.id AND j.user_id = v_mbr.user_id
          AND j.month_start = date_trunc('month', v_week)::date
          AND j.consumed_at IS NULL
        LIMIT 1;
        IF v_joker IS NOT NULL THEN
          v_miss := v_miss - 1;
          UPDATE public.jokers SET consumed_at = now() WHERE id = v_joker;
          v_joker := NULL;
        END IF;
      END IF;

      -- (d) 1 pénalité par séance manquée + notification au membre.
      IF v_miss > 0 THEN
        INSERT INTO public.penalties (group_id, user_id, amount, penalty_type, week_start)
        SELECT v_grp.id, v_mbr.user_id, v_mbr.penalty, 'missed_session', v_week
        FROM generate_series(1, v_miss);
        v_created := v_created + v_miss;

        INSERT INTO public.notifications (user_id, type, title, body, data)
        VALUES (
          v_mbr.user_id,
          'penalty_applied',
          CASE WHEN v_miss > 1 THEN 'Séances manquées' ELSE 'Séance manquée' END,
          v_miss || CASE WHEN v_miss > 1 THEN ' séances manquées' ELSE ' séance manquée' END
            || ' cette semaine dans « ' || v_grp.name || ' ». Pénalité ajoutée à la cagnotte.',
          jsonb_build_object('group_id', v_grp.id, 'week_start', v_week)
        );
      END IF;
    END LOOP;

    -- (e) Réconciliation cagnotte : 1 transaction par pénalité sans transaction.
    INSERT INTO public.pot_transactions
      (pot_id, user_id, amount, transaction_type, related_penalty_id, is_paid)
    SELECT p.id, pen.user_id, pen.amount, 'penalty_added', pen.id, FALSE
    FROM public.penalties pen
    JOIN public.pots p ON p.group_id = pen.group_id
    WHERE pen.group_id = v_grp.id
      AND NOT EXISTS (
        SELECT 1 FROM public.pot_transactions t WHERE t.related_penalty_id = pen.id
      );

    -- (f) Recalcul du total du pot depuis les transactions.
    UPDATE public.pots p
    SET total_amount = COALESCE((
          SELECT sum(t.amount) FROM public.pot_transactions t
          WHERE t.pot_id = p.id AND t.transaction_type = 'penalty_added'
        ), 0),
        updated_at = now()
    WHERE p.group_id = v_grp.id;

    -- (g) Marquer la semaine clôturée pour ce groupe.
    INSERT INTO public.weekly_closures (group_id, week_start)
    VALUES (v_grp.id, v_week)
    ON CONFLICT (group_id, week_start) DO NOTHING;
  END LOOP;

  RETURN v_created;
END;
$$;

NOTIFY pgrst, 'reload schema';
