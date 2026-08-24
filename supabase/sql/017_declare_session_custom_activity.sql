-- ============================================================================
-- 017 — declare_session : autoriser une activité hors de la liste du groupe
-- ============================================================================
-- À exécuter après 006_sessions.sql.
--
-- Contexte (Étape 6 révision) : l'écran « Déclarer une séance » permet désormais
-- de saisir un sport non listé via le chip « Autre ». Un avertissement client
-- prévient l'utilisateur ; s'il choisit « Continuer quand même », la séance doit
-- pouvoir être créée. On retire donc le verrou serveur ACTIVITY_NOT_ALLOWED : le
-- vrai filtre reste le **vote du groupe** (statut 'pending_vote').
--
-- Le reste de la fonction (membre actif, défi en cours, durée mini, pas de futur,
-- règle de publication, semaine ISO) est INCHANGÉ.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.declare_session(
  p_group_id     UUID,
  p_activity_type TEXT,
  p_duration_min  INTEGER,
  p_performed_at  DATE,
  p_comment       TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group     public.groups%ROWTYPE;
  v_today     DATE := (NOW() AT TIME ZONE 'Europe/Paris')::date;
  v_week      DATE;
  v_session_id UUID;
BEGIN
  -- Membre actif du groupe ?
  IF NOT public.is_group_member(p_group_id) THEN
    RAISE EXCEPTION 'NOT_MEMBER';
  END IF;

  SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'GROUP_NOT_FOUND'; END IF;

  -- Le défi doit être en cours
  IF v_group.status NOT IN ('setup', 'active') THEN
    RAISE EXCEPTION 'GROUP_NOT_ACTIVE';
  END IF;

  -- (Retiré) Verrou « activité autorisée » : un sport hors liste est désormais
  -- accepté après avertissement côté client ; c'est le vote du groupe qui tranche.

  -- L'activité ne peut pas être vide
  IF p_activity_type IS NULL OR length(trim(p_activity_type)) = 0 THEN
    RAISE EXCEPTION 'ACTIVITY_REQUIRED';
  END IF;

  -- Durée minimale
  IF p_duration_min < v_group.min_duration_min THEN
    RAISE EXCEPTION 'DURATION_TOO_SHORT';
  END IF;

  -- La séance ne peut pas être dans le futur
  IF p_performed_at > v_today THEN
    RAISE EXCEPTION 'DATE_IN_FUTURE';
  END IF;

  -- Règle de publication : same_day = uniquement le jour même
  IF v_group.publication_deadline = 'same_day' AND p_performed_at <> v_today THEN
    RAISE EXCEPTION 'PUBLICATION_TOO_LATE';
  END IF;

  -- Lundi (ISO) de la semaine concernée
  v_week := (date_trunc('week', p_performed_at::timestamp))::date;

  INSERT INTO public.sessions
    (group_id, user_id, activity_type, duration_min, comment, performed_at, week_start, status)
  VALUES
    (p_group_id, auth.uid(), p_activity_type, p_duration_min, NULLIF(p_comment, ''),
     p_performed_at, v_week, 'pending_vote')
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;
