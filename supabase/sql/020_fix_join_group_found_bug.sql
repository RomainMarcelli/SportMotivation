-- ============================================================================
-- 020 — Fix CRITIQUE : join_group_by_code ne crée pas l'adhésion (1ère fois)
-- ============================================================================
-- Bug (fichier 007) : après le `SELECT * INTO v_existing` (recherche d'une
-- adhésion existante), un `SELECT COUNT(*) INTO v_member_count` est exécuté.
-- En PL/pgSQL, `FOUND` reflète la DERNIÈRE requête → après le COUNT, `FOUND`
-- est TOUJOURS vrai (le count renvoie une ligne). Le `IF FOUND THEN UPDATE ...
-- WHERE id = v_existing.id` partait donc toujours sur la branche UPDATE ; pour
-- un nouveau membre, `v_existing.id` est NULL → 0 ligne mise à jour → AUCUNE
-- adhésion créée. La fonction renvoyait quand même l'id du groupe (toast
-- « rejoint » trompeur), d'où : « aucun groupe » dans la liste et détail en erreur.
--
-- Correctif : on mémorise l'existence dans `v_is_member` JUSTE après le SELECT,
-- avant que le COUNT n'écrase `FOUND`. Idempotent.
-- ============================================================================

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

  RETURN v_group.id;
END;
$$;

NOTIFY pgrst, 'reload schema';
