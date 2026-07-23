-- ============================================================================
-- 033 — « X a quitté le groupe » + vérification du pseudo
-- ============================================================================
-- À exécuter APRÈS 031_delete_account.sql.
--
-- 1. Nouveau type de notification `member_left` : jusqu'ici, quand quelqu'un
--    quittait un groupe ou supprimait son compte, les autres membres le
--    découvraient en constatant qu'il avait disparu de la liste.
-- 2. `is_username_available()` : permet d'annoncer « ce pseudo est déjà pris »
--    AVANT de tenter la création du compte, au lieu de traduire à l'aveugle une
--    violation de contrainte unique.
-- ============================================================================

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'member_left';

-- ⚠ Une valeur d'enum fraîchement ajoutée n'est pas utilisable dans la MÊME
-- transaction que son ALTER TYPE. Les fonctions ci-dessous ne la référencent que
-- dans leur CORPS (résolu à l'exécution), donc le script passe d'un bloc — mais
-- si Supabase refuse, exécute la ligne ci-dessus SEULE puis relance le reste.

-- 1. Helper : prévenir tous les membres actifs qu'un joueur s'en va -----------
CREATE OR REPLACE FUNCTION public.notify_member_left(
  p_group_id UUID,
  p_user_id  UUID,
  p_deleted  BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name       TEXT;
  v_group_name TEXT;
  v_body       TEXT;
  v_remaining  INT;
BEGIN
  SELECT COALESCE(NULLIF(first_name, ''), NULLIF(username, ''), 'Un membre')
    INTO v_name FROM public.users WHERE id = p_user_id;
  SELECT name INTO v_group_name FROM public.groups WHERE id = p_group_id;
  IF v_group_name IS NULL THEN RETURN; END IF;

  -- Le nombre de votants change : on le rappelle, c'est ce qui impacte les autres.
  SELECT count(*) INTO v_remaining
  FROM public.group_members
  WHERE group_id = p_group_id AND left_at IS NULL AND user_id <> p_user_id;

  v_body := CASE
    WHEN p_deleted THEN
      COALESCE(v_name, 'Un membre') || ' a supprimé son compte : il ne fait plus partie de « '
        || v_group_name || ' ». Ses séances ont été retirées du groupe.'
    ELSE
      COALESCE(v_name, 'Un membre') || ' a quitté « ' || v_group_name || ' ».'
  END
  || ' Vous êtes maintenant ' || v_remaining || CASE WHEN v_remaining > 1 THEN ' membres.' ELSE ' membre.' END
  || ' La majorité requise pour les votes est mise à jour.';

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT gm.user_id,
         'member_left',
         CASE WHEN p_deleted THEN 'Un membre a supprimé son compte' ELSE 'Un membre a quitté le groupe' END,
         v_body,
         jsonb_build_object('group_id', p_group_id)
  FROM public.group_members gm
  WHERE gm.group_id = p_group_id
    AND gm.left_at IS NULL
    AND gm.user_id <> p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_member_left(UUID, UUID, BOOLEAN) FROM PUBLIC;

-- 2. `leave_group` prévient le groupe -----------------------------------------
CREATE OR REPLACE FUNCTION public.leave_group(p_group_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me         public.group_members%ROWTYPE;
  v_next_id    UUID;
  v_next_user  UUID;
  v_next_name  TEXT;
  v_group_name TEXT;
  v_leaver     TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT * INTO v_me FROM public.group_members
    WHERE group_id = p_group_id AND user_id = auth.uid() AND left_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_MEMBER'; END IF;

  IF v_me.role = 'admin' THEN
    SELECT gm.id, gm.user_id INTO v_next_id, v_next_user
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id AND gm.left_at IS NULL AND gm.user_id <> auth.uid()
    ORDER BY gm.joined_at ASC
    LIMIT 1;

    IF v_next_id IS NULL THEN RAISE EXCEPTION 'LAST_MEMBER'; END IF;

    UPDATE public.group_members SET role = 'admin' WHERE id = v_next_id;

    SELECT COALESCE(NULLIF(first_name, ''), NULLIF(username, ''), 'Un membre')
      INTO v_next_name FROM public.users WHERE id = v_next_user;
    SELECT COALESCE(NULLIF(first_name, ''), NULLIF(username, ''), 'L''ancien admin')
      INTO v_leaver FROM public.users WHERE id = auth.uid();
    SELECT name INTO v_group_name FROM public.groups WHERE id = p_group_id;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_next_user,
      'admin_transferred',
      'Tu es le nouvel admin',
      v_leaver || ' a quitté « ' || v_group_name ||
        ' » : tu deviens administrateur du groupe. Tu peux modifier les règles et inviter des membres.',
      jsonb_build_object('group_id', p_group_id)
    );
  END IF;

  -- Prévenir AVANT de sortir : la requête cible les membres encore actifs, et on
  -- ne veut évidemment pas se notifier soi-même de son propre départ.
  PERFORM public.notify_member_left(p_group_id, auth.uid(), FALSE);

  UPDATE public.group_members
    SET left_at = now(), role = 'member'
    WHERE id = v_me.id;

  -- L'effectif a changé → certains scrutins deviennent tranchables.
  PERFORM public.resolve_group_pending_votes(p_group_id);

  RETURN v_next_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_group(UUID) TO authenticated;

-- 3. La suppression de compte prévient chaque groupe --------------------------
-- On se contente d'insérer l'appel au bon endroit : juste après la passation
-- d'admin, tant que la ligne `public.users` existe encore (on a besoin du prénom).
CREATE OR REPLACE FUNCTION public.delete_account_internal(
  p_user_id     UUID,
  p_delete_auth BOOLEAN DEFAULT TRUE
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       UUID := p_user_id;
  v_keep      BOOLEAN;
  v_group     RECORD;
  v_next_id   UUID;
  v_next_user UUID;
  v_orphans   UUID[] := ARRAY[]::UUID[];
  v_touched   UUID[] := ARRAY[]::UUID[];
  v_gid       UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT
    EXISTS (SELECT 1 FROM public.pot_transactions WHERE user_id = v_uid)
    OR EXISTS (SELECT 1 FROM public.penalties     WHERE user_id = v_uid)
  INTO v_keep;

  FOR v_group IN
    SELECT gm.group_id, gm.role
    FROM public.group_members gm
    WHERE gm.user_id = v_uid AND gm.left_at IS NULL
  LOOP
    v_touched := v_touched || v_group.group_id;

    SELECT gm.id, gm.user_id INTO v_next_id, v_next_user
    FROM public.group_members gm
    WHERE gm.group_id = v_group.group_id
      AND gm.left_at IS NULL
      AND gm.user_id <> v_uid
    ORDER BY gm.joined_at ASC
    LIMIT 1;

    IF v_next_id IS NULL THEN
      v_orphans := v_orphans || v_group.group_id;
    ELSE
      -- Prévient les membres restants (avant toute suppression : on a besoin du
      -- prénom, et la liste des destinataires doit encore contenir tout le monde).
      PERFORM public.notify_member_left(v_group.group_id, v_uid, TRUE);

      IF v_group.role = 'admin' THEN
        UPDATE public.group_members SET role = 'admin' WHERE id = v_next_id;

        INSERT INTO public.notifications (user_id, type, title, body, data)
        SELECT v_next_user, 'admin_transferred',
               'Tu es le nouvel admin',
               'L''admin de « ' || g.name ||
                 ' » a supprimé son compte : tu prends la main sur le groupe.',
               jsonb_build_object('group_id', v_group.group_id)
        FROM public.groups g WHERE g.id = v_group.group_id;
      END IF;

      UPDATE public.groups
        SET created_by = v_next_user
        WHERE id = v_group.group_id AND created_by = v_uid;
    END IF;
  END LOOP;

  IF v_keep THEN
    UPDATE public.users
      SET first_name      = 'Compte',
          last_name       = 'supprimé',
          username        = NULL,
          avatar_url      = NULL,
          avatar_color    = NULL,
          avatar_icon     = NULL,
          expo_push_token = NULL,
          email           = 'deleted_' || v_uid || '@deleted.invalid',
          updated_at      = now()
      WHERE id = v_uid;

    UPDATE public.group_members
      SET left_at = now(), role = 'member'
      WHERE user_id = v_uid AND left_at IS NULL;

    DELETE FROM public.notifications WHERE user_id = v_uid;

    IF p_delete_auth THEN
      UPDATE auth.users
        SET email        = 'deleted_' || v_uid || '@deleted.invalid',
            banned_until = now() + interval '100 years',
            raw_user_meta_data =
              COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"deleted": true}'::jsonb
        WHERE id = v_uid;
      DELETE FROM auth.sessions WHERE user_id = v_uid;
    END IF;

  ELSE
    DELETE FROM public.votes
      WHERE voter_id = v_uid
         OR session_id IN (SELECT id FROM public.sessions WHERE user_id = v_uid)
         OR excuse_id  IN (SELECT id FROM public.excuses  WHERE user_id = v_uid);

    DELETE FROM public.blames
      WHERE user_id = v_uid
         OR session_id IN (SELECT id FROM public.sessions WHERE user_id = v_uid);

    UPDATE public.pot_transactions SET marked_by = NULL WHERE marked_by = v_uid;

    DELETE FROM public.session_proofs
      WHERE session_id IN (SELECT id FROM public.sessions WHERE user_id = v_uid);
    DELETE FROM public.sessions             WHERE user_id = v_uid;
    DELETE FROM public.excuses              WHERE user_id = v_uid;
    DELETE FROM public.jokers               WHERE user_id = v_uid;
    DELETE FROM public.weekly_plans         WHERE user_id = v_uid;
    DELETE FROM public.rule_acceptances     WHERE user_id = v_uid;
    DELETE FROM public.notifications        WHERE user_id = v_uid;
    DELETE FROM public.group_invitations    WHERE invited_user_id = v_uid OR invited_by = v_uid;
    DELETE FROM public.member_penalty_changes
      WHERE requested_by = v_uid
         OR group_member_id IN (SELECT id FROM public.group_members WHERE user_id = v_uid);
    DELETE FROM public.group_members        WHERE user_id = v_uid;

    FOREACH v_gid IN ARRAY v_orphans LOOP
      DELETE FROM public.groups WHERE id = v_gid;
    END LOOP;
    v_touched := ARRAY(SELECT unnest(v_touched) EXCEPT SELECT unnest(v_orphans));

    DELETE FROM public.users WHERE id = v_uid;

    IF p_delete_auth THEN
      DELETE FROM auth.users WHERE id = v_uid;
    END IF;
  END IF;

  FOREACH v_gid IN ARRAY v_touched LOOP
    PERFORM public.resolve_group_pending_votes(v_gid);
  END LOOP;

  RETURN CASE WHEN v_keep THEN 'anonymized' ELSE 'deleted' END;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_account_internal(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_account_internal(UUID, BOOLEAN) TO service_role;

-- 4. Disponibilité d'un pseudo ------------------------------------------------
-- Contourne la RLS de `users` (on ne veut pas exposer la table pour autant : la
-- fonction ne renvoie qu'un booléen). Insensible à la casse, comme la contrainte.
CREATE OR REPLACE FUNCTION public.is_username_available(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE lower(username) = lower(btrim(p_username))
      AND id IS DISTINCT FROM auth.uid()   -- garder SON pseudo reste possible
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_username_available(TEXT) TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
