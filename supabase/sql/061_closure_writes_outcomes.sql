-- ============================================================================
-- 061 — La clôture hebdo écrit l'historique de streak (Phase 3)
-- ============================================================================
-- À exécuter APRÈS 060 (tables + rebuild) et 053 (version de clôture faisant foi).
-- Idempotent (rejouable). Remplace `run_weekly_closure` en AJOUTANT, pour CHAQUE
-- membre traité, l'écriture d'une ligne `member_weekly_outcomes` (success/fail/
-- neutral) puis la reconstruction du cache `member_group_progress`.
--
-- ⚠ Le calcul des PÉNALITÉS est STRICTEMENT identique à 053 :
--   • suspension couvrant la semaine → aucune pénalité (ici : outcome 'neutral').
--   • excuse majeure acceptée        → aucune pénalité (ici : outcome 'neutral').
--   • objectif effectif = weekly_target − (excuses standard), plancher 0.
--   • joker du mois non consommé      → annule 1 séance manquée (consommé).
--   • pénalités = manque résiduel, montant = pénalité du membre.
-- La seule nouveauté est la classification + l'historisation, sans effet de bord
-- sur les pénalités/cagnotte (réconciliation e/f et marqueur g inchangés).
--
-- Classification (miroir EXACT de 060 et de features/streaks/streak-logic.ts) :
--   suspension            → neutral (raison 'suspension')
--   excuse majeure        → neutral (raison 'major_excuse')
--   manque résiduel == 0 sans joker (validées >= objectif effectif) → success
--   manque résiduel == 0 grâce au joker → neutral (raison 'joker')
--   manque résiduel  > 0  → fail (+ pénalités, comme avant)
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
  v_paris    TIMESTAMP;
  v_week     DATE;
  v_grp      RECORD;
  v_mbr      RECORD;
  v_target   INTEGER;   -- objectif effectif (après excuses standard, plancher 0)
  v_valid    INTEGER;
  v_miss     INTEGER;
  v_joker    UUID;
  v_std      INTEGER;
  v_major    BOOLEAN;
  v_susp     BOOLEAN;
  v_status   TEXT;
  v_reason   TEXT;
  v_joker_used BOOLEAN;
  v_created  INTEGER := 0;
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
      -- Excuses acceptées de la semaine (nb standard + présence d'une majeure).
      SELECT COALESCE(count(*) FILTER (WHERE e.excuse_type = 'standard'), 0),
             COALESCE(bool_or(e.excuse_type = 'major'), FALSE)
        INTO v_std, v_major
      FROM public.excuses e
      WHERE e.group_id = v_grp.id AND e.user_id = v_mbr.user_id
        AND e.week_start = v_week AND e.status = 'accepted';

      -- Séances validées de la semaine.
      SELECT count(*) INTO v_valid
      FROM public.sessions s
      WHERE s.group_id = v_grp.id AND s.user_id = v_mbr.user_id
        AND s.week_start = v_week AND s.status = 'validated';

      -- Suspendu sur tout ou partie de la semaine ?
      SELECT EXISTS (
        SELECT 1 FROM public.suspensions s
        WHERE s.group_id = v_grp.id AND s.user_id = v_mbr.user_id
          AND s.status = 'active'
          AND s.start_date <= v_week + 6 AND s.end_date >= v_week
      ) INTO v_susp;

      v_target     := GREATEST(0, v_mbr.weekly_target - v_std);  -- objectif effectif
      v_joker_used := FALSE;
      v_reason     := NULL;

      IF v_susp THEN
        -- Exonéré : aucune pénalité (comme 053). Semaine neutre.
        v_status := 'neutral'; v_reason := 'suspension';
      ELSIF v_major THEN
        -- Excuse majeure : semaine annulée, aucune pénalité. Semaine neutre.
        v_status := 'neutral'; v_reason := 'major_excuse';
      ELSE
        v_miss := GREATEST(0, v_target - v_valid);

        IF v_miss = 0 THEN
          v_status := 'success';                     -- objectif effectif atteint
        ELSE
          -- Joker du mois non consommé → annule 1 séance manquée.
          SELECT j.id INTO v_joker
          FROM public.jokers j
          WHERE j.group_id = v_grp.id AND j.user_id = v_mbr.user_id
            AND j.month_start = date_trunc('month', v_week)::date
            AND j.consumed_at IS NULL
          LIMIT 1;
          IF v_joker IS NOT NULL THEN
            v_miss := v_miss - 1;
            UPDATE public.jokers SET consumed_at = now() WHERE id = v_joker;
            v_joker_used := TRUE;
            v_joker := NULL;
          END IF;

          IF v_miss = 0 THEN
            -- Manque intégralement couvert par le joker → semaine NEUTRE (jamais success).
            v_status := 'neutral'; v_reason := 'joker';
          ELSE
            -- Séances manquées restantes → pénalités (comportement 053 inchangé).
            v_status := 'fail';
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
        END IF;
      END IF;

      -- Historisation (source de vérité) + reconstruction du cache de streak.
      INSERT INTO public.member_weekly_outcomes
        (group_id, user_id, week_start, status, neutral_reason, initial_target,
         effective_target, validated_sessions, standard_excuses, major_excuse, joker_used, finalized_at)
      VALUES
        (v_grp.id, v_mbr.user_id, v_week, v_status, v_reason, v_mbr.weekly_target,
         v_target, v_valid, v_std, v_major, v_joker_used, now())
      ON CONFLICT (group_id, user_id, week_start) DO UPDATE
        SET status             = EXCLUDED.status,
            neutral_reason     = EXCLUDED.neutral_reason,
            initial_target     = EXCLUDED.initial_target,
            effective_target   = EXCLUDED.effective_target,
            validated_sessions = EXCLUDED.validated_sessions,
            standard_excuses   = EXCLUDED.standard_excuses,
            major_excuse       = EXCLUDED.major_excuse,
            joker_used         = EXCLUDED.joker_used,
            finalized_at       = now();

      PERFORM public.rebuild_member_group_progress(v_grp.id, v_mbr.user_id);
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
