-- ============================================================================
-- Phase 2.5 — Demandes de changement de pénalité (admin → membre, à valider)
-- ============================================================================
-- ⚠ Exécuter APRÈS 003 (utilise l'enum 'penalty_change_request').
-- Quand l'admin change la pénalité d'un membre, une demande est créée et le
-- membre reçoit une notification. Il valide (applique) ou refuse (conserve l'ancienne).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.member_penalty_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  group_member_id UUID NOT NULL REFERENCES public.group_members(id) ON DELETE CASCADE,
  old_amount NUMERIC(8,2),
  new_amount NUMERIC(8,2) NOT NULL CHECK (new_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'refused')),
  requested_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_penalty_changes_member
  ON public.member_penalty_changes(group_member_id) WHERE status = 'pending';

ALTER TABLE public.member_penalty_changes ENABLE ROW LEVEL SECURITY;

-- Visible par les membres du groupe (l'admin et le membre concerné)
CREATE POLICY "penalty_changes_select" ON public.member_penalty_changes
  FOR SELECT USING (public.is_group_member(group_id));

-- Admin propose un changement de pénalité pour un membre
CREATE OR REPLACE FUNCTION public.propose_penalty_change(
  p_group_member_id UUID,
  p_new_amount NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.group_members%ROWTYPE;
  v_group public.groups%ROWTYPE;
  v_change_id UUID;
  v_current NUMERIC;
BEGIN
  SELECT * INTO v_member FROM public.group_members WHERE id = p_group_member_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'MEMBER_NOT_FOUND'; END IF;
  IF NOT public.is_group_admin(v_member.group_id) THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;
  IF p_new_amount < 0 THEN RAISE EXCEPTION 'INVALID_PENALTY'; END IF;

  SELECT * INTO v_group FROM public.groups WHERE id = v_member.group_id;
  v_current := COALESCE(v_member.penalty_amount, v_group.penalty_amount);

  -- Annule toute demande pending précédente pour ce membre
  UPDATE public.member_penalty_changes
    SET status = 'refused', resolved_at = NOW()
    WHERE group_member_id = p_group_member_id AND status = 'pending';

  INSERT INTO public.member_penalty_changes
    (group_id, group_member_id, old_amount, new_amount, requested_by)
  VALUES (v_member.group_id, p_group_member_id, v_current, p_new_amount, auth.uid())
  RETURNING id INTO v_change_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_member.user_id,
    'penalty_change_request',
    'Changement de pénalité proposé',
    'L''admin propose de passer ta pénalité de ' || v_current || ' € à ' || p_new_amount ||
      ' € dans « ' || v_group.name || ' ».',
    jsonb_build_object('group_id', v_member.group_id, 'change_id', v_change_id,
                       'old_amount', v_current, 'new_amount', p_new_amount)
  );

  RETURN v_change_id;
END;
$$;

-- Le membre concerné valide ou refuse la demande
CREATE OR REPLACE FUNCTION public.respond_penalty_change(
  p_change_id UUID,
  p_accept BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_change public.member_penalty_changes%ROWTYPE;
  v_member public.group_members%ROWTYPE;
BEGIN
  SELECT * INTO v_change FROM public.member_penalty_changes WHERE id = p_change_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'CHANGE_NOT_FOUND'; END IF;
  IF v_change.status <> 'pending' THEN RAISE EXCEPTION 'CHANGE_RESOLVED'; END IF;

  SELECT * INTO v_member FROM public.group_members WHERE id = v_change.group_member_id;
  IF v_member.user_id <> auth.uid() THEN RAISE EXCEPTION 'NOT_YOUR_CHANGE'; END IF;

  IF p_accept THEN
    UPDATE public.group_members SET penalty_amount = v_change.new_amount
      WHERE id = v_change.group_member_id;
    UPDATE public.member_penalty_changes SET status = 'accepted', resolved_at = NOW()
      WHERE id = p_change_id;
  ELSE
    UPDATE public.member_penalty_changes SET status = 'refused', resolved_at = NOW()
      WHERE id = p_change_id;
  END IF;
END;
$$;
