-- ============================================================================
-- 067 — Statistiques de profil v2 (Phase 5)
-- ============================================================================
-- À exécuter APRÈS 060-062 (streaks), 063-066 (badges/champions). Idempotent.
-- Remplace `get_my_profile_stats` (030) : le « streak global ≥1 séance » disparaît
-- au profit d'une lecture ALIGNÉE sur la définition métier `week_outcome`.
--
-- Changement de signature (nouvelles colonnes) → on DROP puis on recrée.
--
-- Colonnes :
--   sessions_done       : séances validées (cumul, tous défis) — inchangé.
--   best_current_streak : MEILLEURE série EN COURS (max de la série live des défis actifs).
--   record_streak       : record historique de série (tous défis).
--   target_rate         : % de semaines RÉUSSIES = success / (success+fail), neutres
--                         exclues (via member_weekly_outcomes) — enfin cohérent avec
--                         excuses/joker/suspension, contrairement à l'ancien calcul.
--   penalties_paid      : € réellement réglés (pot_transactions.is_paid).
--   penalties_due       : € restant à régler.
--   penalties_avoided   : € de pénalités « séance manquée » ÉVITÉES (hors blâmes) —
--                         def. claire : par semaine, chaque séance validée jusqu'à
--                         l'objectif effectif évite 1 pénalité (× pénalité courante du
--                         membre dans ce défi). Approximation assumée (pénalité courante).
--   challenges_finished : défis terminés (status 'completed') dont je suis membre.
--   challenges_won      : défis remportés (challenge_champions).
--   challenges_played   : défis auxquels j'ai participé (distincts).
--   groups_count        : défis en cours dont je suis membre.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_my_profile_stats();

CREATE OR REPLACE FUNCTION public.get_my_profile_stats()
RETURNS TABLE (
  sessions_done       INTEGER,
  best_current_streak INTEGER,
  record_streak       INTEGER,
  target_rate         INTEGER,
  penalties_paid      NUMERIC,
  penalties_due       NUMERIC,
  penalties_avoided   NUMERIC,
  challenges_finished INTEGER,
  challenges_won      INTEGER,
  challenges_played   INTEGER,
  groups_count        INTEGER
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_best_live INTEGER := 0;
  v_grp       RECORD;
  v_s         INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  -- Meilleure série EN COURS : max de la série live sur les défis ACTIFS.
  FOR v_grp IN
    SELECT gm.group_id
    FROM public.group_members gm
    JOIN public.groups g ON g.id = gm.group_id
    WHERE gm.user_id = v_uid AND gm.left_at IS NULL AND g.status = 'active'
  LOOP
    v_s := public.live_streak_for(v_grp.group_id, v_uid);
    IF v_s > v_best_live THEN v_best_live := v_s; END IF;
  END LOOP;

  sessions_done := (
    SELECT count(*)::int FROM public.sessions s
    WHERE s.user_id = v_uid AND s.status = 'validated'
  );

  best_current_streak := v_best_live;

  record_streak := GREATEST(
    v_best_live,
    COALESCE((SELECT max(mgp.best_streak) FROM public.member_group_progress mgp WHERE mgp.user_id = v_uid), 0)
  );

  target_rate := COALESCE((
    SELECT round(
      100.0 * count(*) FILTER (WHERE o.status = 'success')
      / NULLIF(count(*) FILTER (WHERE o.status IN ('success', 'fail')), 0)
    )
    FROM public.member_weekly_outcomes o WHERE o.user_id = v_uid
  ), 0)::int;

  penalties_paid := COALESCE((
    SELECT sum(t.amount) FROM public.pot_transactions t
    WHERE t.user_id = v_uid AND t.is_paid
  ), 0);

  penalties_due := COALESCE((
    SELECT sum(t.amount) FROM public.pot_transactions t
    WHERE t.user_id = v_uid AND NOT t.is_paid AND t.transaction_type = 'penalty_added'
  ), 0);

  penalties_avoided := COALESCE((
    SELECT sum(LEAST(o.validated_sessions, o.effective_target)
               * COALESCE(gm.penalty_amount, g.penalty_amount))
    FROM public.member_weekly_outcomes o
    JOIN public.group_members gm ON gm.group_id = o.group_id AND gm.user_id = o.user_id
    JOIN public.groups g ON g.id = o.group_id
    WHERE o.user_id = v_uid
  ), 0);

  challenges_played := (
    SELECT count(DISTINCT gm.group_id)::int FROM public.group_members gm
    WHERE gm.user_id = v_uid
  );

  challenges_finished := (
    SELECT count(*)::int FROM public.group_members gm
    JOIN public.groups g ON g.id = gm.group_id
    WHERE gm.user_id = v_uid AND gm.left_at IS NULL AND g.status = 'completed'
  );

  challenges_won := (
    SELECT count(*)::int FROM public.challenge_champions cc WHERE cc.user_id = v_uid
  );

  groups_count := (
    SELECT count(*)::int FROM public.group_members gm
    JOIN public.groups g ON g.id = gm.group_id
    WHERE gm.user_id = v_uid AND gm.left_at IS NULL AND g.status = 'active'
  );

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_profile_stats() TO authenticated;

NOTIFY pgrst, 'reload schema';
