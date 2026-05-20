-- ============================================================================
-- Correctif — un membre qui REJOINT ne peut pas lire son groupe (RLS SELECT)
-- ============================================================================
-- Symptôme : après avoir rejoint, "Impossible de charger le groupe" et l'accueil
-- n'affiche aucun groupe (alors que l'adhésion a bien été créée).
--
-- Cause : la policy SELECT sur `groups` laisse lire le créateur mais pas les
-- membres → l'embed groups(*) revient NULL → la ligne est filtrée côté app.
--
-- Fix : helper is_group_member en SECURITY DEFINER (évite toute récursion RLS)
-- + policies SELECT permissives sur `groups` et `group_members`. Permissif = OR,
-- donc ça ne casse rien d'existant. Idempotent.
-- ============================================================================

-- 1. Helper fiable (SECURITY DEFINER → ne déclenche pas la RLS de group_members)
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id = auth.uid()
      AND left_at IS NULL
  );
$$;

-- 2. Lecture du groupe : créateur OU membre
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "groups_select_member_or_creator" ON public.groups;
CREATE POLICY "groups_select_member_or_creator" ON public.groups
  FOR SELECT USING (
    created_by = auth.uid() OR public.is_group_member(id)
  );

-- 3. Lecture de ses adhésions : ses propres lignes OU celles de ses groupes
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "group_members_select_self_or_group" ON public.group_members;
CREATE POLICY "group_members_select_self_or_group" ON public.group_members
  FOR SELECT USING (
    user_id = auth.uid() OR public.is_group_member(group_id)
  );

NOTIFY pgrst, 'reload schema';
