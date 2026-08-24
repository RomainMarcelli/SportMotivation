-- ============================================================================
-- RPC : Rejoindre un groupe par code d'invitation
-- ============================================================================
-- La policy groups_select_member empêche un non-membre de lire un groupe.
-- Ces 2 fonctions SECURITY DEFINER permettent :
--   1. d'afficher le récap des règles avant de rejoindre (preview)
--   2. de rejoindre avec validation atomique (code, statut, capacité, doublon)
-- ============================================================================

-- 1. Preview d'un groupe via son code (écran de récap avant de rejoindre)
CREATE OR REPLACE FUNCTION public.get_group_preview_by_code(p_code TEXT)
RETURNS TABLE (
  id UUID, name TEXT, description TEXT, photo_url TEXT,
  challenge_start DATE, challenge_end DATE, penalty_amount NUMERIC,
  accepted_activities JSONB, min_duration_min INTEGER,
  publication_deadline deadline_type, vote_deadline deadline_type,
  blame_threshold INTEGER, max_excuses INTEGER, max_members INTEGER,
  status group_status, member_count BIGINT
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT g.id, g.name, g.description, g.photo_url,
         g.challenge_start, g.challenge_end, g.penalty_amount,
         g.accepted_activities, g.min_duration_min,
         g.publication_deadline, g.vote_deadline,
         g.blame_threshold, g.max_excuses, g.max_members, g.status,
         (SELECT COUNT(*) FROM public.group_members gm
          WHERE gm.group_id = g.id AND gm.left_at IS NULL) AS member_count
  FROM public.groups g
  WHERE g.invite_code = p_code;
$$;

-- 2. Rejoindre un groupe via son code (validation + capacité + insertion atomique)
CREATE OR REPLACE FUNCTION public.join_group_by_code(p_code TEXT, p_weekly_target INTEGER)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group public.groups%ROWTYPE;
  v_member_count INTEGER;
  v_existing public.group_members%ROWTYPE;
BEGIN
  SELECT * INTO v_group FROM public.groups WHERE invite_code = p_code;
  IF NOT FOUND THEN RAISE EXCEPTION 'GROUP_NOT_FOUND'; END IF;

  IF v_group.status NOT IN ('setup', 'active') THEN
    RAISE EXCEPTION 'GROUP_NOT_JOINABLE';
  END IF;

  IF p_weekly_target < 1 OR p_weekly_target > 14 THEN
    RAISE EXCEPTION 'INVALID_TARGET';
  END IF;

  -- Ligne existante (membre actif ou ancien membre parti) ?
  SELECT * INTO v_existing FROM public.group_members
    WHERE group_id = v_group.id AND user_id = auth.uid();

  IF FOUND AND v_existing.left_at IS NULL THEN
    RAISE EXCEPTION 'ALREADY_MEMBER';
  END IF;

  -- Capacité (membres actifs uniquement)
  SELECT COUNT(*) INTO v_member_count FROM public.group_members
    WHERE group_id = v_group.id AND left_at IS NULL;
  IF v_member_count >= v_group.max_members THEN
    RAISE EXCEPTION 'GROUP_FULL';
  END IF;

  IF FOUND THEN
    -- Réintégration d'un ancien membre (UNIQUE(group_id,user_id) interdit un 2e INSERT)
    UPDATE public.group_members
      SET left_at = NULL, role = 'member',
          weekly_target = p_weekly_target, target_locked = TRUE,
          joined_at = NOW()
      WHERE id = v_existing.id;
  ELSE
    INSERT INTO public.group_members (group_id, user_id, role, weekly_target, target_locked)
    VALUES (v_group.id, auth.uid(), 'member', p_weekly_target, TRUE);
  END IF;

  RETURN v_group.id;
END;
$$;
