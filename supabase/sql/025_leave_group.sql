-- ============================================================================
-- 025 — Quitter un groupe (avec transfert automatique du rôle admin)
-- ============================================================================
-- Règles validées :
-- - Un membre actif peut quitter à tout moment (left_at = now(), historique conservé).
-- - Si c'est l'ADMIN qui part et qu'il reste d'autres membres actifs → le rôle admin
--   est transféré automatiquement au membre actif le plus ancien (joined_at min).
-- - S'il est le DERNIER membre → refus (LAST_MEMBER) : il doit supprimer le groupe.
-- Renvoie le prénom/pseudo du nouvel admin (NULL si pas de transfert) pour le toast.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.leave_group(p_group_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me        public.group_members%ROWTYPE;
  v_next_id   UUID;
  v_next_user UUID;
  v_next_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT * INTO v_me FROM public.group_members
    WHERE group_id = p_group_id AND user_id = auth.uid() AND left_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_MEMBER'; END IF;

  IF v_me.role = 'admin' THEN
    -- Membre actif le plus ancien (hors moi) → nouvel admin.
    SELECT gm.id, gm.user_id INTO v_next_id, v_next_user
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id AND gm.left_at IS NULL AND gm.user_id <> auth.uid()
    ORDER BY gm.joined_at ASC
    LIMIT 1;

    IF v_next_id IS NULL THEN RAISE EXCEPTION 'LAST_MEMBER'; END IF;

    UPDATE public.group_members SET role = 'admin' WHERE id = v_next_id;
    SELECT COALESCE(NULLIF(first_name, ''), NULLIF(username, ''), 'Un membre')
      INTO v_next_name FROM public.users WHERE id = v_next_user;
  END IF;

  UPDATE public.group_members
    SET left_at = now(), role = 'member'
    WHERE id = v_me.id;

  RETURN v_next_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_group(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
