-- ============================================================================
-- 066 — Badges de DÉFI, attribués en fin de défi (Phase 4b)
-- ============================================================================
-- À exécuter APRÈS 065 (grant_badge) et 049 (unlock_pot / complete_expired_challenges).
-- Idempotent. Attribue les 4 badges de défi quand un défi est TERMINÉ, une seule
-- fois par défi (garde `groups.badges_finalized_at`) :
--   • challenge_first    → a terminé un défi (≥ 1 semaine réussie).
--   • challenge_perfect  → 0 semaine 'fail' sur le défi (100 % des objectifs).
--   • challenge_flawless → 0 pénalité (missed_session ET blame) sur le défi.
--   • challenge_champion → 1er au classement final (rate desc, validées desc).
--
-- Le classement est calculé CÔTÉ SERVEUR ici (le `finalRanking` client de
-- features/challenge-end/report.ts reste pour l'affichage — même critère : taux
-- d'assiduité vs objectif de chacun, puis nb de validées). `grant_badge` (065) est
-- idempotent et notifie une seule fois → réexécution sans risque.
--
-- Ancrages : `complete_expired_challenges` (cron quotidien) et `unlock_pot` (action
-- admin) appellent `finalize_challenge_badges` — l'un ou l'autre selon ce qui arrive
-- en premier ; le garde empêche tout double.
-- ============================================================================

-- Garde : un défi n'attribue ses badges qu'une fois.
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS badges_finalized_at TIMESTAMPTZ;

-- Vainqueur(s) d'un défi — permet de compter les « défis remportés » d'un membre
-- sans recalculer le classement (le badge Champion, lui, est unique/global).
CREATE TABLE IF NOT EXISTS public.challenge_champions (
  group_id   UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
  rate       INTEGER,
  validated  INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)  -- co-vainqueurs possibles (égalité)
);
ALTER TABLE public.challenge_champions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS challenge_champions_select ON public.challenge_champions;
CREATE POLICY challenge_champions_select ON public.challenge_champions
  FOR SELECT USING (public.is_group_member(group_id));


