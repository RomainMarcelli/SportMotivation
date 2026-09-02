-- ============================================================================
-- 068 — Type de notification « objectif hebdo atteint » (Phase 6)
-- ============================================================================
-- Fichier ISOLÉ : `ALTER TYPE ... ADD VALUE` ne peut pas cohabiter, dans la même
-- transaction, avec l'usage de la nouvelle valeur (cf. 064). À exécuter APRÈS 067
-- et AVANT 069 (qui insère ce type via `celebrate_weekly_objective`).
--
-- `objective_reached` est une CÉLÉBRATION personnelle (« tu as atteint ton objectif
-- de la semaine »). Comme `badge_unlocked`, elle n'est PAS filtrable par préférence
-- (voir 069 : `notification_category()` la classe en NULL → toujours délivrée). On ne
-- masque pas à quelqu'un une réussite qui le concerne.
-- ============================================================================

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'objective_reached';

NOTIFY pgrst, 'reload schema';
