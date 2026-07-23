-- ============================================================================
-- 041 — Annuler une invitation retire aussi la notification de l'invité
-- ============================================================================
-- Bug : annuler une invitation supprimait la ligne `group_invitations`, mais la
-- **notification** reçue par l'invité (« X t'invite à rejoindre … ») restait dans
-- sa boîte. Il pouvait donc encore la voir — et, en tapant dessus, tomber sur un
-- écran d'invitation qui n'existe plus.
--
-- On supprime les deux d'un même geste. La notification porte l'identifiant de
-- l'invitation dans son payload (`data->>'invitation_id'`), ce qui permet de la
-- retrouver sans ambiguïté.
-- ============================================================================

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

  -- La notification d'abord (tant que la ligne existe encore, au cas où on
  -- voudrait plus tard s'appuyer dessus) : on cible celle qui référence CETTE
  -- invitation. Une invitation déjà acceptée/refusée n'en supprime aucune.
  DELETE FROM public.notifications
  WHERE type = 'group_invitation'
    AND data ->> 'invitation_id' = p_invitation_id::text;

  DELETE FROM public.group_invitations
  WHERE id = p_invitation_id AND status = 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_invitation(UUID) TO authenticated;
