-- =============================================================================
-- 037 — Effectif des défis, suppression annoncée, pénalité de l'admin,
--       publication sélective d'une séance
--
-- Prérequis : 012 (get_my_groups), 009 (delete_group), 033 (member_left),
--             036 (publish_session_to_my_groups).
--
-- 1. `get_my_groups()` v2      : + `member_count`
-- 2. `delete_group()` v2       : prévient les membres AVANT d'effacer
-- 3. `set_my_penalty()`        : l'admin change SA pénalité sans se l'auto-proposer
-- 4. `publish_session_to_my_groups()` v2 : liste de défis choisie
-- =============================================================================

-- 1. Effectif du défi ---------------------------------------------------------
-- La carte d'un défi affichait « max 12 » : la capacité, pas l'effectif. Un
-- décompte par carte côté client aurait multiplié les requêtes ; c'est une
-- jointure ici.
DROP FUNCTION IF EXISTS public.get_my_groups();
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
  max_members INTEGER,
  member_count INTEGER
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT gm.id, gm.role, gm.weekly_target,
         g.id, g.name, g.description, g.photo_url,
         g.challenge_start, g.challenge_end, g.penalty_amount,
         g.status, g.max_members,
         (SELECT count(*)::int
            FROM public.group_members m
           WHERE m.group_id = g.id AND m.left_at IS NULL) AS member_count
  FROM public.group_members gm
  JOIN public.groups g ON g.id = gm.group_id
  WHERE gm.user_id = auth.uid() AND gm.left_at IS NULL
  ORDER BY gm.joined_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_groups() TO authenticated;

-- 2. Suppression d'un défi : prévenir avant d'effacer -------------------------
-- Les notifications sont liées à l'utilisateur, pas au groupe : elles survivent
-- à la suppression. Mais il faut les écrire AVANT le DELETE, tant qu'on sait
-- encore qui étaient les membres.
CREATE OR REPLACE FUNCTION public.delete_group(p_group_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_group public.groups%ROWTYPE;
  v_admin TEXT;
BEGIN
  IF NOT public.is_group_admin(p_group_id) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'GROUP_NOT_FOUND'; END IF;

  SELECT COALESCE(NULLIF(first_name, ''), NULLIF(username, ''), 'L''admin')
    INTO v_admin FROM public.users WHERE id = v_uid;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT gm.user_id,
         'member_left',
         'Défi supprimé',
         v_admin || ' a supprimé le défi « ' || v_group.name ||
         ' ». Tes séances et ton historique de ce défi n''existent plus.',
         jsonb_build_object('group_name', v_group.name)
  FROM public.group_members gm
  WHERE gm.group_id = p_group_id
    AND gm.left_at IS NULL
    AND gm.user_id <> v_uid;

  DELETE FROM public.groups WHERE id = p_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_group(UUID) TO authenticated;

-- 3. L'admin fixe SA propre pénalité -----------------------------------------
-- `propose_penalty_change` envoie une notification au membre concerné et attend
-- son accord. Appliqué à l'admin lui-même, ça revenait à se demander à soi-même
-- l'autorisation — et à s'envoyer une notification. Ici c'est direct.
CREATE OR REPLACE FUNCTION public.set_my_penalty(
  p_group_id UUID,
  p_amount   NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_id  UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF p_amount IS NULL OR p_amount < 0 OR p_amount > 1000 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  -- Réservé à l'admin : un membre ne choisit pas sa propre sanction.
  IF NOT public.is_group_admin(p_group_id) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  UPDATE public.group_members
     SET penalty_amount = p_amount
   WHERE group_id = p_group_id
     AND user_id = v_uid
     AND left_at IS NULL
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN RAISE EXCEPTION 'NOT_MEMBER'; END IF;

  RETURN p_amount;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_my_penalty(UUID, NUMERIC) TO authenticated;

-- 4. Publication sélective d'une séance ---------------------------------------
-- `p_group_ids` NULL = tous mes défis en cours (comportement de 036).
DROP FUNCTION IF EXISTS public.publish_session_to_my_groups(UUID);
DROP FUNCTION IF EXISTS public.publish_session_to_my_groups(UUID, UUID[]);
CREATE OR REPLACE FUNCTION public.publish_session_to_my_groups(
  p_session_id UUID,
  p_group_ids  UUID[] DEFAULT NULL
)
RETURNS TABLE (group_id UUID, group_name TEXT, session_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_src    public.sessions%ROWTYPE;
  v_new_id UUID;
  v_group  RECORD;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT * INTO v_src FROM public.sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'SESSION_NOT_FOUND'; END IF;
  IF v_src.user_id <> v_uid THEN RAISE EXCEPTION 'NOT_AUTHOR'; END IF;

  FOR v_group IN
    SELECT g.id, g.name
    FROM public.group_members gm
    JOIN public.groups g ON g.id = gm.group_id
    WHERE gm.user_id = v_uid
      AND gm.left_at IS NULL
      AND g.status IN ('setup', 'active')
      AND g.id <> v_src.group_id
      -- Sélection explicite du joueur, le cas échéant.
      AND (p_group_ids IS NULL OR g.id = ANY (p_group_ids))
      AND NOT EXISTS (
        SELECT 1 FROM public.sessions s2
        WHERE s2.shared_id = v_src.shared_id AND s2.group_id = g.id
      )
  LOOP
    INSERT INTO public.sessions
      (group_id, user_id, activity_type, duration_min, comment,
       performed_at, week_start, status, shared_id, published_at)
    VALUES
      (v_group.id, v_uid, v_src.activity_type, v_src.duration_min, v_src.comment,
       v_src.performed_at, v_src.week_start, 'pending_vote', v_src.shared_id, v_src.published_at)
    RETURNING id INTO v_new_id;

    INSERT INTO public.session_proofs
      (session_id, proof_type, media_url, external_url, latitude, longitude, captured_at, strava_data)
    SELECT v_new_id, sp.proof_type, sp.media_url, sp.external_url,
           sp.latitude, sp.longitude, sp.captured_at, sp.strava_data
    FROM public.session_proofs sp
    WHERE sp.session_id = p_session_id;
  END LOOP;

  RETURN QUERY
    SELECT s.group_id, g.name, s.id
    FROM public.sessions s
    JOIN public.groups g ON g.id = s.group_id
    WHERE s.shared_id = v_src.shared_id
    ORDER BY g.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_session_to_my_groups(UUID, UUID[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
