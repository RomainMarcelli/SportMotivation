-- ============================================================================
-- 065 — Attribution des badges (Phase 4) — CÔTÉ SERVEUR, idempotent
-- ============================================================================
-- À exécuter APRÈS 063 (table) + 064 (type de notif). Idempotent.
--
-- Principe : le client ne débloque JAMAIS un badge. L'attribution part d'un TRIGGER
-- sur la validation d'une séance : à chaque passage `-> validated`, on ré-évalue les
-- badges de SÉANCES (cumul validées) et de SÉRIE (record, série live incluse) du
-- membre concerné. `grant_badge` est idempotent (UNIQUE(user_id, badge_key)) et
-- n'émet la notification `badge_unlocked` qu'au PREMIER déblocage.
--
-- ⚠ Les clés/seuils DOIVENT rester synchronisés avec `constants/badges.ts`.
-- Les badges de DÉFI (premier défi, parfait, intouchable, champion) seront attribués
-- en fin de défi (lot suivant), pas ici.
-- ============================================================================

-- Série « live » d'un membre pour un groupe (cache clôturé + semaine en cours sans
-- joker) — même règle que la RPC `get_group_streak`, mais pour un user donné.
CREATE OR REPLACE FUNCTION public.live_streak_for(p_group_id UUID, p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_week   DATE := date_trunc('week', (now() AT TIME ZONE 'Europe/Paris')::date::timestamp)::date;
  v_target INTEGER;
  v_std    INTEGER;
  v_major  BOOLEAN;
  v_valid  INTEGER;
  v_susp   BOOLEAN;
  v_eff    INTEGER;
  v_base   INTEGER;
BEGIN
  SELECT gm.weekly_target INTO v_target
  FROM public.group_members gm
  WHERE gm.group_id = p_group_id AND gm.user_id = p_user_id AND gm.left_at IS NULL;
  IF v_target IS NULL THEN v_target := 0; END IF;

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

  SELECT COALESCE(mgp.current_streak, 0) INTO v_base
  FROM public.member_group_progress mgp
  WHERE mgp.group_id = p_group_id AND mgp.user_id = p_user_id;
  IF v_base IS NULL THEN v_base := 0; END IF;

  v_eff := GREATEST(0, v_target - v_std);
  IF (NOT v_susp) AND (NOT v_major) AND (v_valid >= v_eff) THEN
    RETURN v_base + 1;
  END IF;
  RETURN v_base;
END;
$$;


-- Débloque un badge (idempotent) et notifie SEULEMENT au premier déblocage.
CREATE OR REPLACE FUNCTION public.grant_badge(
  p_user_id   UUID,
  p_badge_key TEXT,
  p_title     TEXT,
  p_desc      TEXT,
  p_group_id  UUID  DEFAULT NULL,
  p_metadata  JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN  -- true si nouvellement débloqué
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_badges (user_id, badge_key, group_id, metadata)
  VALUES (p_user_id, p_badge_key, p_group_id, COALESCE(p_metadata, '{}'::jsonb))
  ON CONFLICT (user_id, badge_key) DO NOTHING;

  IF NOT FOUND THEN
    RETURN FALSE;  -- déjà acquis : rien à faire
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    p_user_id,
    'badge_unlocked',
    'Nouveau trophée : ' || p_title,
    p_desc,
    jsonb_build_object('badge_key', p_badge_key, 'group_id', p_group_id)
  );
  RETURN TRUE;
END;
$$;


-- Badges de SÉANCES : cumul de séances validées (tous défis).
CREATE OR REPLACE FUNCTION public.award_session_badges(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.sessions s
  WHERE s.user_id = p_user_id AND s.status = 'validated';

  IF v_count >= 1   THEN PERFORM public.grant_badge(p_user_id, 'sessions_1',   'Premiers pas', '1 séance validée'); END IF;
  IF v_count >= 10  THEN PERFORM public.grant_badge(p_user_id, 'sessions_10',  'Habitué',      '10 séances validées'); END IF;
  IF v_count >= 50  THEN PERFORM public.grant_badge(p_user_id, 'sessions_50',  'Machine',      '50 séances validées'); END IF;
  IF v_count >= 100 THEN PERFORM public.grant_badge(p_user_id, 'sessions_100', 'Centurion',    '100 séances validées'); END IF;
END;
$$;


-- Badges de SÉRIE : meilleur record atteint (série live incluse, tous défis).
CREATE OR REPLACE FUNCTION public.award_streak_badges(p_user_id UUID, p_group_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_best INTEGER;
  v_meta JSONB;
BEGIN
  -- Record = max des records clôturés (tous groupes) et de la série live du groupe courant.
  SELECT COALESCE(max(mgp.best_streak), 0) INTO v_best
  FROM public.member_group_progress mgp
  WHERE mgp.user_id = p_user_id;
  v_best := GREATEST(v_best, public.live_streak_for(p_group_id, p_user_id));
  v_meta := jsonb_build_object('streak', v_best, 'group_id', p_group_id);

  IF v_best >= 2  THEN PERFORM public.grant_badge(p_user_id, 'streak_2',  'Première flamme',  '2 semaines de série',  p_group_id, v_meta); END IF;
  IF v_best >= 4  THEN PERFORM public.grant_badge(p_user_id, 'streak_4',  'Régulier',         '4 semaines de série',  p_group_id, v_meta); END IF;
  IF v_best >= 8  THEN PERFORM public.grant_badge(p_user_id, 'streak_8',  'En feu',           '8 semaines de série',  p_group_id, v_meta); END IF;
  IF v_best >= 12 THEN PERFORM public.grant_badge(p_user_id, 'streak_12', 'Inarrêtable',      '12 semaines de série', p_group_id, v_meta); END IF;
  IF v_best >= 26 THEN PERFORM public.grant_badge(p_user_id, 'streak_26', 'Légende',          '26 semaines de série', p_group_id, v_meta); END IF;
  IF v_best >= 52 THEN PERFORM public.grant_badge(p_user_id, 'streak_52', 'Une année de feu', '52 semaines de série', p_group_id, v_meta); END IF;
END;
$$;


-- Point d'entrée : réévalue séances + série pour ce membre / ce groupe.
CREATE OR REPLACE FUNCTION public.award_progress_badges(p_user_id UUID, p_group_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.award_session_badges(p_user_id);
  PERFORM public.award_streak_badges(p_user_id, p_group_id);
END;
$$;


-- Trigger : à chaque séance qui devient `validated`, on réévalue les badges de son auteur.
CREATE OR REPLACE FUNCTION public.trg_award_badges_on_session_validate()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'validated' AND (OLD.status IS DISTINCT FROM 'validated') THEN
    PERFORM public.award_progress_badges(NEW.user_id, NEW.group_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS award_badges_on_validate ON public.sessions;
CREATE TRIGGER award_badges_on_validate
AFTER UPDATE OF status ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.trg_award_badges_on_session_validate();

NOTIFY pgrst, 'reload schema';
