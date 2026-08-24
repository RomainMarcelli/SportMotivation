-- ============================================================================
-- 034 — « X a rejoint le groupe » : prévenir tous les membres
-- ============================================================================
-- À exécuter APRÈS 033_member_left_notifications.sql.
--
-- Symétrique de `notify_member_left` : quand quelqu'un arrive, les autres
-- doivent le savoir — c'est aussi un changement d'effectif, donc de majorité
-- requise pour les votes.
--
-- Le type `member_joined` existe déjà dans l'enum : rien à ALTER ici.
--
-- On couvre les DEUX chemins d'entrée dans un groupe :
--   • `join_group_by_code`  (code d'invitation / QR)
--   • `accept_invitation`   (invitation nominative)
-- ============================================================================

-- 1. Helper ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_member_joined(
  p_group_id UUID,
  p_user_id  UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name       TEXT;
  v_group_name TEXT;
  v_total      INT;
BEGIN
  SELECT COALESCE(NULLIF(first_name, ''), NULLIF(username, ''), 'Un nouveau membre')
    INTO v_name FROM public.users WHERE id = p_user_id;
  SELECT name INTO v_group_name FROM public.groups WHERE id = p_group_id;
  IF v_group_name IS NULL THEN RETURN; END IF;

  SELECT count(*) INTO v_total
  FROM public.group_members
  WHERE group_id = p_group_id AND left_at IS NULL;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT gm.user_id,
         'member_joined',
         'Nouveau membre',
         COALESCE(v_name, 'Un nouveau membre') || ' vient de rejoindre « ' || v_group_name
           || ' ». Vous êtes maintenant ' || v_total
           || CASE WHEN v_total > 1 THEN ' membres.' ELSE ' membre.' END,
         jsonb_build_object('group_id', p_group_id)
  FROM public.group_members gm
  WHERE gm.group_id = p_group_id
    AND gm.left_at IS NULL
    AND gm.user_id <> p_user_id;   -- on ne s'annonce pas à soi-même
END;
$$;

REVOKE ALL ON FUNCTION public.notify_member_joined(UUID, UUID) FROM PUBLIC;

-- 2. Entrée par code d'invitation --------------------------------------------
-- Reprise intégrale de la version 020 (dont le fix `v_is_member`), + la notif.
CREATE OR REPLACE FUNCTION public.join_group_by_code(
  p_code TEXT,
  p_weekly_target INTEGER,
  p_penalty_amount NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group public.groups%ROWTYPE;
  v_member_count INTEGER;
  v_existing public.group_members%ROWTYPE;
  v_is_member BOOLEAN;     -- une adhésion (même passée) existe déjà ?
  v_penalty NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT * INTO v_group FROM public.groups WHERE invite_code = p_code;
  IF NOT FOUND THEN RAISE EXCEPTION 'GROUP_NOT_FOUND'; END IF;
  IF v_group.status NOT IN ('setup', 'active') THEN RAISE EXCEPTION 'GROUP_NOT_JOINABLE'; END IF;
  IF p_weekly_target < 1 OR p_weekly_target > 14 THEN RAISE EXCEPTION 'INVALID_TARGET'; END IF;

  v_penalty := COALESCE(p_penalty_amount, v_group.penalty_amount);
  IF v_penalty < 0 THEN RAISE EXCEPTION 'INVALID_PENALTY'; END IF;

  SELECT * INTO v_existing FROM public.group_members
    WHERE group_id = v_group.id AND user_id = auth.uid();
  v_is_member := FOUND;  -- ⚠ capturé AVANT toute autre requête

  IF v_is_member AND v_existing.left_at IS NULL THEN RAISE EXCEPTION 'ALREADY_MEMBER'; END IF;

  SELECT COUNT(*) INTO v_member_count FROM public.group_members
    WHERE group_id = v_group.id AND left_at IS NULL;
  IF v_member_count >= v_group.max_members THEN RAISE EXCEPTION 'GROUP_FULL'; END IF;

  IF v_is_member THEN
    -- Réintégration d'un membre ayant quitté.
    UPDATE public.group_members
      SET left_at = NULL, role = 'member', weekly_target = p_weekly_target,
          target_locked = TRUE, penalty_amount = v_penalty, joined_at = NOW()
      WHERE id = v_existing.id;
  ELSE
    INSERT INTO public.group_members
      (group_id, user_id, role, weekly_target, target_locked, penalty_amount)
    VALUES (v_group.id, auth.uid(), 'member', p_weekly_target, TRUE, v_penalty);
  END IF;

  -- Après l'insertion : l'effectif annoncé doit inclure l'arrivant.
  PERFORM public.notify_member_joined(v_group.id, auth.uid());

  RETURN v_group.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_group_by_code(TEXT, INTEGER, NUMERIC) TO authenticated;

-- 3. Entrée par invitation nominative ----------------------------------------
-- On enveloppe l'existant : `accept_invitation` a déjà évolué plusieurs fois, on
-- évite de la recopier (et de figer une version périmée).
CREATE OR REPLACE FUNCTION public.notify_join_from_invitation(p_group_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  PERFORM public.notify_member_joined(p_group_id, auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_join_from_invitation(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
