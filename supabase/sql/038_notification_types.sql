-- ============================================================================
-- 038 — Nouvelles valeurs d'enum `notification_type`
-- ============================================================================
-- ⚠ FICHIER SÉPARÉ, À EXÉCUTER EN PREMIER (avant 039).
--
-- PostgreSQL refuse d'UTILISER une valeur d'enum ajoutée dans la même
-- transaction que son ADD VALUE. L'éditeur SQL de Supabase enveloppe tout le
-- contenu d'un onglet dans une seule transaction : garder ces trois lignes à
-- part est la seule façon fiable que 039 puisse s'en servir.
-- (C'est exactement le piège qui avait fait échouer 003, corrigé par 008.)
--
-- - activity_request    → un joueur demande à l'admin d'ajouter un sport
-- - rule_change_request → un joueur demande à l'admin d'assouplir une règle
-- - activity_added      → l'admin a ajouté le sport demandé (réponse)
-- ============================================================================

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'activity_request';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'rule_change_request';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'activity_added';
