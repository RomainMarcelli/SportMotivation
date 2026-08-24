-- ============================================================================
-- 050 — Sécurité : passer les vues en SECURITY INVOKER
-- ============================================================================
-- Corrige l'alerte du linter Supabase (Advisors → Security) :
--   « Security Definer View » sur `v_member_weekly_status` et `v_member_unsettled_blames`.
--
-- Problème : par défaut, une vue Postgres s'exécute avec les droits de son PROPRIÉTAIRE
-- (postgres, superuser) → elle CONTOURNE la RLS des tables sous-jacentes. Comme ces vues
-- sont dans le schéma `public` (donc exposées via l'API), un membre pourrait lire les
-- blâmes / le statut hebdo de groupes dont il n'est PAS membre (fuite inter-groupes).
--
-- Correctif : `security_invoker = true` (Postgres 15+, ce qui est le cas sur Supabase) →
-- la vue s'exécute avec les droits de L'APPELANT, donc la RLS de l'appelant s'applique.
--
-- Impact vérifié :
--   • `v_member_weekly_status` : lue UNIQUEMENT par la RPC `get_my_profile_stats()` qui est
--     SECURITY DEFINER (rôle courant = postgres) → la vue continue de tout voir. AUCUN impact.
--   • `v_member_unsettled_blames` : lue DIRECTEMENT par le client (dashboard, pastilles
--     « Blâmes »). Après le passage en invoker, la RLS de `blames` s'applique → il faut une
--     policy SELECT « membre du groupe » (voir le filet plus bas si les pastilles disparaissent).
-- ============================================================================

ALTER VIEW public.v_member_weekly_status    SET (security_invoker = true);
ALTER VIEW public.v_member_unsettled_blames SET (security_invoker = true);

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- Vérifications
--   -- 1) Les vues sont bien en invoker (chaque ligne doit contenir security_invoker=true) :
--   SELECT relname, reloptions FROM pg_class
--   WHERE relname IN ('v_member_weekly_status','v_member_unsettled_blames');
--
--   -- 2) Test app : recharge le dashboard d'un défi où un membre a des blâmes.
--   --    → les pastilles « Blâmes » doivent TOUJOURS s'afficher.
--   --    → relance le linter : les 2 alertes doivent avoir disparu.
--
--   -- 3) État RLS de `blames` (pour anticiper le point ci-dessous) :
--   SELECT relrowsecurity FROM pg_class WHERE relname = 'blames';         -- RLS activée ?
--   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'blames';   -- policies existantes
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FILET (à DÉCOMMENTER seulement SI, après ce fichier, les pastilles « Blâmes »
-- du dashboard disparaissent) : cela signifie que `blames` n'autorise pas un membre
-- à lire les blâmes de son groupe sous RLS. On ajoute la policy SELECT correspondante.
-- Idempotent (DROP IF EXISTS + CREATE). L'insertion des blâmes (trigger 048) reste en
-- SECURITY DEFINER, donc non affectée.
-- ----------------------------------------------------------------------------
-- ALTER TABLE public.blames ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS blames_select_group_members ON public.blames;
-- CREATE POLICY blames_select_group_members ON public.blames
--   FOR SELECT TO authenticated
--   USING (EXISTS (
--     SELECT 1 FROM public.group_members gm
--     WHERE gm.group_id = blames.group_id
--       AND gm.user_id  = auth.uid()
--       AND gm.left_at IS NULL
--   ));
-- NOTIFY pgrst, 'reload schema';
