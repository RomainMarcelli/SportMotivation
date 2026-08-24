-- ============================================================================
-- 052 — Suspension d'un joueur (Chantier 4)
-- ============================================================================
-- À exécuter APRÈS 051. Idempotent.
--
-- Métier : un membre SUSPENDU est exonéré de TOUT (blâmes ET pénalités « séance
-- manquée ») sur une période à date de fin définie. Ex : « joueur 1 suspendu du
-- 29/07 au 03/08 ». Deux entrées :
--   (a) l'ADMIN décide directement          → suspension `active` d'emblée ;
--   (b) le JOUEUR fait une DEMANDE (motif)  → suspension `pending`, l'admin
--       accepte / refuse (le vote de groupe = itération v2, non couvert ici).
--
-- Ce fichier ne fait QUE la fondation (table + helper + RLS + RPC + notifs).
--   • 053 branchera l'exonération dans la clôture hebdo (séances manquées) ;
--   • 054 branchera l'exonération dans la distribution des blâmes.
--
-- ⚠ Les valeurs d'enum sont ajoutées en tête (comme 046 pour `payment_reminder`) :
--   l'éditeur SQL committe chaque instruction → elles sont disponibles quand une
--   RPC est APPELÉE plus tard. Les CREATE FUNCTION ne les exécutent pas (corps
--   stocké tel quel), donc aucun souci d'ordre au sein du fichier.
-- ============================================================================

-- 0. Valeurs d'enum de notification (idempotentes) ---------------------------
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'suspension_requested';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'suspension_set';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'suspension_accepted';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'suspension_rejected';
-- Utilisée par 054 : prévenir l'admin quand un joueur atteint le seuil de blâmes.
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'blame_threshold_reached';


-- 1. Table `suspensions` ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.suspensions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id         UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,  -- le membre suspendu
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,                     -- INCLUS : suspendu jusqu'à cette date comprise
  reason           TEXT,                              -- motif (obligatoire côté demande joueur)
  -- pending  : demande du joueur en attente de l'admin
  -- active   : suspension effective (décidée par l'admin, ou demande acceptée)
  -- rejected : demande refusée par l'admin
  -- cancelled: levée (admin) ou retirée (joueur avant décision)
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('pending', 'active', 'rejected', 'cancelled')),
  -- origin : qui est à l'initiative — 'admin' (décision) ou 'request' (demande joueur)
  origin           TEXT NOT NULL CHECK (origin IN ('admin', 'request')),
  requested_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,  -- auteur de la demande
  decided_by       UUID REFERENCES public.users(id) ON DELETE SET NULL,  -- admin qui tranche
  decided_at       TIMESTAMPTZ,
  decision_comment TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

-- Index de lecture rapide pour `is_suspended` (filtre group+user+status, plage de dates).
CREATE INDEX IF NOT EXISTS suspensions_lookup_idx
  ON public.suspensions (group_id, user_id, status, start_date, end_date);


-- 2. Helper `is_suspended(group, user, date)` --------------------------------
-- Vrai si une suspension ACTIVE couvre `p_on` (bornes incluses). SECURITY DEFINER
-- + STABLE pour être appelable depuis les fonctions de clôture/blâmes (053/054)
-- sans dépendre de la RLS.
CREATE OR REPLACE FUNCTION public.is_suspended(
  p_group_id UUID,
  p_user_id  UUID,
  p_on       DATE
)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.suspensions s
    WHERE s.group_id = p_group_id
      AND s.user_id  = p_user_id
      AND s.status   = 'active'
      AND p_on BETWEEN s.start_date AND s.end_date
  );
$$;