CREATE OR REPLACE FUNCTION public.finalize_challenge_badges(p_group_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_start   DATE;
  v_end     DATE;
  v_done    TIMESTAMPTZ;
  v_name    TEXT;
  v_first_monday DATE;
  v_weeks   INTEGER;
  v_meta    JSONB;
  r         RECORD;
  v_fail    BOOLEAN;
  v_success BOOLEAN;
  v_pen     BOOLEAN;
BEGIN
  SELECT g.challenge_start, g.challenge_end, g.badges_finalized_at, g.name
    INTO v_start, v_end, v_done, v_name
  FROM public.groups g WHERE g.id = p_group_id;

  IF NOT FOUND THEN RETURN; END IF;
  IF v_done IS NOT NULL THEN RETURN; END IF;  -- déjà finalisé

  v_first_monday := date_trunc('week', v_start::timestamp)::date;
  -- Nombre de semaines (lundis) couvertes par le défi — dénominateur du taux.
  v_weeks := GREATEST(1, (floor((v_end - v_first_monday) / 7.0) + 1)::int);
  v_meta := jsonb_build_object('group_id', p_group_id, 'group_name', v_name);

  -- Un passage par membre actif, avec son rang (champion = meilleur couple rate/validées).
  FOR r IN
    WITH m AS (
      SELECT gm.user_id, gm.weekly_target,
             (SELECT count(*) FROM public.sessions s
               WHERE s.group_id = p_group_id AND s.user_id = gm.user_id AND s.status = 'validated')::int AS validated
      FROM public.group_members gm
      WHERE gm.group_id = p_group_id AND gm.left_at IS NULL
    ),
    rated AS (
      SELECT user_id, validated,
             CASE WHEN weekly_target * v_weeks > 0
                  THEN LEAST(100, round(100.0 * validated / (weekly_target * v_weeks)))
                  ELSE 0 END AS rate
      FROM m
    ),
    top AS (SELECT rate, validated FROM rated ORDER BY rate DESC, validated DESC LIMIT 1)
    SELECT rated.user_id, rated.validated, rated.rate,
           (rated.rate = top.rate AND rated.validated = top.validated) AS is_champion
    FROM rated, top
  LOOP
    -- Une semaine 'fail' sur le défi ? une semaine 'success' ? une pénalité ?
    SELECT EXISTS (SELECT 1 FROM public.member_weekly_outcomes o
                    WHERE o.group_id = p_group_id AND o.user_id = r.user_id AND o.status = 'fail')
      INTO v_fail;
    SELECT EXISTS (SELECT 1 FROM public.member_weekly_outcomes o
                    WHERE o.group_id = p_group_id AND o.user_id = r.user_id AND o.status = 'success')
      INTO v_success;
    SELECT EXISTS (SELECT 1 FROM public.penalties p
                    WHERE p.group_id = p_group_id AND p.user_id = r.user_id)
      INTO v_pen;

    -- A « terminé » le défi de façon significative → premier défi.
    IF v_success THEN
      PERFORM public.grant_badge(r.user_id, 'challenge_first', 'Premier défi',
        'Terminer un premier défi', p_group_id, v_meta);
    END IF;

    -- 100 % des objectifs (aucune semaine ratée) + a réellement participé.
    IF v_success AND NOT v_fail THEN
      PERFORM public.grant_badge(r.user_id, 'challenge_perfect', 'Défi parfait',
        '100 % des objectifs hebdo atteints sur un défi', p_group_id, v_meta);
    END IF;

    -- Aucune pénalité de tout le défi.
    IF v_success AND NOT v_pen THEN
      PERFORM public.grant_badge(r.user_id, 'challenge_flawless', 'Intouchable',
        'Terminer un défi sans aucune pénalité', p_group_id, v_meta);
    END IF;

    -- Premier au classement final (validées > 0 pour éviter un « champion » à 0).
    IF r.is_champion AND r.validated > 0 THEN
      PERFORM public.grant_badge(r.user_id, 'challenge_champion', 'Champion',
        'Terminer premier au classement d''un défi', p_group_id,
        v_meta || jsonb_build_object('rate', r.rate, 'validated', r.validated));
      -- Trace du/des vainqueur(s) pour compter les « défis remportés ».
      INSERT INTO public.challenge_champions (group_id, user_id, rate, validated)
      VALUES (p_group_id, r.user_id, r.rate, r.validated)
      ON CONFLICT (group_id, user_id) DO NOTHING;
    END IF;
  END LOOP;

  UPDATE public.groups SET badges_finalized_at = now() WHERE id = p_group_id;
END;
$$;


-- Complétion auto des défis échus → + attribution des badges de défi. -----------
-- (Reprend 049 en bouclant sur les défis nouvellement terminés pour les finaliser.)
CREATE OR REPLACE FUNCTION public.complete_expired_challenges()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_count INTEGER := 0;
  r       RECORD;
BEGIN
  FOR r IN
    SELECT id FROM public.groups
    WHERE status = 'active' AND challenge_end < v_today
  LOOP
    UPDATE public.groups SET status = 'completed' WHERE id = r.id;
    PERFORM public.finalize_challenge_badges(r.id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;


-- Déblocage cagnotte → finalise aussi les badges de défi (si pas déjà fait). -----
-- (Reprend 049 à l'identique, + l'appel à finalize_challenge_badges avant de rendre.)
CREATE OR REPLACE FUNCTION public.unlock_pot(p_group_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid      UUID := auth.uid();
  v_role     TEXT;
  v_end      DATE;
  v_status   TEXT;
  v_today    DATE := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_pot_id   UUID;
  v_unlocked TIMESTAMPTZ;
BEGIN
  SELECT gm.role INTO v_role
  FROM public.group_members gm
  WHERE gm.group_id = p_group_id AND gm.user_id = v_uid AND gm.left_at IS NULL;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_MEMBER'; END IF;
  IF v_role NOT IN ('admin', 'treasurer') THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;

  SELECT g.challenge_end, g.status INTO v_end, v_status
  FROM public.groups g WHERE g.id = p_group_id;

  IF NOT (v_end <= v_today OR v_status IN ('completed', 'cancelled')) THEN
    RAISE EXCEPTION 'CHALLENGE_NOT_ENDED';
  END IF;

  IF v_status = 'active' AND v_end <= v_today THEN
    UPDATE public.groups SET status = 'completed' WHERE id = p_group_id;
  END IF;

  -- Le défi est terminé → on finalise ses badges (idempotent, garde interne).
  PERFORM public.finalize_challenge_badges(p_group_id);

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

GRANT EXECUTE ON FUNCTION public.unlock_pot(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
