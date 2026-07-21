-- ============================================================================
-- 026 — Notifier le membre promu administrateur
-- ============================================================================
-- À exécuter après 025_leave_group.sql (idempotent : ré-exécutable sans risque).
--
-- Quand l'admin quitte le groupe, le rôle est transféré au membre actif le plus
-- ancien. Celui-ci doit être PRÉVENU : sans ça il devient admin sans le savoir.
-- On ajoute le type de notification `admin_transferred` et on ré-affirme
-- `leave_group` avec l'insertion de la notification.
--
-- ⚠ Si Supabase refuse le script avec « unsafe use of new value of enum type »,
-- exécute d'abord SEULE la ligne ALTER TYPE ci-dessous, puis relance le reste.
-- (Ici la valeur n'est utilisée que dans un CORPS de fonction, donc résolue à
--  l'exécution : le cas normal passe sans problème.)
-- ============================================================================

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'admin_transferred';

CREATE OR REPLACE FUNCTION public.leave_group(p_group_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me         public.group_members%ROWTYPE;
  v_next_id    UUID;
  v_next_user  UUID;
  v_next_name  TEXT;
  v_group_name TEXT;
  v_leaver     TEXT;
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
    SELECT COALESCE(NULLIF(first_name, ''), NULLIF(username, ''), 'L''ancien admin')
      INTO v_leaver FROM public.users WHERE id = auth.uid();
    SELECT name INTO v_group_name FROM public.groups WHERE id = p_group_id;

    -- Notification au promu.
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_next_user,
      'admin_transferred',
      'Tu es le nouvel admin',
      v_leaver || ' a quitté « ' || v_group_name ||
        ' » : tu deviens administrateur du groupe. Tu peux modifier les règles et inviter des membres.',
      jsonb_build_object('group_id', p_group_id)
    );
  END IF;

  UPDATE public.group_members
    SET left_at = now(), role = 'member'
    WHERE id = v_me.id;

  RETURN v_next_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_group(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
