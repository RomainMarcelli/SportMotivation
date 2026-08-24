-- ============================================================================
-- 058 — Temps réel sur les notifications
-- ============================================================================
-- Objectif : le client reçoit les notifications EN DIRECT (vote à donner, refus,
-- invitation, relance cagnotte…), sans attendre le poll de 60 s ni un refresh
-- manuel. Le filtrage par destinataire + la sécurité restent portés par la RLS
-- déjà en place (`notifications` : lecture de ses propres lignes uniquement).
--
-- Deux choses à faire côté serveur :
--   1. Publier la table dans `supabase_realtime` (sinon aucun événement n'est émis).
--   2. REPLICA IDENTITY FULL : la ligne complète accompagne chaque événement, ce
--      qui permet à la RLS de s'appliquer aussi aux UPDATE/DELETE (l'INSERT — le
--      cas qui nous intéresse — fonctionne déjà avec le défaut, mais FULL rend le
--      filtrage fiable pour TOUS les événements).
--
-- Idempotent : réexécutable sans erreur ni doublon.
-- ============================================================================

ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  -- La publication `supabase_realtime` est créée par défaut sur les projets
  -- Supabase ; on ne l'ajoute que si elle existe ET que la table n'y est pas déjà.
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'notifications'
     )
  THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
