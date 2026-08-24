-- ============================================================================
-- 019 — Fix : accès au détail d'un groupe REJOINT (pas seulement créé)
-- ============================================================================
-- Symptôme : juste après avoir rejoint un groupe, le détail affiche
-- « Groupe introuvable ou tu n'y as pas accès ». Les groupes qu'on a CRÉÉS
-- s'ouvrent, mais pas ceux qu'on REJOINT → la branche « membre » de
-- get_group_dashboard ne reconnaît pas l'adhésion (helper is_group_member
-- obsolète/non déployé, ou ancienne version de la RPC ne testant que created_by).
--
-- Correctif : on ré-affirme is_group_member ET on inline la vérif d'appartenance
-- directement dans get_group_dashboard (plus de dépendance au helper). Idempotent.
-- ============================================================================

-- 1. Helper d'appartenance (ré-affirmé, version correcte)
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

-- 2. Détail d'un groupe : créateur OU membre actif (appartenance testée en dur)
CREATE OR REPLACE FUNCTION public.get_group_dashboard(p_group_id UUID)
RETURNS SETOF public.groups
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT g.*
  FROM public.groups g
  WHERE g.id = p_group_id
    AND (
      g.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.group_members gm
        WHERE gm.group_id = g.id
          AND gm.user_id = auth.uid()
          AND gm.left_at IS NULL
      )
    );
$$;

-- 3. Force PostgREST à recharger son cache de schéma
NOTIFY pgrst, 'reload schema';
