-- ============================================================================
-- 060 — Streaks : historique des semaines + cache de progression (Phase 3)
-- ============================================================================
-- À exécuter APRÈS 059. Idempotent. Ne touche à AUCUNE logique existante ; ajoute :
--   1. `member_weekly_outcomes` — SOURCE DE VÉRITÉ : 1 ligne par (user × groupe ×
--      semaine CLÔTURÉE), avec le statut métier de la semaine (success/fail/neutral)
--      et le détail ayant servi à le décider (objectif, excuses, joker…). Permet de
--      recalculer streaks / stats / badges de façon déterministe.
--   2. `member_group_progress` — CACHE rapide reconstructible : série en cours,
--      record, dernière semaine réussie, dernière semaine traitée.
--   3. `rebuild_member_group_progress()` — recompose le cache depuis l'historique
--      (idempotent, pas de double incrément).
--   4. `get_group_streak()` — lecture UI : combine le cache (semaines clôturées) +
--      la SEMAINE EN COURS calculée en direct (règle : +1 seulement si l'objectif
--      EFFECTIF est réellement atteint SANS joker ; le joker n'entre qu'à la clôture).
--
-- Définition métier UNIQUE d'une « semaine réussie » (miroir de la clôture 061 et de
-- `features/streaks/streak-logic.ts`) :
--   neutral  = suspension OU excuse majeure OU (manque résiduel couvert par joker) OU
--              hors période de défi → n'incrémente ni ne casse la série.
--   success  = séances validées >= objectif effectif (objectif − excuses standard),
--              SANS joker.
--   fail     = objectif effectif non atteint et pénalité « séance manquée » générée.
-- ============================================================================

-- 1. Historique par (membre × groupe × semaine) — SOURCE DE VÉRITÉ -------------
CREATE TABLE IF NOT EXISTS public.member_weekly_outcomes (
  group_id           UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
  week_start         DATE NOT NULL,                      -- lundi (Europe/Paris)
  status             TEXT NOT NULL CHECK (status IN ('success', 'fail', 'neutral')),
  -- Pourquoi la semaine est neutre (nul si success/fail) — utile au debug/stats.
  neutral_reason     TEXT CHECK (neutral_reason IN ('major_excuse', 'joker', 'suspension', 'out_of_period')),
  initial_target     INTEGER NOT NULL,                   -- objectif de base (group_members.weekly_target)
  effective_target   INTEGER NOT NULL,                   -- objectif après excuses standard (plancher 0)
  validated_sessions INTEGER NOT NULL,                   -- séances validées de la semaine
  standard_excuses   INTEGER NOT NULL DEFAULT 0,         -- nb d'excuses standard acceptées
  major_excuse       BOOLEAN NOT NULL DEFAULT FALSE,     -- une excuse majeure acceptée ?
  joker_used         BOOLEAN NOT NULL DEFAULT FALSE,     -- un joker a-t-il neutralisé la semaine ?
  finalized_at       TIMESTAMPTZ NOT NULL DEFAULT now(), -- date de finalisation (clôture)
  PRIMARY KEY (group_id, user_id, week_start)
);

