-- ============================================================================
-- 062 — Backfill de l'historique de streak sur les semaines DÉJÀ clôturées
-- ============================================================================
-- À exécuter APRÈS 060 + 061. Idempotent (n'écrase jamais une ligne existante).
--
-- But : donner aux membres leur VRAIE série dès la mise en service, sans attendre
-- de nouvelles clôtures. On ne reconstruit que les semaines réellement clôturées
-- (présentes dans `weekly_closures`) — pour celles-là, la table `penalties` est la
-- VÉRITÉ TERRAIN de ce que la clôture a décidé :
--   • pénalité 'missed_session' présente pour la semaine → fail ;
--   • sinon, validées >= objectif effectif → success ;
--   • sinon (pas de pénalité, objectif non atteint) → neutral (couvert par joker).
-- Suspension et excuse majeure priment (neutral), comme dans la clôture.
--
-- ⚠ Limite documentée : la reconstruction rétroactive de « quelle semaine précise
-- le joker mensuel a neutralisée » est une APPROXIMATION (on marque neutral la
-- semaine sans pénalité dont l'objectif n'est pas atteint). Sans impact tant que la
-- clôture 061 maintient l'historique au fil de l'eau pour les semaines à venir.
--
-- Lancement :
--   SELECT public.backfill_weekly_outcomes();              -- tous les groupes
--   SELECT public.backfill_weekly_outcomes('<group_uuid>'); -- un groupe précis
-- ============================================================================

CREATE OR REPLACE FUNCTION public.backfill_weekly_outcomes(p_group_id UUID DEFAULT NULL)
RETURNS INTEGER  -- nombre de lignes d'historique créées
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_grp     RECORD;
  v_mbr     RECORD;
  v_week    DATE;
  v_target  INTEGER;
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
    SELECT g.id, g.penalty_amount
    FROM public.groups g
    WHERE p_group_id IS NULL OR g.id = p_group_id
  LOOP
    FOR v_mbr IN
      SELECT gm.user_id, gm.weekly_target
      FROM public.group_members gm
      WHERE gm.group_id = v_grp.id AND gm.left_at IS NULL
    LOOP
      -- Uniquement les semaines réellement clôturées (vérité terrain disponible).
      FOR v_week IN
        SELECT wc.week_start FROM public.weekly_closures wc
        WHERE wc.group_id = v_grp.id
        ORDER BY wc.week_start
      LOOP
        -- Déjà historisée (par la clôture ou un backfill précédent) → on ne touche pas.
        IF EXISTS (
          SELECT 1 FROM public.member_weekly_outcomes o
          WHERE o.group_id = v_grp.id AND o.user_id = v_mbr.user_id AND o.week_start = v_week
        ) THEN
          CONTINUE;
        END IF;

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
          WHERE s.group_id = v_grp.id AND s.user_id = v_mbr.user_id AND s.status = 'active'
            AND s.start_date <= v_week + 6 AND s.end_date >= v_week
        ) INTO v_susp;

        SELECT EXISTS (
          SELECT 1 FROM public.penalties p
          WHERE p.group_id = v_grp.id AND p.user_id = v_mbr.user_id
            AND p.week_start = v_week AND p.penalty_type = 'missed_session'
        ) INTO v_haspen;

        v_eff := GREATEST(0, v_mbr.weekly_target - v_std);
        v_joker_used := FALSE;
        v_reason := NULL;

        IF v_susp THEN
          v_status := 'neutral'; v_reason := 'suspension';
        ELSIF v_major THEN
          v_status := 'neutral'; v_reason := 'major_excuse';
        ELSIF v_haspen THEN
          v_status := 'fail';
        ELSIF v_valid >= v_eff THEN
          v_status := 'success';
        ELSE
          -- Pas de pénalité mais objectif non atteint → neutralisée par un joker.
          v_status := 'neutral'; v_reason := 'joker'; v_joker_used := TRUE;
        END IF;

        INSERT INTO public.member_weekly_outcomes
          (group_id, user_id, week_start, status, neutral_reason, initial_target,
           effective_target, validated_sessions, standard_excuses, major_excuse, joker_used, finalized_at)
        VALUES
          (v_grp.id, v_mbr.user_id, v_week, v_status, v_reason, v_mbr.weekly_target,
           v_eff, v_valid, v_std, v_major, v_joker_used, now())
        ON CONFLICT (group_id, user_id, week_start) DO NOTHING;

        v_created := v_created + 1;
      END LOOP;

      -- Cache reconstruit une fois toutes les semaines du membre historisées.
      PERFORM public.rebuild_member_group_progress(v_grp.id, v_mbr.user_id);
    END LOOP;
  END LOOP;

  RETURN v_created;
END;
$$;

NOTIFY pgrst, 'reload schema';