-- 3. RLS — les membres du groupe LISENT les suspensions du groupe -------------
-- (affichage dashboard « X suspendu jusqu'au … »). Toute ÉCRITURE passe par les
-- RPC SECURITY DEFINER ci-dessous : aucune policy INSERT/UPDATE.
ALTER TABLE public.suspensions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS suspensions_select_members ON public.suspensions;
CREATE POLICY suspensions_select_members ON public.suspensions
  FOR SELECT USING (public.is_group_member(group_id));


-- 4. RPC — l'admin suspend directement un membre -----------------------------
CREATE OR REPLACE FUNCTION public.admin_suspend_member(
  p_group_id UUID,
  p_user_id  UUID,
  p_start    DATE,
  p_end      DATE,
  p_reason   TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group public.groups%ROWTYPE;
  v_id    UUID;
BEGIN
  IF NOT public.is_group_admin(p_group_id) THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;
  IF p_start IS NULL OR p_end IS NULL THEN RAISE EXCEPTION 'DATES_REQUIRED'; END IF;
  IF p_end < p_start THEN RAISE EXCEPTION 'BAD_DATE_RANGE'; END IF;

  -- La cible doit être un membre actif du groupe.
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = p_group_id AND gm.user_id = p_user_id AND gm.left_at IS NULL
  ) THEN
    RAISE EXCEPTION 'NOT_MEMBER';
  END IF;

  SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;

  INSERT INTO public.suspensions
    (group_id, user_id, start_date, end_date, reason, status, origin, decided_by, decided_at)
  VALUES
    (p_group_id, p_user_id, p_start, p_end, NULLIF(btrim(COALESCE(p_reason, '')), ''),
     'active', 'admin', auth.uid(), now())
  RETURNING id INTO v_id;

  -- Prévenir le joueur suspendu.
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    p_user_id,
    'suspension_set',
    'Tu es suspendu',
    'L''admin t''a suspendu de « ' || v_group.name || ' » du '
      || to_char(p_start, 'DD/MM') || ' au ' || to_char(p_end, 'DD/MM')
      || '. Tu es exonéré des blâmes et pénalités sur cette période.',
    jsonb_build_object('group_id', p_group_id, 'suspension_id', v_id,
                       'start_date', p_start, 'end_date', p_end)
  );

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_suspend_member(UUID, UUID, DATE, DATE, TEXT) TO authenticated;


-- 5. RPC — un joueur DEMANDE une suspension (motif obligatoire) ---------------
CREATE OR REPLACE FUNCTION public.request_suspension(
  p_group_id UUID,
  p_start    DATE,
  p_end      DATE,
  p_reason   TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_group  public.groups%ROWTYPE;
  v_who    TEXT;
  v_reason TEXT := NULLIF(btrim(COALESCE(p_reason, '')), '');
  v_id     UUID;
  v_admin  RECORD;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF NOT public.is_group_member(p_group_id) THEN RAISE EXCEPTION 'NOT_MEMBER'; END IF;
  IF p_start IS NULL OR p_end IS NULL THEN RAISE EXCEPTION 'DATES_REQUIRED'; END IF;
  IF p_end < p_start THEN RAISE EXCEPTION 'BAD_DATE_RANGE'; END IF;
  IF v_reason IS NULL THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;  -- motif exigé côté demande

  SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
  SELECT COALESCE(first_name, username, 'Un membre') INTO v_who
    FROM public.users WHERE id = v_uid;

  INSERT INTO public.suspensions
    (group_id, user_id, start_date, end_date, reason, status, origin, requested_by)
  VALUES
    (p_group_id, v_uid, p_start, p_end, v_reason, 'pending', 'request', v_uid)
  RETURNING id INTO v_id;

  -- Prévenir TOUS les admins du groupe (ils peuvent accepter / refuser).
  FOR v_admin IN
    SELECT user_id FROM public.group_members
    WHERE group_id = p_group_id AND left_at IS NULL AND role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_admin.user_id,
      'suspension_requested',
      'Demande de suspension',
      v_who || ' demande à être suspendu de « ' || v_group.name || ' » du '
        || to_char(p_start, 'DD/MM') || ' au ' || to_char(p_end, 'DD/MM')
        || ' : « ' || v_reason || ' ».',
      jsonb_build_object('group_id', p_group_id, 'suspension_id', v_id,
                         'requester_id', v_uid, 'start_date', p_start, 'end_date', p_end)
    );
  END LOOP;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_suspension(UUID, DATE, DATE, TEXT) TO authenticated;


