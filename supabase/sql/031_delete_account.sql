-- ============================================================================
-- 031 — Suppression de compte : effacement RÉEL + recalcul du groupe
-- ============================================================================
-- À exécuter APRÈS 025_leave_group.sql.
--
-- Règle métier validée :
--   • Par défaut on SUPPRIME VRAIMENT tout (lignes `public.users` ET `auth.users`) :
--     plus de « Compte supprimé » fantôme dans les listes ni dans le Dashboard.
--   • SAUF si l'utilisateur est engagé financièrement (il a versé dans une cagnotte
--     ou il doit encore de l'argent) : dans ce cas on ANONYMISE, parce qu'effacer
--     ses transactions fausserait la cagnotte et les comptes des autres membres.
--
-- Dans les deux cas, le groupe est remis d'aplomb :
--   • transfert du rôle admin (et de `groups.created_by`) au membre actif le plus ancien ;
--   • suppression des groupes qui n'ont plus aucun membre ;
--   • RE-RÉSOLUTION des votes en cours : l'effectif ayant changé, la majorité requise
--     change aussi — un scrutin bloqué doit pouvoir se conclure immédiatement.
--
-- ⚠ Tout se fait dans UNE transaction : si la suppression du compte `auth` est
-- refusée (privilèges), l'ensemble est annulé — pas de demi-suppression.
-- ============================================================================

