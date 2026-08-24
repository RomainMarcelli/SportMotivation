-- ============================================================================
-- 042 — Nouvelles valeurs d'enum `notification_type`
-- ============================================================================
-- ⚠ FICHIER SÉPARÉ, À EXÉCUTER EN PREMIER (avant 043/044) — cf. le piège des
-- `ADD VALUE` qui ne peuvent pas être utilisés dans la même transaction.
--
-- - activity_rejected        → l'admin/le vote a refusé un ajout de sport
-- - activity_vote            → un vote de groupe est ouvert pour ajouter un sport
-- - session_refused_by_member→ un membre a refusé TA séance (avec son explication)
-- - session_limit_request    → un membre demande à dépasser sa limite de séances/jour
-- - session_limit_granted    → l'admin t'accorde une séance de plus aujourd'hui
--
-- (session_validated, session_rejected, activity_added existent déjà.)
-- ============================================================================

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'activity_rejected';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'activity_vote';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'session_refused_by_member';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'session_limit_request';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'session_limit_granted';
