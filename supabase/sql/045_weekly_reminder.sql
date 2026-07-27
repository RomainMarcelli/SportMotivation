-- ============================================================================
-- 045 — Rappel hebdomadaire « n'oublie pas tes séances » (samedi matin)
-- ============================================================================
-- Prévient, le SAMEDI à 9h (heure de Paris), les membres qui n'ont pas encore
-- atteint leur objectif de la semaine, via une notification in-app (type
-- `session_reminder`, déjà présent dans l'enum — aucun fichier d'enum requis).
--
-- Règles :
--   • uniquement les défis EN COURS (status 'active' + date du jour dans la période) ;
--   • uniquement les membres actifs sous leur objectif de séances validées ;
--   • respecte la préférence `notification_prefs.session_reminders` (défaut activé) ;
--   • idempotent : jamais deux rappels pour la même semaine / le même défi.
--
-- Choix du samedi (et pas dimanche) : il reste le week-end complet pour agir.
-- Passer au dimanche = changer le `dow` du cron ('6' → '0'). En ajouter un 2e :
-- programmer un second job.
--
-- ⚠ Nécessite l'extension pg_cron (disponible sur Supabase). À exécuter APRÈS 044.
-- Test manuel sans attendre samedi 9h : SELECT public.send_weekly_reminders(true);
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.send_weekly_reminders(p_force BOOLEAN DEFAULT FALSE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paris      TIMESTAMP := (now() AT TIME ZONE 'Europe/Paris');
  v_week_start DATE := (date_trunc('week', (now() AT TIME ZONE 'Europe/Paris')))::date; -- lundi (ISO)
  v_today      DATE := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_count      INTEGER := 0;
  r            RECORD;
BEGIN
  -- Garde temporelle DANS la fonction (et non dans le cron) → robuste au
  -- changement d'heure été/hiver : on ne dépend pas de l'heure UTC exacte.
  -- `p_force` permet de tester manuellement hors de ce créneau.
  IF NOT p_force
     AND (EXTRACT(DOW  FROM v_paris) <> 6      -- 6 = samedi
       OR EXTRACT(HOUR FROM v_paris) <> 9) THEN
    RETURN 0;
  END IF;

  FOR r IN
    SELECT gm.user_id,
           gm.group_id,
           g.name          AS group_name,
           gm.weekly_target AS target,
           COALESCE(done.cnt, 0) AS done
    FROM public.group_members gm
    JOIN public.groups g ON g.id = gm.group_id
    JOIN public.users  u ON u.id = gm.user_id
    LEFT JOIN (
      SELECT user_id, group_id, COUNT(*) AS cnt
      FROM public.sessions
      WHERE week_start = v_week_start AND status = 'validated'
      GROUP BY user_id, group_id
    ) done ON done.user_id = gm.user_id AND done.group_id = gm.group_id
    WHERE gm.left_at IS NULL
      AND g.status = 'active'
      AND v_today BETWEEN g.challenge_start AND g.challenge_end
      -- Objectif de la semaine pas encore atteint.
      AND COALESCE(done.cnt, 0) < gm.weekly_target
      -- Préférence « rappels de séance » (défaut = activé si clé absente).
      AND COALESCE(u.notification_prefs->>'session_reminders', 'true') <> 'false'
      -- Pas déjà rappelé cette semaine pour ce défi (idempotence).
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = gm.user_id
          AND n.type = 'session_reminder'
          AND (n.data->>'group_id')   = gm.group_id::text
          AND (n.data->>'week_start') = v_week_start::text
      )
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      r.user_id,
      'session_reminder',
      'Tes séances de la semaine',
      CASE
        WHEN r.target - r.done = 1
          THEN 'Il te reste 1 séance à valider dans « ' || r.group_name
               || ' » avant dimanche soir. C''est le moment de t''y mettre !'
        ELSE 'Il te reste ' || (r.target - r.done)::text || ' séances à valider dans « '
             || r.group_name || ' » avant dimanche soir. Ne lâche rien !'
      END,
      jsonb_build_object(
        'group_id',   r.group_id,
        'week_start', v_week_start,
        'remaining',  r.target - r.done
      )
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Seul le planificateur (rôle postgres) déclenche ce job : pas d'accès client.
REVOKE ALL ON FUNCTION public.send_weekly_reminders(BOOLEAN) FROM PUBLIC;

-- (Ré)installation idempotente du job : on retire l'ancien s'il existe, puis on
-- planifie. Le cron tourne chaque heure le samedi ; la fonction ne fait le
-- travail qu'au créneau 9h de Paris (garde interne ci-dessus).
DO $$
BEGIN
  PERFORM cron.unschedule('weekly-reminder');
EXCEPTION WHEN OTHERS THEN
  NULL; -- le job n'existait pas encore
END $$;

SELECT cron.schedule('weekly-reminder', '0 * * * 6', $$ SELECT public.send_weekly_reminders(); $$);
