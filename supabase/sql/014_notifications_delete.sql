-- ============================================================================
-- Ajout — Suppression des notifications par leur destinataire
-- ============================================================================
-- Les notifications ne sont pas des données critiques : on autorise un HARD DELETE
-- de ses propres notifications (suppression individuelle + "tout effacer").
-- ============================================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE USING (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
