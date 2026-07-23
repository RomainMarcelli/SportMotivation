-- ============================================================================
-- 039 — Adhésion par invitation (bug critique), confidentialité, demandes admin
-- ============================================================================
-- ⚠ Exécuter APRÈS 038 (valeurs d'enum) — sinon les fonctions du §4 échouent.
--
-- 1. FIX CRITIQUE : `accept_invitation` ne créait PAS l'adhésion
-- 2. `users.is_searchable` — profil public / privé dans la recherche par @
-- 3. `upsert_my_profile` v3 : renvoie la ligne écrite (fin de la course d'écrans)
-- 4. Demandes à l'admin : ajouter un sport, assouplir une règle
-- ============================================================================


-- ============================================================================
-- 1. FIX CRITIQUE — `accept_invitation` marquait l'invitation acceptée
--    sans jamais insérer l'adhésion.
-- ============================================================================
-- MÊME BUG QUE 020, au même endroit, dans l'autre fonction d'adhésion.
--
-- En PL/pgSQL, `FOUND` reflète la DERNIÈRE requête exécutée. Le code faisait :
--
--     SELECT * INTO v_existing FROM group_members WHERE ...;   -- FOUND = adhésion existante ?
--     ...
--     SELECT COUNT(*) INTO v_member_count FROM group_members;  -- ⚠ écrase FOUND (un COUNT
--                                                              --   renvoie TOUJOURS une ligne)
--     IF FOUND THEN
--       UPDATE group_members ... WHERE id = v_existing.id;     -- v_existing.id = NULL
--     ELSE
--       INSERT INTO group_members ...;                         -- ← jamais atteint
--     END IF;
--
-- Pour un nouveau membre, la branche UPDATE partait donc sur `WHERE id = NULL`
-- → 0 ligne touchée, AUCUNE adhésion créée. La fonction renvoyait quand même
-- l'id du groupe : le client affichait « tu as rejoint », l'admin recevait sa
-- notification d'arrivée… et l'écran du défi répondait « groupe introuvable ou
-- tu n'y as pas accès », puisque la RLS ne voyait aucune adhésion.
-- Rejoindre par code marchait — c'est la fonction corrigée par 020.
--
-- Correctif identique : mémoriser l'existence AVANT que le COUNT n'écrase FOUND.
--
-- RATTRAPAGE : les invitations acceptées « à vide » sont remises en attente
-- (§1.b) pour que les joueurs concernés puissent réellement rejoindre.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.accept_invitation(
  p_invitation_id UUID,
  p_weekly_target INTEGER,
  p_penalty_amount NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv          public.group_invitations%ROWTYPE;
  v_group        public.groups%ROWTYPE;
  v_member_count INTEGER;
  v_existing     public.group_members%ROWTYPE;
  v_is_member    BOOLEAN;   -- une adhésion (même passée) existe déjà ?
  v_penalty      NUMERIC;
BEGIN
  SELECT * INTO v_inv FROM public.group_invitations WHERE id = p_invitation_id;
  IF NOT FOUND OR v_inv.invited_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'INVITATION_NOT_FOUND';
  END IF;
  IF v_inv.status <> 'pending' THEN RAISE EXCEPTION 'INVITATION_RESOLVED'; END IF;

  SELECT * INTO v_group FROM public.groups WHERE id = v_inv.group_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'GROUP_NOT_FOUND'; END IF;
  IF v_group.status NOT IN ('setup', 'active') THEN RAISE EXCEPTION 'GROUP_NOT_JOINABLE'; END IF;
  IF p_weekly_target < 1 OR p_weekly_target > 14 THEN RAISE EXCEPTION 'INVALID_TARGET'; END IF;

  v_penalty := COALESCE(p_penalty_amount, v_group.penalty_amount);
  IF v_penalty < 0 THEN RAISE EXCEPTION 'INVALID_PENALTY'; END IF;

  SELECT * INTO v_existing FROM public.group_members
    WHERE group_id = v_group.id AND user_id = auth.uid();
  v_is_member := FOUND;  -- ⚠ capturé AVANT toute autre requête

  -- Déjà membre actif : on se contente de solder l'invitation (idempotent).
  IF v_is_member AND v_existing.left_at IS NULL THEN
    UPDATE public.group_invitations
      SET status = 'accepted', resolved_at = NOW()
      WHERE id = p_invitation_id;
    RETURN v_group.id;
  END IF;

  SELECT COUNT(*) INTO v_member_count FROM public.group_members
    WHERE group_id = v_group.id AND left_at IS NULL;
  IF v_member_count >= v_group.max_members THEN RAISE EXCEPTION 'GROUP_FULL'; END IF;

  IF v_is_member THEN
    -- Réintégration d'un membre ayant quitté le défi.
    UPDATE public.group_members
      SET left_at = NULL, role = 'member', weekly_target = p_weekly_target,
          target_locked = TRUE, penalty_amount = v_penalty, joined_at = NOW()
      WHERE id = v_existing.id;
  ELSE
    INSERT INTO public.group_members
      (group_id, user_id, role, weekly_target, target_locked, penalty_amount)
    VALUES (v_group.id, auth.uid(), 'member', p_weekly_target, TRUE, v_penalty);
  END IF;

  UPDATE public.group_invitations
    SET status = 'accepted', resolved_at = NOW()
    WHERE id = p_invitation_id;

  RETURN v_group.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invitation(UUID, INTEGER, NUMERIC) TO authenticated;

-- 1.b Rattrapage des invitations « acceptées » qui n'ont jamais créé d'adhésion.
--     Sans ça, ces joueurs restent bloqués : l'invitation est soldée, et la
--     nouvelle fonction refuserait (`INVITATION_RESOLVED`) une invitation qui
--     n'a pourtant jamais abouti.
UPDATE public.group_invitations gi
   SET status = 'pending', resolved_at = NULL
 WHERE gi.status = 'accepted'
   AND NOT EXISTS (
     SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = gi.group_id
        AND gm.user_id  = gi.invited_user_id
        AND gm.left_at IS NULL
   );


-- ============================================================================
-- 2. Confidentialité — apparaître ou non dans la recherche par pseudo
-- ============================================================================
-- Public par défaut : une recherche par @ où personne n'est trouvable passerait
-- pour une fonctionnalité cassée. Se rendre privé reste un geste explicite.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_searchable BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.users.is_searchable IS
  'FALSE = profil privé : invisible dans la recherche par pseudo. Le code, '
  'le lien et le QR code d''un défi continuent de fonctionner.';

-- La recherche respecte le réglage. SECURITY DEFINER : c'est la seule porte
-- d'entrée vers `users` pour un non-membre, le filtre doit vivre ICI.
DROP FUNCTION IF EXISTS public.search_users_by_username(TEXT);
CREATE FUNCTION public.search_users_by_username(p_query TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  avatar_color TEXT,
  avatar_icon TEXT
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT id, username, first_name, last_name, avatar_url, avatar_color, avatar_icon
  FROM public.users
  WHERE p_query <> ''
    AND username ILIKE '%' || p_query || '%'
    AND id <> auth.uid()
    AND is_searchable
  ORDER BY username
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.search_users_by_username(TEXT) TO authenticated;


-- ============================================================================
-- 3. `upsert_my_profile` v3 — renvoie la ligne écrite
-- ============================================================================
-- POURQUOI CE CHANGEMENT DE TYPE DE RETOUR.
-- À l'inscription, l'avatar choisi (couleur + icône) n'apparaissait pas : la
-- requête « mon profil » partait dès que la session existait, donc AVANT
-- l'écriture. L'invalidation du cache ne l'annule pas — la réponse d'origine
-- (couleur et icône encore vides) arrivait après, et écrasait tout. Une photo
-- passait, elle, parce que son envoi au stockage laissait à la première requête
-- le temps de retomber.
--
-- En renvoyant la ligne écrite, le client n'a plus rien à relire : il pose la
-- vérité dans son cache. Plus de course possible, quel que soit le réseau.

DROP FUNCTION IF EXISTS public.upsert_my_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN);

CREATE FUNCTION public.upsert_my_profile(
  p_first_name   TEXT    DEFAULT NULL,
  p_last_name    TEXT    DEFAULT NULL,
  p_username     TEXT    DEFAULT NULL,
  p_avatar_url   TEXT    DEFAULT NULL,
  p_avatar_color TEXT    DEFAULT NULL,
  p_avatar_icon  TEXT    DEFAULT NULL,
  -- Passer NULL ne veut pas dire « efface » (sinon toute mise à jour partielle
  -- écraserait le reste). Ces drapeaux le disent explicitement.
  p_clear_avatar_url  BOOLEAN DEFAULT FALSE,
  p_clear_avatar_icon BOOLEAN DEFAULT FALSE,
  -- NULL = ne touche pas au réglage de confidentialité.
  p_is_searchable     BOOLEAN DEFAULT NULL
)
RETURNS public.users
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_email TEXT;
  v_row   public.users%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  INSERT INTO public.users (
    id, email, first_name, last_name, username,
    avatar_url, avatar_color, avatar_icon, is_searchable
  )
  VALUES (
    v_uid,
    COALESCE(v_email, ''),
    NULLIF(btrim(p_first_name), ''),
    NULLIF(btrim(p_last_name), ''),
    NULLIF(btrim(p_username), ''),
    CASE WHEN p_clear_avatar_url  THEN NULL ELSE NULLIF(btrim(p_avatar_url), '')   END,
    NULLIF(btrim(p_avatar_color), ''),
    CASE WHEN p_clear_avatar_icon THEN NULL ELSE NULLIF(btrim(p_avatar_icon), '')  END,
    COALESCE(p_is_searchable, TRUE)
  )
  ON CONFLICT (id) DO UPDATE SET
    -- COALESCE : on n'écrase que si une nouvelle valeur est fournie.
    first_name    = COALESCE(EXCLUDED.first_name,   public.users.first_name),
    last_name     = COALESCE(EXCLUDED.last_name,    public.users.last_name),
    username      = COALESCE(EXCLUDED.username,     public.users.username),
    avatar_color  = COALESCE(EXCLUDED.avatar_color, public.users.avatar_color),
    avatar_url    = CASE WHEN p_clear_avatar_url  THEN NULL
                         ELSE COALESCE(EXCLUDED.avatar_url,  public.users.avatar_url)  END,
    avatar_icon   = CASE WHEN p_clear_avatar_icon THEN NULL
                         ELSE COALESCE(EXCLUDED.avatar_icon, public.users.avatar_icon) END,
    is_searchable = COALESCE(p_is_searchable, public.users.is_searchable),
    updated_at    = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_my_profile(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN
) TO authenticated;


-- ============================================================================
-- 4. Demandes à l'admin
-- ============================================================================
-- Deux impasses côté joueur, jusqu'ici sans issue :
--   - il a fait un sport absent de la liste du défi ;
--   - le défi n'accepte les séances que le jour même, et il a oublié hier.
-- Dans les deux cas, la seule sortie était de renoncer. Ces fonctions posent
-- une demande sur le bureau de l'admin, qui tranche.

-- 4.a Demander l'ajout d'un sport --------------------------------------------
CREATE OR REPLACE FUNCTION public.request_group_activity(
  p_group_id UUID,
  p_activity TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      UUID := auth.uid();
  v_activity TEXT := btrim(COALESCE(p_activity, ''));
  v_group    public.groups%ROWTYPE;
  v_name     TEXT;
  v_admin    RECORD;
  v_sent     BOOLEAN := FALSE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF v_activity = '' THEN RAISE EXCEPTION 'ACTIVITY_REQUIRED'; END IF;
  IF NOT public.is_group_member(p_group_id) THEN RAISE EXCEPTION 'NOT_MEMBER'; END IF;

  SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'GROUP_NOT_FOUND'; END IF;

  -- Déjà dans la liste : rien à demander (course entre deux écrans, ou l'admin
  -- vient de l'ajouter).
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(COALESCE(v_group.accepted_activities, '[]'::jsonb)) a
    WHERE lower(btrim(a)) = lower(v_activity)
  ) THEN
    RETURN FALSE;
  END IF;

  -- Anti-spam : une seule demande par sport et par joueur sur 7 jours. Sans ça,
  -- déclarer trois randos dans la semaine réveillait l'admin trois fois.
  IF EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.type = 'activity_request'
      AND n.created_at > NOW() - INTERVAL '7 days'
      AND n.data ->> 'group_id' = p_group_id::text
      AND n.data ->> 'requester_id' = v_uid::text
      AND lower(n.data ->> 'activity') = lower(v_activity)
  ) THEN
    RETURN FALSE;
  END IF;

  SELECT COALESCE(first_name, username, 'Un membre') INTO v_name
    FROM public.users WHERE id = v_uid;

  FOR v_admin IN
    SELECT user_id FROM public.group_members
     WHERE group_id = p_group_id AND role = 'admin' AND left_at IS NULL
       AND user_id <> v_uid
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_admin.user_id,
      'activity_request',
      'Un sport à ajouter ?',
      v_name || ' a fait « ' || v_activity || ' », qui ne fait pas partie de « '
        || v_group.name || ' ».',
      jsonb_build_object(
        'group_id',     p_group_id,
        'group_name',   v_group.name,
        'activity',     v_activity,
        'requester_id', v_uid,
        'requester_name', v_name
      )
    );
    v_sent := TRUE;
  END LOOP;

  RETURN v_sent;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_group_activity(UUID, TEXT) TO authenticated;

-- 4.b L'admin ajoute le sport (un seul geste depuis la notification) ---------
CREATE OR REPLACE FUNCTION public.add_group_activity(
  p_group_id     UUID,
  p_activity     TEXT,
  p_requester_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity TEXT := btrim(COALESCE(p_activity, ''));
  v_group    public.groups%ROWTYPE;
  v_list     JSONB;
BEGIN
  IF NOT public.is_group_admin(p_group_id) THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;
  IF v_activity = '' THEN RAISE EXCEPTION 'ACTIVITY_REQUIRED'; END IF;

  SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'GROUP_NOT_FOUND'; END IF;

  v_list := COALESCE(v_group.accepted_activities, '[]'::jsonb);

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(v_list) a
    WHERE lower(btrim(a)) = lower(v_activity)
  ) THEN
    RETURN v_list;  -- déjà présent : idempotent
  END IF;

  v_list := v_list || to_jsonb(v_activity);

  UPDATE public.groups
     SET accepted_activities = v_list, updated_at = NOW()
   WHERE id = p_group_id;

  IF p_requester_id IS NOT NULL AND p_requester_id <> auth.uid() THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      p_requester_id,
      'activity_added',
      'Sport ajouté au défi',
      '« ' || v_activity || ' » compte maintenant dans « ' || v_group.name || ' ».',
      jsonb_build_object('group_id', p_group_id, 'activity', v_activity)
    );
  END IF;

  RETURN v_list;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_group_activity(UUID, TEXT, UUID) TO authenticated;

-- 4.c Demander l'assouplissement d'une règle ---------------------------------
-- Une règle change pour TOUT LE MONDE : pas de bouton « accepter » ici, la
-- notification amène l'admin sur l'écran de modification du défi.
CREATE OR REPLACE FUNCTION public.request_rule_change(
  p_group_id UUID,
  p_rule     TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_group public.groups%ROWTYPE;
  v_name  TEXT;
  v_label TEXT;
  v_admin RECORD;
  v_sent  BOOLEAN := FALSE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF NOT public.is_group_member(p_group_id) THEN RAISE EXCEPTION 'NOT_MEMBER'; END IF;

  v_label := CASE p_rule
    WHEN 'publication_deadline' THEN 'le délai pour déclarer une séance'
    WHEN 'min_duration'         THEN 'la durée minimum d''une séance'
    WHEN 'vote_deadline'        THEN 'le délai de vote'
    ELSE NULL
  END;
  IF v_label IS NULL THEN RAISE EXCEPTION 'UNKNOWN_RULE'; END IF;

  SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'GROUP_NOT_FOUND'; END IF;

  -- Une demande par règle et par joueur sur 7 jours.
  IF EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.type = 'rule_change_request'
      AND n.created_at > NOW() - INTERVAL '7 days'
      AND n.data ->> 'group_id' = p_group_id::text
      AND n.data ->> 'requester_id' = v_uid::text
      AND n.data ->> 'rule' = p_rule
  ) THEN
    RETURN FALSE;
  END IF;

  SELECT COALESCE(first_name, username, 'Un membre') INTO v_name
    FROM public.users WHERE id = v_uid;

  FOR v_admin IN
    SELECT user_id FROM public.group_members
     WHERE group_id = p_group_id AND role = 'admin' AND left_at IS NULL
       AND user_id <> v_uid
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_admin.user_id,
      'rule_change_request',
      'Une règle à revoir ?',
      v_name || ' aimerait que tu revoies ' || v_label || ' dans « ' || v_group.name || ' ».',
      jsonb_build_object(
        'group_id',   p_group_id,
        'group_name', v_group.name,
        'rule',       p_rule,
        'requester_id',   v_uid,
        'requester_name', v_name
      )
    );
    v_sent := TRUE;
  END LOOP;

  RETURN v_sent;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_rule_change(UUID, TEXT) TO authenticated;
