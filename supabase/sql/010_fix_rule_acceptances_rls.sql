-- ============================================================================
-- Correctif — RLS rule_acceptances bloque l'enregistrement de l'acceptation
-- ============================================================================
-- Symptôme : "new row violates row-level security policy for table
-- rule_acceptances" au moment de rejoindre un groupe.
--
-- Cause : pas de politique INSERT/UPDATE permettant à l'utilisateur d'écrire sa
-- propre ligne d'acceptation des règles (le client fait un upsert côté app).
--
-- Fix : politiques PERMISSIVE pour ses propres lignes (user_id = auth.uid()).
-- Les policies permissives se combinent en OR : ça ne casse rien d'existant.
-- Idempotent (DROP POLICY IF EXISTS avant CREATE).
-- ============================================================================

ALTER TABLE public.rule_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rule_acceptances_select_self" ON public.rule_acceptances;
CREATE POLICY "rule_acceptances_select_self" ON public.rule_acceptances
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "rule_acceptances_insert_self" ON public.rule_acceptances;
CREATE POLICY "rule_acceptances_insert_self" ON public.rule_acceptances
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "rule_acceptances_update_self" ON public.rule_acceptances;
CREATE POLICY "rule_acceptances_update_self" ON public.rule_acceptances
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
