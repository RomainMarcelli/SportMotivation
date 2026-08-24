-- ============================================================================
-- Phase 2.5 — Pénalité par membre + nouveaux types de notification
-- ============================================================================
-- - Ajoute group_members.penalty_amount (pénalité personnelle ; NULL = défaut groupe)
-- - Ajoute 2 valeurs à l'enum notification_type (invitation + demande de changement)
-- - Met à jour join_group_by_code pour accepter une pénalité perso (libre)
--
-- ⚠ À exécuter EN PREMIER (avant 004 et 005) car ils utilisent les nouvelles
--   valeurs d'enum, qui doivent être committées avant d'être utilisées.
-- ============================================================================

-- 1. Colonne pénalité par membre
ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS penalty_amount NUMERIC(8,2) CHECK (penalty_amount >= 0);

-- 2. Nouvelles valeurs d'enum pour les notifications in-app
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'group_invitation';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'penalty_change_request';

-- 3. join_group_by_code avec pénalité perso (libre). NULL => défaut du groupe.
CREATE OR REPLACE FUNCTION public.join_group_by_code(
  p_code TEXT,
  p_weekly_target INTEGER,
  p_penalty_amount NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group public.groups%ROWTYPE;
  v_member_count INTEGER;
  v_existing public.group_members%ROWTYPE;
  v_penalty NUMERIC;
BEGIN
  SELECT * INTO v_group FROM public.groups WHERE invite_code = p_code;
  IF NOT FOUND THEN RAISE EXCEPTION 'GROUP_NOT_FOUND'; END IF;
  IF v_group.status NOT IN ('setup', 'active') THEN RAISE EXCEPTION 'GROUP_NOT_JOINABLE'; END IF;
  IF p_weekly_target < 1 OR p_weekly_target > 14 THEN RAISE EXCEPTION 'INVALID_TARGET'; END IF;

  v_penalty := COALESCE(p_penalty_amount, v_group.penalty_amount);
  IF v_penalty < 0 THEN RAISE EXCEPTION 'INVALID_PENALTY'; END IF;

  SELECT * INTO v_existing FROM public.group_members
    WHERE group_id = v_group.id AND user_id = auth.uid();
  IF FOUND AND v_existing.left_at IS NULL THEN RAISE EXCEPTION 'ALREADY_MEMBER'; END IF;

  SELECT COUNT(*) INTO v_member_count FROM public.group_members
    WHERE group_id = v_group.id AND left_at IS NULL;
  IF v_member_count >= v_group.max_members THEN RAISE EXCEPTION 'GROUP_FULL'; END IF;

  IF FOUND THEN
    UPDATE public.group_members
      SET left_at = NULL, role = 'member', weekly_target = p_weekly_target,
          target_locked = TRUE, penalty_amount = v_penalty, joined_at = NOW()
      WHERE id = v_existing.id;
  ELSE
    INSERT INTO public.group_members
      (group_id, user_id, role, weekly_target, target_locked, penalty_amount)
    VALUES (v_group.id, auth.uid(), 'member', p_weekly_target, TRUE, v_penalty);
  END IF;

  RETURN v_group.id;
END;
$$;