-- 1. Re-résolution des scrutins en cours d'un groupe --------------------------
-- Reprend EXACTEMENT la logique de `cast_vote` / `cast_excuse_vote` (018 / 022),
-- mais sans nouveau vote : on ne fait que recalculer le seuil avec l'effectif
-- courant. À appeler après tout départ / suppression de membre.
CREATE OR REPLACE FUNCTION public.resolve_group_pending_votes(p_group_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group     public.groups%ROWTYPE;
  v_session   public.sessions%ROWTYPE;
  v_excuse    public.excuses%ROWTYPE;
  v_yes       INT;
  v_no        INT;
  v_others    INT;
  v_threshold INT;
  v_deadline  TIMESTAMP;
  v_expired   BOOLEAN;
  v_status    public.session_status;
  v_estatus   public.excuse_status;
  v_resolved  INT := 0;
BEGIN
  SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- 1.a Séances -------------------------------------------------------------
  FOR v_session IN
    SELECT * FROM public.sessions
    WHERE group_id = p_group_id AND status = 'pending_vote'
  LOOP
    SELECT
      count(*) FILTER (WHERE vote_value),
      count(*) FILTER (WHERE NOT vote_value)
    INTO v_yes, v_no
    FROM public.votes WHERE session_id = v_session.id;

    SELECT count(*) INTO v_others
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.left_at IS NULL
      AND gm.user_id <> v_session.user_id;

    v_threshold := GREATEST(1, (v_others / 2) + 1);

    v_deadline := CASE v_group.vote_deadline
      WHEN 'end_of_week' THEN (v_session.week_start + 7)::timestamp
      ELSE ((v_session.published_at AT TIME ZONE 'Europe/Paris')::date + 1)::timestamp
    END;
    v_expired := (NOW() AT TIME ZONE 'Europe/Paris') >= v_deadline;

    v_status := 'pending_vote';
    IF v_yes >= v_threshold THEN
      v_status := 'validated';
    ELSIF v_no >= v_threshold THEN
      v_status := 'rejected';
    ELSIF (v_yes + v_no) >= v_others OR v_expired THEN
      IF v_yes = 0 AND v_no = 0 THEN
        v_status := 'expired';
      ELSE
        v_status := CASE WHEN v_yes >= v_no THEN 'validated' ELSE 'rejected' END;
      END IF;
    END IF;

    IF v_status <> 'pending_vote' THEN
      UPDATE public.sessions
        SET status = v_status, validated_at = now()
        WHERE id = v_session.id;
      v_resolved := v_resolved + 1;
      -- TODO Étape 9 : conséquences (cagnotte / blâme).
    END IF;
  END LOOP;

  -- 1.b Excuses -------------------------------------------------------------
  FOR v_excuse IN
    SELECT * FROM public.excuses
    WHERE group_id = p_group_id AND status = 'pending_vote'
  LOOP
    SELECT
      count(*) FILTER (WHERE vote_value),
      count(*) FILTER (WHERE NOT vote_value)
    INTO v_yes, v_no
    FROM public.votes WHERE excuse_id = v_excuse.id;

    SELECT count(*) INTO v_others
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.left_at IS NULL
      AND gm.user_id <> v_excuse.user_id;

    v_threshold := GREATEST(1, (v_others / 2) + 1);

    v_estatus := 'pending_vote';
    IF v_yes >= v_threshold THEN
      v_estatus := 'accepted';
    ELSIF v_no >= v_threshold THEN
      v_estatus := 'rejected';
    ELSIF (v_yes + v_no) >= v_others THEN
      v_estatus := CASE WHEN v_yes >= v_no THEN 'accepted' ELSE 'rejected' END;
    END IF;

    IF v_estatus <> 'pending_vote' THEN
      UPDATE public.excuses
        SET status = v_estatus, resolved_at = now()
        WHERE id = v_excuse.id;
      v_resolved := v_resolved + 1;
      -- TODO Étape 9 : conséquences (exemption de pénalité).
    END IF;
  END LOOP;

  RETURN v_resolved;
END;
$$;

-- Fonction interne : pas d'appel direct depuis l'app.
REVOKE ALL ON FUNCTION public.resolve_group_pending_votes(UUID) FROM PUBLIC;

-- 2. `leave_group` re-résout désormais les scrutins ---------------------------
-- Un membre qui part change la majorité requise ; sans ça, un vote pouvait rester
-- bloqué « en attente » alors que plus personne ne pouvait le faire basculer.
-- (Reprise intégrale de la version 026 + l'appel de re-résolution à la fin.)
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

  UPDATE public.group_members
    SET left_at = now(), role = 'member'
    WHERE id = v_me.id;

  -- L'effectif a changé → certains scrutins deviennent tranchables.
  PERFORM public.resolve_group_pending_votes(p_group_id);

  RETURN v_next_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_group(UUID) TO authenticated;

-- 3. Suppression du compte ----------------------------------------------------
-- Cœur partagé. `p_delete_auth = FALSE` laisse la ligne `auth.users` en place :
-- c'est le mode utilisé par l'Edge Function, qui la supprime ensuite elle-même
-- avec la `service_role` (utile si le rôle `postgres` n'a pas le droit d'écrire
-- dans le schéma `auth` sur ce projet).
CREATE OR REPLACE FUNCTION public.delete_account_internal(
  p_user_id     UUID,
  p_delete_auth BOOLEAN DEFAULT TRUE
)
RETURNS TEXT           -- 'deleted' (effacement réel) | 'anonymized'
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

  -- 3.a Engagement financier ? --------------------------------------------
  -- On ne peut pas effacer quelqu'un dont l'argent est dans une cagnotte (ou qui
  -- en doit) : les totaux des autres membres deviendraient faux.
  SELECT
    EXISTS (SELECT 1 FROM public.pot_transactions WHERE user_id = v_uid)
    OR EXISTS (SELECT 1 FROM public.penalties     WHERE user_id = v_uid)
  INTO v_keep;

  -- 3.b Passation dans chaque groupe où il est encore actif ----------------
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
      -- Dernier membre : le groupe n'a plus de raison d'exister.
      v_orphans := v_orphans || v_group.group_id;
    ELSE
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

      -- `groups.created_by` est NOT NULL : il doit pointer sur quelqu'un qui existe.
      UPDATE public.groups
        SET created_by = v_next_user
        WHERE id = v_group.group_id AND created_by = v_uid;
    END IF;
  END LOOP;

  IF v_keep THEN
    ---------------------------------------------------------------------------
    -- Anonymisation (argent engagé) : la ligne reste, l'identité disparaît.
    ---------------------------------------------------------------------------
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

    -- Bloque toute reconnexion et libère l'adresse e-mail.
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
    ---------------------------------------------------------------------------
    -- Effacement réel. Ordre explicite : on ne parie pas sur les ON DELETE.
    ---------------------------------------------------------------------------
    -- Ses votes d'abord : les dépouillements doivent être justes AVANT la
    -- re-résolution, et les votes des autres sur SES objets partent avec eux.
    DELETE FROM public.votes
      WHERE voter_id = v_uid
         OR session_id IN (SELECT id FROM public.sessions WHERE user_id = v_uid)
         OR excuse_id  IN (SELECT id FROM public.excuses  WHERE user_id = v_uid);

    DELETE FROM public.blames
      WHERE user_id = v_uid
         OR session_id IN (SELECT id FROM public.sessions WHERE user_id = v_uid);

    -- `marked_by` référence l'utilisateur sans lui appartenir : on le détache.
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

    -- Groupes vidés de tout membre → suppression en cascade (cf. 009).
    FOREACH v_gid IN ARRAY v_orphans LOOP
      DELETE FROM public.groups WHERE id = v_gid;
    END LOOP;
    v_touched := ARRAY(SELECT unnest(v_touched) EXCEPT SELECT unnest(v_orphans));

    DELETE FROM public.users WHERE id = v_uid;

    -- Enfin le compte d'authentification (cascade sur identities / sessions).
    -- Si les privilèges manquaient, TOUT ce qui précède serait annulé : on ne
    -- laisse jamais un compte à moitié supprimé.
    IF p_delete_auth THEN
      DELETE FROM auth.users WHERE id = v_uid;
    END IF;
  END IF;

  -- 3.c L'effectif a bougé → la majorité requise aussi.
  FOREACH v_gid IN ARRAY v_touched LOOP
    PERFORM public.resolve_group_pending_votes(v_gid);
  END LOOP;

  RETURN CASE WHEN v_keep THEN 'anonymized' ELSE 'deleted' END;
END;
$$;

-- Jamais appelable directement par un client : seule la `service_role`
-- (Edge Function) peut viser un autre utilisateur que soi.
REVOKE ALL ON FUNCTION public.delete_account_internal(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_account_internal(UUID, BOOLEAN) TO service_role;

-- Point d'entrée de l'app : on ne peut supprimer QUE son propre compte.
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  RETURN public.delete_account_internal(auth.uid(), TRUE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- BONUS (dev) — purge des comptes de test déjà anonymisés par l'ancienne version
-- ============================================================================
-- À exécuter À LA MAIN, une seule fois, pour nettoyer les « Compte supprimé »
-- accumulés avant ce script. Ne touche QUE des comptes sans engagement financier.
--
--   DO $$
--   DECLARE v_id UUID;
--   BEGIN
--     FOR v_id IN
--       SELECT id FROM public.users
--       WHERE first_name = 'Compte' AND last_name = 'supprimé'
--     LOOP
--       PERFORM public.delete_account_internal(v_id, TRUE);
--     END LOOP;
--   END $$;

