-- ============================================================================
-- Ajout — Suivi des invitations côté admin (liste + annulation)
-- ============================================================================
-- RPC SECURITY DEFINER, réservées à l'admin du groupe :
--   - get_group_invitations(p_group_id) : liste les invitations + profil invité
--   - cancel_invitation(p_invitation_id) : annule (supprime) une invitation en attente
-- Le renvoi d'une invitation réutilise invite_user_to_group (fichier 004).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_group_invitations(p_group_id UUID)
RETURNS TABLE (
  id UUID,
  status TEXT,
  created_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  invited_user_id UUID,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT gi.id, gi.status, gi.created_at, gi.resolved_at,
         gi.invited_user_id, u.username, u.first_name, u.last_name, u.avatar_url
  FROM public.group_invitations gi
  JOIN public.users u ON u.id = gi.invited_user_id
  WHERE gi.group_id = p_group_id
    AND public.is_group_admin(p_group_id)
  ORDER BY
    CASE gi.status WHEN 'pending' THEN 0 WHEN 'accepted' THEN 1 ELSE 2 END,
    gi.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.cancel_invitation(p_invitation_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
BEGIN
  SELECT group_id INTO v_group_id FROM public.group_invitations WHERE id = p_invitation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVITATION_NOT_FOUND'; END IF;
  IF NOT public.is_group_admin(v_group_id) THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;

  DELETE FROM public.group_invitations
  WHERE id = p_invitation_id AND status = 'pending';
END;
$$;

NOTIFY pgrst, 'reload schema';
