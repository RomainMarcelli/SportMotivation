-- ============================================================================
-- 027 — OUTIL DE TEST : réinitialiser mon excuse de la semaine + mon joker du mois
-- ============================================================================
-- 🚨 À SUPPRIMER AVANT LA MISE EN PRODUCTION 🚨
--
-- Cette RPC permet à un utilisateur d'effacer SA PROPRE excuse de la semaine et
-- SON joker du mois, pour pouvoir enchaîner les tests sans attendre lundi ou le
-- mois suivant. Le bouton qui l'appelle est masqué hors développement (`__DEV__`),
-- MAIS la fonction reste appelable via l'API tant qu'elle existe en base :
-- c'est donc un moyen de CONTOURNER la règle « 1 joker/mois, 1 excuse/semaine ».
--
-- Commande de suppression (à exécuter avant la prod) :
--   DROP FUNCTION IF EXISTS public.dev_reset_excuse_joker(UUID);
--
-- Périmètre volontairement étroit : uniquement MES lignes (auth.uid()), dans un
-- groupe dont je suis membre, et uniquement la semaine/le mois EN COURS.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.dev_reset_excuse_joker(p_group_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week       DATE := (date_trunc('week',  (NOW() AT TIME ZONE 'Europe/Paris')::date::timestamp))::date;
  v_month      DATE := (date_trunc('month', (NOW() AT TIME ZONE 'Europe/Paris')::date::timestamp))::date;
  v_excuse_ids UUID[];
  v_excuses    INT := 0;
  v_jokers     INT := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF NOT public.is_group_member(p_group_id) THEN RAISE EXCEPTION 'NOT_MEMBER'; END IF;

  -- Mes excuses de la semaine en cours (tous statuts confondus).
  SELECT array_agg(id) INTO v_excuse_ids
  FROM public.excuses
  WHERE group_id = p_group_id AND user_id = auth.uid() AND week_start = v_week;

  IF v_excuse_ids IS NOT NULL THEN
    -- 1. Les votes rattachés (FK) …
    DELETE FROM public.votes WHERE excuse_id = ANY(v_excuse_ids);

    -- 2. … les notifications générées (comparaison en TEXTE : pas de cast risqué) …
    DELETE FROM public.notifications
    WHERE data->>'excuse_id' IN (SELECT unnest(v_excuse_ids)::text);

    -- 3. … puis les excuses elles-mêmes.
    DELETE FROM public.excuses WHERE id = ANY(v_excuse_ids);
    GET DIAGNOSTICS v_excuses = ROW_COUNT;
  END IF;

  -- Mon joker du mois en cours.
  DELETE FROM public.jokers
  WHERE group_id = p_group_id AND user_id = auth.uid() AND month_start = v_month;
  GET DIAGNOSTICS v_jokers = ROW_COUNT;

  RETURN v_excuses::text || ' excuse(s) et ' || v_jokers::text || ' joker(s) supprimé(s)';
END;
$$;

GRANT EXECUTE ON FUNCTION public.dev_reset_excuse_joker(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
