-- =============================================================================
-- 035 — Préférences de notification par utilisateur (écran Paramètres)
--
-- Prérequis : 033 (valeur d'enum `member_left`) et 034 doivent être passés.
--
-- 1. Colonne `users.notification_prefs` (jsonb, tout activé par défaut)
-- 2. `notification_category()` : type de notification → catégorie réglable
-- 3. `wants_notification()`    : ce destinataire accepte-t-il cette catégorie ?
-- 4. Trigger BEFORE INSERT sur `notifications` : filtre **à la source**
-- 5. `set_notification_prefs()` : écriture depuis le client
--
-- CHOIX D'ARCHITECTURE — un trigger plutôt que modifier chaque fonction.
-- Une douzaine de fonctions insèrent dans `notifications` (invitations, votes,
-- excuses, arrivées, départs, transfert d'admin…). Les reprendre une par une,
-- c'était douze occasions de casser une fonction qui marche, et chaque
-- notification écrite plus tard aurait oublié le filtre. Le trigger couvre tout
-- ce qui existe **et** tout ce qui viendra.
--
-- CE QUI N'EST JAMAIS FILTRÉ : les notifications qui concernent l'utilisateur
-- personnellement — invitation reçue, résultat du vote sur SA séance ou SON
-- excuse, pénalité appliquée, demande de changement de pénalité. Ce ne sont pas
-- des notifications d'ambiance : les couper reviendrait à cacher à quelqu'un une
-- décision prise à son sujet. Leur catégorie est NULL, donc toujours acceptée.
-- =============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.users.notification_prefs IS
  'Catégories de notifications désactivées, ex: {"group_activity": false}. Absent = activé.';

-- 2. Type → catégorie réglable dans les Paramètres ---------------------------
CREATE OR REPLACE FUNCTION public.notification_category(p_type public.notification_type)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_type
    WHEN 'session_reminder'      THEN 'session_reminders'
    WHEN 'weekly_recap'          THEN 'weekly_recap'
    WHEN 'vote_pending_session'  THEN 'votes'
    WHEN 'vote_pending_excuse'   THEN 'votes'
    WHEN 'member_joined'         THEN 'group_activity'
    WHEN 'member_left'           THEN 'group_activity'
    WHEN 'admin_transferred'     THEN 'group_activity'
    WHEN 'blame_received'        THEN 'group_activity'
    WHEN 'challenge_ending_soon' THEN 'challenge_end'
    WHEN 'challenge_completed'   THEN 'challenge_end'
    -- group_invitation, penalty_change_request, penalty_applied,
    -- session_validated, session_rejected, excuse_accepted, excuse_rejected
    ELSE NULL
  END;
$$;

-- 3. Le destinataire accepte-t-il ? ------------------------------------------
-- Comparaison à 'false' plutôt qu'un cast en booléen : une valeur inattendue
-- dans le jsonb ne doit pas faire échouer l'insertion d'une notification.
-- Tout ce qui n'est pas explicitement `false` est accepté.
CREATE OR REPLACE FUNCTION public.wants_notification(
  p_user_id UUID,
  p_type    public.notification_type
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (u.notification_prefs ->> public.notification_category(p_type)) IS DISTINCT FROM 'false'
       FROM public.users u
      WHERE u.id = p_user_id),
    TRUE
  );
$$;

-- 4. Filtre à la source ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.filter_notification_by_prefs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.wants_notification(NEW.user_id, NEW.type) THEN
    RETURN NEW;
  END IF;
  -- BEFORE INSERT + RETURN NULL : la ligne est abandonnée sans erreur, donc un
  -- INSERT ... SELECT vers tout le groupe saute juste les membres concernés.
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_prefs ON public.notifications;
CREATE TRIGGER trg_notifications_prefs
  BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.filter_notification_by_prefs();

-- 5. Écriture depuis le client -----------------------------------------------
CREATE OR REPLACE FUNCTION public.set_notification_prefs(p_prefs JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_clean  JSONB := '{}'::jsonb;
  v_result JSONB;
  v_key    TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF p_prefs IS NULL OR jsonb_typeof(p_prefs) <> 'object' THEN
    RAISE EXCEPTION 'INVALID_PREFS';
  END IF;

  -- Liste blanche : seules les clés connues, et seulement des booléens. La
  -- colonne ne peut pas devenir un dépotoir si le client se trompe.
  FOREACH v_key IN ARRAY ARRAY[
    'session_reminders', 'weekly_recap', 'votes', 'group_activity', 'challenge_end'
  ]
  LOOP
    IF jsonb_typeof(p_prefs -> v_key) = 'boolean' THEN
      v_clean := v_clean || jsonb_build_object(v_key, p_prefs -> v_key);
    END IF;
  END LOOP;

  UPDATE public.users
     SET notification_prefs = notification_prefs || v_clean
   WHERE id = v_uid
  RETURNING notification_prefs INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_notification_prefs(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wants_notification(UUID, public.notification_type) TO authenticated;
