-- ============================================================================
-- Correctif — colonne group_members.penalty_amount manquante + valeurs d'enum
-- ============================================================================
-- Symptôme : "column \"penalty_amount\" of relation \"group_members\" does not exist".
-- Cause : le fichier 003 n'a pas été appliqué (les ALTER TYPE ... ADD VALUE peuvent
-- faire échouer tout le script s'ils sont exécutés avec le reste).
--
-- ⚠ Exécute ce fichier SEUL (sélectionne tout, Run). Il est idempotent.
--   Ensuite, ré-exécute 004, 005, 006, 007 si tu avais eu des erreurs dessus.
-- ============================================================================

-- 1. Colonne pénalité par membre
ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS penalty_amount NUMERIC(8,2) CHECK (penalty_amount >= 0);

-- 2. Valeurs d'enum pour les notifications in-app
--    (ADD VALUE doit être committé avant d'être utilisé par 004/005 → fichier séparé)
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'group_invitation';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'penalty_change_request';

-- 3. Recharge le cache PostgREST
NOTIFY pgrst, 'reload schema';
