-- ============================================================================
-- 044 — Limite de séances par jour (réglable par l'admin, défaut 3)
-- ============================================================================
-- ⚠ Exécuter APRÈS 042 (valeurs d'enum session_limit_*).
--
-- L'admin peut plafonner le nombre de séances déclarables par jour et par membre
-- (par défaut 3). Au-delà, le joueur doit demander à l'admin, qui peut lui
-- accorder UNE séance de plus pour CE jour précis.
--
-- 1. `groups.max_sessions_per_day` (NULL = illimité, défaut 3)
-- 2. `session_day_grants` : dérogations « +1 aujourd'hui » accordées par l'admin
-- 3. `declare_session` v3 : refuse au-delà de la limite (DAILY_LIMIT_REACHED)
-- 4. `request_session_limit` / `grant_session_limit` : demande + accord + notifs
-- ============================================================================

-- 1. Colonne de règle --------------------------------------------------------
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS max_sessions_per_day INTEGER DEFAULT 3
    CHECK (max_sessions_per_day IS NULL OR max_sessions_per_day >= 1);

COMMENT ON COLUMN public.groups.max_sessions_per_day IS
  'Nombre max de séances déclarables par jour et par membre. NULL = illimité. Défaut 3.';

-- 2. Dérogations ponctuelles -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_day_grants (
  group_id   UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day        DATE NOT NULL,
  extra      INTEGER NOT NULL DEFAULT 1 CHECK (extra >= 0),
  granted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id, day)
);

ALTER TABLE public.session_day_grants ENABLE ROW LEVEL SECURITY;

-- Le membre voit ses dérogations ; l'admin celles de son groupe. Écriture via RPC.
DROP POLICY IF EXISTS session_day_grants_select ON public.session_day_grants;
CREATE POLICY session_day_grants_select ON public.session_day_grants
  FOR SELECT USING (user_id = auth.uid() OR public.is_group_admin(group_id));

-- Combien de séances ce membre a-t-il DÉJÀ ce jour dans ce défi ?
CREATE OR REPLACE FUNCTION public.sessions_used_on(p_group_id UUID, p_user_id UUID, p_day DATE)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT count(*)::int FROM public.sessions
  WHERE group_id = p_group_id AND user_id = p_user_id AND performed_at = p_day
    AND status <> 'rejected';  -- une séance refusée ne « consomme » pas le quota
$$;

-- Quota effectif du jour (max de la règle + dérogations). NULL = illimité.
CREATE OR REPLACE FUNCTION public.daily_session_allowance(p_group_id UUID, p_user_id UUID, p_day DATE)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN g.max_sessions_per_day IS NULL THEN NULL
    ELSE g.max_sessions_per_day + COALESCE(
      (SELECT extra FROM public.session_day_grants dg
        WHERE dg.group_id = p_group_id AND dg.user_id = p_user_id AND dg.day = p_day), 0)
  END
  FROM public.groups g WHERE g.id = p_group_id;
$$;

GRANT EXECUTE ON FUNCTION public.sessions_used_on(UUID, UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.daily_session_allowance(UUID, UUID, DATE) TO authenticated;

-- 3. declare_session v3 : applique la limite ---------------------------------
-- Le contrôle est au point d'entrée « déclarer » (groupe d'origine). Les copies
-- vers les autres défis (publish_session_to_my_groups) ne repassent pas ici :
-- une même séance réelle ne doit pas être bloquée défi par défi.
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
  v_allowance INTEGER;
  v_session_id UUID;
BEGIN
  IF NOT public.is_group_member(p_group_id) THEN RAISE EXCEPTION 'NOT_MEMBER'; END IF;

  SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'GROUP_NOT_FOUND'; END IF;
  IF v_group.status NOT IN ('setup', 'active') THEN RAISE EXCEPTION 'GROUP_NOT_ACTIVE'; END IF;

  IF p_activity_type IS NULL OR length(trim(p_activity_type)) = 0 THEN
    RAISE EXCEPTION 'ACTIVITY_REQUIRED';
  END IF;
  IF p_duration_min < v_group.min_duration_min THEN RAISE EXCEPTION 'DURATION_TOO_SHORT'; END IF;
  IF p_performed_at > v_today THEN RAISE EXCEPTION 'DATE_IN_FUTURE'; END IF;
  IF v_group.publication_deadline = 'same_day' AND p_performed_at <> v_today THEN
    RAISE EXCEPTION 'PUBLICATION_TOO_LATE';
  END IF;

  -- Limite de séances par jour (+ dérogations éventuelles).
  v_allowance := public.daily_session_allowance(p_group_id, auth.uid(), p_performed_at);
  IF v_allowance IS NOT NULL
     AND public.sessions_used_on(p_group_id, auth.uid(), p_performed_at) >= v_allowance THEN
    RAISE EXCEPTION 'DAILY_LIMIT_REACHED';
  END IF;

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

GRANT EXECUTE ON FUNCTION public.declare_session(UUID, TEXT, INTEGER, DATE, TEXT) TO authenticated;

-- 4. Demande + accord --------------------------------------------------------
-- 4.a Le joueur demande à dépasser sa limite pour un jour donné.
CREATE OR REPLACE FUNCTION public.request_session_limit(p_group_id UUID, p_day DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_group public.groups%ROWTYPE;
  v_name  TEXT;
  v_admin RECORD;
  v_sent  BOOLEAN := FALSE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF NOT public.is_group_member(p_group_id) THEN RAISE EXCEPTION 'NOT_MEMBER'; END IF;

  SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'GROUP_NOT_FOUND'; END IF;

  -- Anti-spam : une seule demande par jour et par membre tant qu'elle n'est pas honorée.
  IF EXISTS (
    SELECT 1 FROM public.notifications n
    JOIN public.group_members gm ON gm.group_id = p_group_id AND gm.role = 'admin' AND gm.left_at IS NULL
    WHERE n.user_id = gm.user_id AND n.type = 'session_limit_request'
      AND n.data ->> 'group_id' = p_group_id::text
      AND n.data ->> 'requester_id' = v_uid::text
      AND n.data ->> 'day' = p_day::text
  ) THEN
    RETURN FALSE;
  END IF;

  SELECT COALESCE(first_name, username, 'Un membre') INTO v_name FROM public.users WHERE id = v_uid;

  FOR v_admin IN
    SELECT user_id FROM public.group_members
     WHERE group_id = p_group_id AND role = 'admin' AND left_at IS NULL AND user_id <> v_uid
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_admin.user_id, 'session_limit_request', 'Séance supplémentaire ?',
      v_name || ' a atteint sa limite de séances du ' || to_char(p_day, 'DD/MM')
        || ' dans « ' || v_group.name || ' » et demande à en publier une de plus.',
      jsonb_build_object('group_id', p_group_id, 'day', p_day,
                         'requester_id', v_uid, 'requester_name', v_name)
    );
    v_sent := TRUE;
  END LOOP;

  RETURN v_sent;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_session_limit(UUID, DATE) TO authenticated;

-- 4.b L'admin accorde UNE séance de plus pour ce jour (cumulable si redemandé).
CREATE OR REPLACE FUNCTION public.grant_session_limit(
  p_group_id UUID,
  p_user_id  UUID,
  p_day      DATE
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_group public.groups%ROWTYPE;
BEGIN
  IF NOT public.is_group_admin(p_group_id) THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;
  SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'GROUP_NOT_FOUND'; END IF;

  INSERT INTO public.session_day_grants (group_id, user_id, day, extra, granted_by, updated_at)
  VALUES (p_group_id, p_user_id, p_day, 1, auth.uid(), NOW())
  ON CONFLICT (group_id, user_id, day)
  DO UPDATE SET extra = public.session_day_grants.extra + 1,
                granted_by = auth.uid(), updated_at = NOW();

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    p_user_id, 'session_limit_granted', 'Séance supplémentaire accordée',
    'Tu peux publier une séance de plus le ' || to_char(p_day, 'DD/MM')
      || ' dans « ' || v_group.name || ' ».',
    jsonb_build_object('group_id', p_group_id, 'day', p_day)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_session_limit(UUID, UUID, DATE) TO authenticated;
