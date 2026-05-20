-- ============================================================================
-- Correctif — join_group_by_code introuvable dans le schema cache
-- ============================================================================
-- Symptôme : "Could not find the function public.join_group_by_code(p_code,
-- p_penalty_amount, p_weekly_target) in the schema cache" au moment de rejoindre.
--
-- Cause : l'ancienne version à 2 arguments (fichier 002) coexiste avec la nouvelle
-- à 3 arguments (fichier 003), ou le cache PostgREST n'a pas été rechargé.
--
-- Ce script : supprime TOUTES les variantes puis recrée la bonne (3 args), et
-- force le rechargement du cache. Idempotent — exécutable même si 003 a réussi.
-- ============================================================================

-- 1. Supprime les anciennes signatures éventuelles
DROP FUNCTION IF EXISTS public.join_group_by_code(TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.join_group_by_code(TEXT, INTEGER, NUMERIC);

-- 2. Recrée la version définitive (pénalité perso libre ; NULL => défaut du groupe)
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
  v_penalty NUMERIC;
BEGIN
  SELECT * INTO v_group FROM public.groups WHERE invite_code = p_code;
  IF NOT FOUND THEN RAISE EXCEPTION 'GROUP_NOT_FOUND'; END IF;
  IF v_group.status NOT IN ('setup', 'active') THEN RAISE EXCEPTION 'GROUP_NOT_JOINABLE'; END IF;
  IF p_weekly_target < 1 OR p_weekly_target > 14 THEN RAISE EXCEPTION 'INVALID_TARGET'; END IF;

  v_penalty := COALESCE(p_penalty_amount, v_group.penalty_amount);
  IF v_penalty < 0 THEN RAISE EXCEPTION 'INVALID_PENALTY'; END IF;

  SELECT * INTO v_existing FROM public.group_members
    WHERE group_id = v_group.id AND user_id = auth.uid();
  IF FOUND AND v_existing.left_at IS NULL THEN RAISE EXCEPTION 'ALREADY_MEMBER'; END IF;

  SELECT COUNT(*) INTO v_member_count FROM public.group_members
    WHERE group_id = v_group.id AND left_at IS NULL;
  IF v_member_count >= v_group.max_members THEN RAISE EXCEPTION 'GROUP_FULL'; END IF;

  IF FOUND THEN
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

-- 3. Force PostgREST à recharger son cache de schéma (sinon l'API ne « voit » pas la fonction)
NOTIFY pgrst, 'reload schema';
