-- ============================================================================
-- 023 — Joker (Étape 8) : 1 joker par membre et par mois
-- ============================================================================
-- À exécuter après 019 (is_group_member). Crée la table `jokers` (usage
-- mensuel, anti-doublon par contrainte d'unicité), sa RLS de lecture, et la RPC
-- `use_joker` qui consomme le joker du mois en cours.
-- Le joker annule une séance SANS pénalité ni vote → l'effet (séance exemptée)
-- est calculé à l'Étape 9. Ici on ne fait que TRACER l'usage.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.jokers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  month_start date NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id, month_start)
);

ALTER TABLE public.jokers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jokers_select_members" ON public.jokers;
CREATE POLICY "jokers_select_members" ON public.jokers
  FOR SELECT USING (public.is_group_member(group_id));
-- (Pas de policy INSERT : on passe par la RPC SECURITY DEFINER ci-dessous.)

CREATE OR REPLACE FUNCTION public.use_joker(p_group_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month DATE := (date_trunc('month', (NOW() AT TIME ZONE 'Europe/Paris')::date::timestamp))::date;
  v_id    UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF NOT public.is_group_member(p_group_id) THEN RAISE EXCEPTION 'NOT_MEMBER'; END IF;

  BEGIN
    INSERT INTO public.jokers (group_id, user_id, month_start)
    VALUES (p_group_id, auth.uid(), v_month)
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'JOKER_ALREADY_USED';
  END;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.use_joker(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
