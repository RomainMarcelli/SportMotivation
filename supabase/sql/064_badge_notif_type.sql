-- ============================================================================
-- 064 — Type de notification « badge débloqué » (Phase 4)
-- ============================================================================
-- Fichier ISOLÉ (ADD VALUE ne peut pas cohabiter avec l'usage de la valeur dans la
-- même transaction). À exécuter APRÈS 063 et AVANT 065 (qui insère ce type).
--
-- `badge_unlocked` n'est PAS classé dans `notification_category()` (035) → il tombe
-- dans le « ELSE NULL » : c'est une célébration personnelle, toujours délivrée et non
-- filtrable (choix assumé : on ne masque pas un trophée gagné).
-- ============================================================================

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'badge_unlocked';

NOTIFY pgrst, 'reload schema';
