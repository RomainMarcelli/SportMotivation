-- ============================================================================
-- 051 — Défi ACTIF dès la création (plus de phase « à venir » à lancer)
-- ============================================================================
-- À exécuter APRÈS 050.
--
-- Décision produit : un défi est `active` dès sa création. Il n'y a plus d'étape « lancer » :
-- ce sont `challenge_start` / `challenge_end` qui pilotent l'affichage (à venir / en cours /
-- terminé, cf. `features/groups/challenge-phase.ts`) ET les pénalités (la clôture hebdo 047 ne
-- traite déjà que les semaines comprises dans [début, fin], donc rien ne « compte » avant la
-- date de début, même si le défi est actif).
--
-- Ce fichier :
--   1) migre les défis existants encore en `setup` → `active` (l'app les affichera « à venir »
--      tant que leur date de début n'est pas atteinte, exactement comme avant) ;
--   2) change le DÉFAUT de la colonne `status` à `active` (ceinture + bretelles : la création
--      côté app pose déjà `status = 'active'` explicitement).
--
-- La valeur d'enum `setup` est CONSERVÉE (encore référencée par d'anciennes RPC de jointure qui
-- acceptent `status IN ('setup','active')`) — on cesse simplement de la produire.
-- ============================================================================

UPDATE public.groups SET status = 'active' WHERE status = 'setup';

ALTER TABLE public.groups ALTER COLUMN status SET DEFAULT 'active';

NOTIFY pgrst, 'reload schema';

-- Vérification : plus aucun défi en `setup`, et le défaut est bien `active`.
--   SELECT status, count(*) FROM public.groups GROUP BY status;
--   SELECT column_default FROM information_schema.columns
--   WHERE table_name = 'groups' AND column_name = 'status';   -- → 'active'::group_status
