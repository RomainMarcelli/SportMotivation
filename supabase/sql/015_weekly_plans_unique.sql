-- ============================================================================
-- Étape 3 (Accueil) — « Ma semaine » : plan hebdo par membre (weekly_plans)
-- ============================================================================
-- À exécuter après les fichiers 001 → 014.
--
-- L'écran d'accueil fait un UPSERT sur weekly_plans avec
--   onConflict = (group_id, user_id, week_start)
-- (cf. features/plans/queries.ts → useToggleWeeklyPlanDay).
-- Cet upsert exige une contrainte/index UNIQUE sur ce triplet. On la crée de
-- façon idempotente si elle manque dans le schéma initial.
--
-- RLS : non modifiée ici (le membre lit/écrit son propre plan ; à compléter dans
-- le schéma de base si nécessaire — un membre n'écrit que ses propres lignes).
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS weekly_plans_group_user_week_uidx
  ON public.weekly_plans (group_id, user_id, week_start);
