-- ============================================================================
-- Phase 2.5 — Invitations par pseudo + recherche d'utilisateurs
-- ============================================================================
-- ⚠ Exécuter APRÈS 003 (utilise l'enum 'group_invitation').
-- ============================================================================

-- 1. Table des invitations
CREATE TABLE IF NOT EXISTS public.group_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'refused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  UNIQUE (group_id, invited_user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_invitations_invitee
  ON public.group_invitations(invited_user_id) WHERE status = 'pending';

ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;

-- L'invité voit ses invitations ; les membres voient celles de leur groupe
CREATE POLICY "invitations_select" ON public.group_invitations
  FOR SELECT USING (
    invited_user_id = auth.uid() OR public.is_group_member(group_id)
  );

-- L'invité peut répondre (accept/refuse) à sa propre invitation
CREATE POLICY "invitations_update_invitee" ON public.group_invitations
  FOR UPDATE USING (invited_user_id = auth.uid());

-- 2. Recherche d'utilisateurs par pseudo (exclut soi-même). Contourne la RLS users.
CREATE OR REPLACE FUNCTION public.search_users_by_username(p_query TEXT)
RETURNS TABLE (id UUID, username TEXT, first_name TEXT, last_name TEXT, avatar_url TEXT)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT id, username, first_name, last_name, avatar_url
  FROM public.users
  WHERE p_query <> ''
    AND username ILIKE '%' || p_query || '%'
    AND id <> auth.uid()
  ORDER BY username
  LIMIT 20;
$$;

-- 3. Inviter un utilisateur (admin uniquement) : crée l'invitation + notification in-app
CREATE OR REPLACE FUNCTION public.invite_user_to_group(p_group_id UUID, p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group public.groups%ROWTYPE;
  v_inviter_name TEXT;
  v_invitation_id UUID;
BEGIN
  IF NOT public.is_group_admin(p_group_id) THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;

  SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'GROUP_NOT_FOUND'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = p_user_id AND left_at IS NULL
  ) THEN
    RAISE EXCEPTION 'ALREADY_MEMBER';
  END IF;

  INSERT INTO public.group_invitations (group_id, invited_user_id, invited_by, status)
  VALUES (p_group_id, p_user_id, auth.uid(), 'pending')
  ON CONFLICT (group_id, invited_user_id)
  DO UPDATE SET status = 'pending', invited_by = auth.uid(), created_at = NOW(), resolved_at = NULL
  RETURNING id INTO v_invitation_id;

  SELECT first_name INTO v_inviter_name FROM public.users WHERE id = auth.uid();

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    p_user_id,
    'group_invitation',
    'Invitation à un groupe',
    COALESCE(v_inviter_name, 'Quelqu''un') || ' t''invite à rejoindre « ' || v_group.name || ' »',
    jsonb_build_object('group_id', p_group_id, 'invitation_id', v_invitation_id)
  );

  RETURN v_invitation_id;
END;
$$;

-- 4. Aperçu d'un groupe via son id (pour l'écran d'acceptation d'invitation)
CREATE OR REPLACE FUNCTION public.get_group_preview_by_id(p_group_id UUID)
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
  WHERE g.id = p_group_id
    AND (
      public.is_group_member(g.id)
      OR EXISTS (
        SELECT 1 FROM public.group_invitations gi
        WHERE gi.group_id = g.id AND gi.invited_user_id = auth.uid() AND gi.status = 'pending'
      )
    );
$$;

-- 5. Accepter une invitation : rejoint le groupe (objectif + pénalité) + marque acceptée
CREATE OR REPLACE FUNCTION public.accept_invitation(
  p_invitation_id UUID,
  p_weekly_target INTEGER,
  p_penalty_amount NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.group_invitations%ROWTYPE;
  v_group public.groups%ROWTYPE;
  v_member_count INTEGER;
  v_existing public.group_members%ROWTYPE;
  v_penalty NUMERIC;
BEGIN
  SELECT * INTO v_inv FROM public.group_invitations WHERE id = p_invitation_id;
  IF NOT FOUND OR v_inv.invited_user_id <> auth.uid() THEN RAISE EXCEPTION 'INVITATION_NOT_FOUND'; END IF;
  IF v_inv.status <> 'pending' THEN RAISE EXCEPTION 'INVITATION_RESOLVED'; END IF;

  SELECT * INTO v_group FROM public.groups WHERE id = v_inv.group_id;
  IF v_group.status NOT IN ('setup', 'active') THEN RAISE EXCEPTION 'GROUP_NOT_JOINABLE'; END IF;
  IF p_weekly_target < 1 OR p_weekly_target > 14 THEN RAISE EXCEPTION 'INVALID_TARGET'; END IF;

  v_penalty := COALESCE(p_penalty_amount, v_group.penalty_amount);

  SELECT * INTO v_existing FROM public.group_members
    WHERE group_id = v_group.id AND user_id = auth.uid();
  IF FOUND AND v_existing.left_at IS NULL THEN
    UPDATE public.group_invitations SET status = 'accepted', resolved_at = NOW() WHERE id = p_invitation_id;
    RETURN v_group.id;
  END IF;

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

  UPDATE public.group_invitations SET status = 'accepted', resolved_at = NOW() WHERE id = p_invitation_id;
  RETURN v_group.id;
END;
$$;
