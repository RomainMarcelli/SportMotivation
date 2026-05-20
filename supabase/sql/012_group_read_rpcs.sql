-- ============================================================================
-- Lecture des groupes via RPC SECURITY DEFINER (fin des soucis de RLS SELECT)
-- ============================================================================
-- Au lieu de dépendre des policies SELECT (groups / group_members / users), on
-- expose 3 fonctions SECURITY DEFINER qui vérifient explicitement l'appartenance
-- via auth.uid(). L'app les appelle directement.
-- ============================================================================

-- 1. Mes groupes (adhésion + infos groupe), pour l'accueil
CREATE OR REPLACE FUNCTION public.get_my_groups()
RETURNS TABLE (
  membership_id UUID,
  role member_role,
  weekly_target INTEGER,
  group_id UUID,
  name TEXT,
  description TEXT,
  photo_url TEXT,
  challenge_start DATE,
  challenge_end DATE,
  penalty_amount NUMERIC,
  status group_status,
  max_members INTEGER
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT gm.id, gm.role, gm.weekly_target,
         g.id, g.name, g.description, g.photo_url,
         g.challenge_start, g.challenge_end, g.penalty_amount,
         g.status, g.max_members
  FROM public.group_members gm
  JOIN public.groups g ON g.id = gm.group_id
  WHERE gm.user_id = auth.uid() AND gm.left_at IS NULL
  ORDER BY gm.joined_at DESC;
$$;

-- 2. Détail d'un groupe (si membre ou créateur)
CREATE OR REPLACE FUNCTION public.get_group_dashboard(p_group_id UUID)
RETURNS SETOF public.groups
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT g.*
  FROM public.groups g
  WHERE g.id = p_group_id
    AND (g.created_by = auth.uid() OR public.is_group_member(p_group_id));
$$;

-- 3. Membres d'un groupe avec leur profil (si l'appelant est membre)
CREATE OR REPLACE FUNCTION public.get_group_members(p_group_id UUID)
RETURNS TABLE (
  id UUID,
  role member_role,
  weekly_target INTEGER,
  target_locked BOOLEAN,
  penalty_amount NUMERIC,
  joined_at TIMESTAMPTZ,
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  avatar_url TEXT
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT gm.id, gm.role, gm.weekly_target, gm.target_locked, gm.penalty_amount,
         gm.joined_at, u.id, u.first_name, u.last_name, u.username, u.avatar_url
  FROM public.group_members gm
  JOIN public.users u ON u.id = gm.user_id
  WHERE gm.group_id = p_group_id
    AND gm.left_at IS NULL
    AND public.is_group_member(p_group_id)
  ORDER BY gm.joined_at ASC;
$$;

NOTIFY pgrst, 'reload schema';
