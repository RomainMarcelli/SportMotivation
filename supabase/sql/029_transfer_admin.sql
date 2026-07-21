-- ============================================================================
-- 029 — Transférer le rôle d'admin à un autre membre
-- ============================================================================
-- À exécuter après 026 (qui crée le type de notification `admin_transferred`).
--
-- L'admin choisit explicitement son successeur depuis le menu ⋮ du groupe.
-- L'ancien admin redevient membre simple et RESTE dans le groupe (contrairement
-- à `leave_group`, qui promeut automatiquement et fait partir l'admin).
-- Le nouvel admin reçoit une notification.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.transfer_admin(
  p_group_id     UUID,
  p_new_admin_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me         public.group_members%ROWTYPE;
  v_target     public.group_members%ROWTYPE;
  v_target_name TEXT;
  v_group_name  TEXT;
  v_me_name     TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  -- Je dois être admin actif de ce groupe.
  SELECT * INTO v_me FROM public.group_members
    WHERE group_id = p_group_id AND user_id = auth.uid() AND left_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_MEMBER'; END IF;
  IF v_me.role <> 'admin' THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;

  IF p_new_admin_id = auth.uid() THEN RAISE EXCEPTION 'ALREADY_ADMIN'; END IF;

  -- La cible doit être un membre actif du groupe.
  SELECT * INTO v_target FROM public.group_members
    WHERE group_id = p_group_id AND user_id = p_new_admin_id AND left_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'TARGET_NOT_MEMBER'; END IF;

  UPDATE public.group_members SET role = 'admin'  WHERE id = v_target.id;
  UPDATE public.group_members SET role = 'member' WHERE id = v_me.id;

  SELECT COALESCE(NULLIF(first_name, ''), NULLIF(username, ''), 'Un membre')
    INTO v_target_name FROM public.users WHERE id = p_new_admin_id;
  SELECT COALESCE(NULLIF(first_name, ''), NULLIF(username, ''), 'L''ancien admin')
    INTO v_me_name FROM public.users WHERE id = auth.uid();
  SELECT name INTO v_group_name FROM public.groups WHERE id = p_group_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    p_new_admin_id,
    'admin_transferred',
    'Tu es le nouvel admin',
    v_me_name || ' t''a confié l''administration de « ' || v_group_name ||
      ' ». Tu peux modifier les règles et inviter des membres.',
    jsonb_build_object('group_id', p_group_id)
  );

  RETURN v_target_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_admin(UUID, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