-- 6. RPC — l'admin tranche une demande (accepte / refuse) --------------------
CREATE OR REPLACE FUNCTION public.decide_suspension(
  p_suspension_id UUID,
  p_accept        BOOLEAN,
  p_comment       TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_susp    public.suspensions%ROWTYPE;
  v_group   public.groups%ROWTYPE;
  v_comment TEXT := NULLIF(btrim(COALESCE(p_comment, '')), '');
  v_status  TEXT;
BEGIN
  SELECT * INTO v_susp FROM public.suspensions WHERE id = p_suspension_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'SUSPENSION_NOT_FOUND'; END IF;
  IF NOT public.is_group_admin(v_susp.group_id) THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;
  IF v_susp.status <> 'pending' THEN RAISE EXCEPTION 'NOT_PENDING'; END IF;

  v_status := CASE WHEN p_accept THEN 'active' ELSE 'rejected' END;

  UPDATE public.suspensions
     SET status = v_status, decided_by = auth.uid(), decided_at = now(),
         decision_comment = v_comment
   WHERE id = p_suspension_id AND status = 'pending';
  IF NOT FOUND THEN RETURN 'already_decided'; END IF;  -- course : un autre admin a tranché

  SELECT * INTO v_group FROM public.groups WHERE id = v_susp.group_id;

  -- Prévenir le demandeur du verdict.
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_susp.requested_by,
    -- Le `type` est un enum : un CASE renvoie `text`, qu'il faut caster explicitement
    -- (un littéral simple se coerce, pas un CASE). Cf. 024 pour le même motif.
    CASE WHEN p_accept THEN 'suspension_accepted'::public.notification_type
                       ELSE 'suspension_rejected'::public.notification_type END,
    CASE WHEN p_accept THEN 'Suspension accordée' ELSE 'Suspension refusée' END,
    CASE WHEN p_accept
      THEN 'Ta suspension de « ' || v_group.name || ' » du '
           || to_char(v_susp.start_date, 'DD/MM') || ' au ' || to_char(v_susp.end_date, 'DD/MM')
           || ' est accordée. Tu es exonéré des blâmes et pénalités sur cette période.'
      ELSE 'Ta demande de suspension de « ' || v_group.name || ' » a été refusée.'
    END || COALESCE(' « ' || v_comment || ' »', ''),
    jsonb_build_object('group_id', v_susp.group_id, 'suspension_id', v_susp.id)
  );

  RETURN v_status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decide_suspension(UUID, BOOLEAN, TEXT) TO authenticated;


-- 7. RPC — lever une suspension (admin) ou retirer sa demande (joueur) --------
CREATE OR REPLACE FUNCTION public.cancel_suspension(p_suspension_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_susp  public.suspensions%ROWTYPE;
  v_group public.groups%ROWTYPE;
  v_admin BOOLEAN;
BEGIN
  SELECT * INTO v_susp FROM public.suspensions WHERE id = p_suspension_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'SUSPENSION_NOT_FOUND'; END IF;
  IF v_susp.status NOT IN ('pending', 'active') THEN RETURN; END IF;  -- déjà close : rien à faire

  v_admin := public.is_group_admin(v_susp.group_id);
  -- Autorisé : l'admin (lève une suspension / refuse une demande) OU le joueur
  -- qui RETIRE sa propre demande encore en attente.
  IF NOT v_admin AND NOT (v_susp.status = 'pending' AND v_susp.requested_by = v_uid) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  UPDATE public.suspensions
     SET status = 'cancelled', decided_by = v_uid, decided_at = now()
   WHERE id = p_suspension_id;

  -- Si c'est l'admin qui lève une suspension ACTIVE, prévenir le joueur concerné.
  IF v_admin AND v_susp.user_id <> v_uid AND v_susp.status = 'active' THEN
    SELECT * INTO v_group FROM public.groups WHERE id = v_susp.group_id;
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_susp.user_id,
      'suspension_set',
      'Suspension levée',
      'Ta suspension de « ' || v_group.name || ' » a été levée par l''admin.',
      jsonb_build_object('group_id', v_susp.group_id, 'suspension_id', v_susp.id)
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_suspension(UUID) TO authenticated;


-- 8. RPC de LECTURE — suspensions d'un groupe (membres uniquement) ------------
-- La RLS autorise déjà la lecture directe ; cette RPC existe pour le client typé
-- (la table `suspensions` n'est pas encore dans les types générés → on la lit via
--  `.rpc(... as never)`, comme les autres RPC récentes). SECURITY DEFINER = on
--  RÉ-VÉRIFIE l'appartenance dans le WHERE (sinon la vérité RLS serait contournée).
CREATE OR REPLACE FUNCTION public.get_group_suspensions(p_group_id UUID)
RETURNS SETOF public.suspensions
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT s.* FROM public.suspensions s
  WHERE s.group_id = p_group_id
    AND public.is_group_member(p_group_id)
  ORDER BY s.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_group_suspensions(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
