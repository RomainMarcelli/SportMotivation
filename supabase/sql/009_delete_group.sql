-- ============================================================================
-- Phase 2.5+ — Suppression d'un groupe par l'admin
-- ============================================================================
-- RPC SECURITY DEFINER : seul un admin du groupe peut le supprimer.
-- La suppression cascade sur les membres, séances, preuves, pénalités, cagnotte,
-- invitations, etc. (via les FK ON DELETE CASCADE du schéma).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_group(p_group_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_group_admin(p_group_id) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  DELETE FROM public.groups WHERE id = p_group_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
