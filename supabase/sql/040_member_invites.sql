-- ============================================================================
-- 040 — Tout membre peut inviter par pseudo (plus seulement l'admin)
-- ============================================================================
-- Décision produit : dans une app de motivation entre amis, empêcher un membre
-- d'inviter un pote par pseudo n'apportait aucun contrôle réel — n'importe quel
-- membre peut déjà faire entrer quelqu'un en lui donnant le code (join_group_by_code
-- ne demande aucune validation). On aligne donc l'invitation par pseudo sur le
-- code : ouverte à tout membre. L'invité doit toujours ACCEPTER.
--
-- Seul changement : `is_group_admin` → `is_group_member`. Le reste (déjà membre,
-- groupe complet, groupe introuvable, notification à l'invité) est identique.
--
-- Restent admin uniquement : la vue d'ensemble des invitations du groupe
-- (`get_group_invitations`) et leur annulation (`cancel_invitation`) — ce sont
-- des actions de gestion, pas d'invitation.
-- ============================================================================

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
  -- Tout membre peut inviter (auparavant : is_group_admin).
  IF NOT public.is_group_member(p_group_id) THEN RAISE EXCEPTION 'NOT_MEMBER'; END IF;

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

  SELECT COALESCE(first_name, username, 'Quelqu''un') INTO v_inviter_name
    FROM public.users WHERE id = auth.uid();

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    p_user_id,
    'group_invitation',
    'Invitation à un groupe',
    v_inviter_name || ' t''invite à rejoindre « ' || v_group.name || ' »',
    jsonb_build_object('group_id', p_group_id, 'invitation_id', v_invitation_id)
  );

  RETURN v_invitation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.invite_user_to_group(UUID, UUID) TO authenticated;
