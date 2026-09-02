-- ============================================================================
-- 070 — Centres d'intérêt & localisation du groupe (Phase 7 — Google Places)
-- ============================================================================
-- À exécuter APRÈS 069. Idempotent. Ajoute au groupe de quoi proposer, en fin de
-- défi, des activités à faire ensemble (écran « Découvrir des activités ») :
--   • interests       : clés de centres d'intérêt choisis (jsonb tableau de TEXT,
--                       ex. ["restaurant","bowling","bar"]). Défaut [].
--   • location_label  : localité lisible (ex. « Lyon 3e »), facultative.
--   • location_lat/lng: coordonnées du point de recherche, facultatives (remplies
--                       plus tard via géocodage quand la clé Google sera branchée ;
--                       tant qu'elles sont nulles, l'écran part d'un centre par défaut).
--
-- Aucune nouvelle RLS : les colonnes suivent les policies SELECT/UPDATE existantes
-- de `groups` (lecture par les membres, écriture par l'admin). La recherche Places
-- elle-même passe par l'Edge Function `places-search` (clé serveur, jamais exposée).
-- ============================================================================

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS interests      JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS location_label TEXT,
  ADD COLUMN IF NOT EXISTS location_lat   DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_lng   DOUBLE PRECISION;

COMMENT ON COLUMN public.groups.interests IS
  'Centres d''intérêt du groupe (clés TEXT) pour les suggestions d''activités de fin de défi.';

NOTIFY pgrst, 'reload schema';
