-- ============================================================================
-- Phase 3 — Déclaration de séance & preuves
-- ============================================================================
-- À exécuter après les fichiers 001 → 005.
-- Crée : RPC declare_session, policies RLS lecture/insert pour sessions et
-- session_proofs, et le bucket privé `session-proofs` (+ policies storage).
-- Les politiques sont PERMISSIVE : elles s'ajoutent (OR) aux éventuelles
-- politiques déjà présentes dans le schéma initial, sans les remplacer.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. RLS — lecture des séances par les membres du groupe
-- ----------------------------------------------------------------------------
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_select_members" ON public.sessions;
CREATE POLICY "sessions_select_members" ON public.sessions
  FOR SELECT USING (public.is_group_member(group_id));

-- L'auteur peut supprimer sa propre séance tant qu'elle est en attente de vote
DROP POLICY IF EXISTS "sessions_delete_author" ON public.sessions;
CREATE POLICY "sessions_delete_author" ON public.sessions
  FOR DELETE USING (user_id = auth.uid() AND status = 'pending_vote');

-- ----------------------------------------------------------------------------
-- 2. RLS — preuves : lecture par les membres, insert par l'auteur de la séance
-- ----------------------------------------------------------------------------
ALTER TABLE public.session_proofs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_proofs_select_members" ON public.session_proofs;
CREATE POLICY "session_proofs_select_members" ON public.session_proofs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_proofs.session_id
        AND public.is_group_member(s.group_id)
    )
  );

DROP POLICY IF EXISTS "session_proofs_insert_author" ON public.session_proofs;
CREATE POLICY "session_proofs_insert_author" ON public.session_proofs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_proofs.session_id
        AND s.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 3. RPC declare_session — crée une séance après validation des règles du groupe
-- ----------------------------------------------------------------------------
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

  -- Activité autorisée par le groupe (accepted_activities = tableau JSONB de strings)
  IF NOT (v_group.accepted_activities ? p_activity_type) THEN
    RAISE EXCEPTION 'ACTIVITY_NOT_ALLOWED';
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

-- ----------------------------------------------------------------------------
-- 4. Bucket privé `session-proofs` + policies storage
-- ----------------------------------------------------------------------------
-- Convention de chemin : {auth.uid()}/{session_id}.{ext}
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-proofs', 'session-proofs', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Upload : l'utilisateur ne peut écrire que dans son propre dossier
DROP POLICY IF EXISTS "session_proofs_upload_own" ON storage.objects;
CREATE POLICY "session_proofs_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'session-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Lecture : tout membre d'un groupe où l'auteur (= 1er segment du chemin) a une séance
DROP POLICY IF EXISTS "session_proofs_read_group" ON storage.objects;
CREATE POLICY "session_proofs_read_group" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'session-proofs'
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.user_id::text = (storage.foldername(name))[1]
        AND public.is_group_member(s.group_id)
    )
  );

-- L'auteur peut supprimer ses propres fichiers
DROP POLICY IF EXISTS "session_proofs_delete_own" ON storage.objects;
CREATE POLICY "session_proofs_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'session-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
