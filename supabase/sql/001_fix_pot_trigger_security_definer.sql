-- ============================================================================
-- FIX : Création automatique de la cagnotte bloquée par la RLS
-- ============================================================================
-- Problème : le trigger create_pot_for_group() insère dans public.pots, mais
-- cette table a la RLS activée SANS policy INSERT. Sans SECURITY DEFINER, le
-- trigger s'exécute avec les droits de l'utilisateur courant et l'insert est
-- refusé → toute création de groupe échoue avec :
--   "new row violates row-level security policy for table pots"
--
-- Solution : passer la fonction en SECURITY DEFINER (comme handle_new_user),
-- ce qui lui permet de contourner la RLS pour cette insertion système.
-- ============================================================================

CREATE OR REPLACE FUNCTION create_pot_for_group()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.pots (group_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql' SECURITY DEFINER SET search_path = public;

-- Le trigger trg_groups_create_pot existe déjà et pointe sur cette fonction,
-- pas besoin de le recréer.
