-- ============================================================================
-- Étape 4 (Créer un défi) — autoriser « Aucun minimum » (min_duration_min = 0)
-- ============================================================================
-- À exécuter après les fichiers 001 → 015.
--
-- Le schéma initial contraint `groups.min_duration_min` à être > 0
-- (contrainte `groups_min_duration_min_check`). L'écran de création autorise
-- désormais 0 = « Aucun minimum » → on relâche la borne basse à 0.
-- On garde une borne haute raisonnable (600 min, cohérente avec le schéma Zod).
-- Idempotent : on recrée la contrainte proprement.
-- ============================================================================

ALTER TABLE public.groups
  DROP CONSTRAINT IF EXISTS groups_min_duration_min_check;

ALTER TABLE public.groups
  ADD CONSTRAINT groups_min_duration_min_check
  CHECK (min_duration_min >= 0 AND min_duration_min <= 600);