-- Lecture par les membres du groupe (transparence, comme les blâmes/cagnotte).
-- Écriture : uniquement via les fonctions SECURITY DEFINER (aucune policy d'écriture).
ALTER TABLE public.member_weekly_outcomes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS member_weekly_outcomes_select ON public.member_weekly_outcomes;
CREATE POLICY member_weekly_outcomes_select ON public.member_weekly_outcomes
  FOR SELECT USING (public.is_group_member(group_id));

CREATE INDEX IF NOT EXISTS member_weekly_outcomes_user_idx
  ON public.member_weekly_outcomes (user_id, group_id, week_start);


-- 2. Cache de progression par (membre × groupe) -------------------------------
CREATE TABLE IF NOT EXISTS public.member_group_progress (
  group_id            UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
  current_streak      INTEGER NOT NULL DEFAULT 0,   -- série à travers les semaines CLÔTURÉES
  best_streak         INTEGER NOT NULL DEFAULT 0,   -- record historique (ne régresse jamais)
  last_success_week   DATE,                         -- dernière semaine 'success'
  last_processed_week DATE,                          -- dernière semaine reflétée dans le cache
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

ALTER TABLE public.member_group_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS member_group_progress_select ON public.member_group_progress;
CREATE POLICY member_group_progress_select ON public.member_group_progress
  FOR SELECT USING (public.is_group_member(group_id));


-- 3. Reconstruit le cache depuis l'historique (déterministe, idempotent) -------
-- Parcourt les semaines dans l'ordre : success → +1 (et record), fail → 0,
-- neutral → inchangé. `best_streak` ne régresse jamais (GREATEST avec l'existant).
CREATE OR REPLACE FUNCTION public.rebuild_member_group_progress(
  p_group_id UUID,
  p_user_id  UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r          RECORD;
  v_run      INTEGER := 0;
  v_best     INTEGER := 0;
  v_last     DATE := NULL;
  v_processed DATE := NULL;
BEGIN
  FOR r IN
    SELECT week_start, status
    FROM public.member_weekly_outcomes
    WHERE group_id = p_group_id AND user_id = p_user_id
    ORDER BY week_start ASC
  LOOP
    v_processed := r.week_start;
    IF r.status = 'success' THEN
      v_run := v_run + 1;
      v_best := GREATEST(v_best, v_run);
      v_last := r.week_start;
    ELSIF r.status = 'fail' THEN
      v_run := 0;
    END IF;  -- 'neutral' : série inchangée
  END LOOP;

  INSERT INTO public.member_group_progress
    (group_id, user_id, current_streak, best_streak, last_success_week, last_processed_week, updated_at)
  VALUES (p_group_id, p_user_id, v_run, v_best, v_last, v_processed, now())
  ON CONFLICT (group_id, user_id) DO UPDATE
    SET current_streak      = EXCLUDED.current_streak,
        best_streak         = GREATEST(public.member_group_progress.best_streak, EXCLUDED.best_streak),
        last_success_week   = EXCLUDED.last_success_week,
        last_processed_week = EXCLUDED.last_processed_week,
        updated_at          = now();
END;
$$;


-- 4. Lecture UI : série d'un membre pour un groupe (cache + semaine en cours) ---
-- La semaine EN COURS ne compte +1 que si l'objectif EFFECTIF est réellement
-- atteint (validées >= objectif − excuses standard), hors suspension/excuse majeure,
-- et SANS tenir compte d'un éventuel joker (celui-ci n'agit qu'à la clôture).
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
  v_week      DATE := date_trunc('week', (now() AT TIME ZONE 'Europe/Paris')::date::timestamp)::date;
  v_target    INTEGER;
  v_std       INTEGER;
  v_major     BOOLEAN;
  v_valid     INTEGER;
  v_susp      BOOLEAN;
  v_eff       INTEGER;
  v_completed BOOLEAN;
  v_base      INTEGER;
  v_best      INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF NOT public.is_group_member(p_group_id) THEN RAISE EXCEPTION 'NOT_MEMBER'; END IF;

  SELECT gm.weekly_target INTO v_target
  FROM public.group_members gm
  WHERE gm.group_id = p_group_id AND gm.user_id = v_uid AND gm.left_at IS NULL;
  IF v_target IS NULL THEN v_target := 0; END IF;

  -- Excuses acceptées de la semaine courante.
  SELECT COALESCE(count(*) FILTER (WHERE e.excuse_type = 'standard'), 0),
         COALESCE(bool_or(e.excuse_type = 'major'), FALSE)
    INTO v_std, v_major
  FROM public.excuses e
  WHERE e.group_id = p_group_id AND e.user_id = v_uid
    AND e.week_start = v_week AND e.status = 'accepted';

  -- Séances validées de la semaine courante.
  SELECT count(*) INTO v_valid
  FROM public.sessions s
  WHERE s.group_id = p_group_id AND s.user_id = v_uid
    AND s.week_start = v_week AND s.status = 'validated';

  -- Suspendu sur tout ou partie de la semaine courante ?
  SELECT EXISTS (
    SELECT 1 FROM public.suspensions s
    WHERE s.group_id = p_group_id AND s.user_id = v_uid AND s.status = 'active'
      AND s.start_date <= v_week + 6 AND s.end_date >= v_week
  ) INTO v_susp;

  v_eff := GREATEST(0, v_target - v_std);
  v_completed := (NOT v_susp) AND (NOT v_major) AND (v_valid >= v_eff);

  SELECT mgp.current_streak, mgp.best_streak INTO v_base, v_best
  FROM public.member_group_progress mgp
  WHERE mgp.group_id = p_group_id AND mgp.user_id = v_uid;
  IF v_base IS NULL THEN v_base := 0; END IF;
  IF v_best IS NULL THEN v_best := 0; END IF;

  current_streak         := v_base + CASE WHEN v_completed THEN 1 ELSE 0 END;
  best_streak            := GREATEST(v_best, current_streak);
  current_week_completed := v_completed;
  remaining_sessions     := GREATEST(0, v_eff - v_valid);
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_group_streak(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
