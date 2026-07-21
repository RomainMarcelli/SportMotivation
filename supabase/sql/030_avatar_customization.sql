-- ============================================================================
-- 030 — Personnalisation de l'avatar (couleur, icône, avatar généré) + stats profil
-- ============================================================================
-- À exécuter APRÈS 028_upsert_my_profile.sql.
--
-- Un avatar peut désormais prendre 3 formes, par ordre de priorité d'affichage :
--   1. `avatar_url`  → photo uploadée par l'utilisateur OU avatar généré (DiceBear)
--   2. `avatar_icon` → nom d'une icône lucide (ex. « dumbbell ») posée sur la couleur
--   3. (aucun)       → initiales posées sur la couleur
-- `avatar_color` est TOUJOURS pris en compte comme fond des cas 2 et 3.
--
-- Contenu :
--   1. Colonnes `avatar_color` / `avatar_icon`
--   2. `upsert_my_profile` v2 (nouveaux champs + effacement explicite de la photo)
--   3. Les RPC de lecture renvoient les nouveaux champs (membres, invitations, recherche)
--   4. `get_my_profile_stats()` et `get_my_profile_groups()` pour l'écran Profil
-- ============================================================================

-- 1. Colonnes ----------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_color TEXT,
  ADD COLUMN IF NOT EXISTS avatar_icon  TEXT;

COMMENT ON COLUMN public.users.avatar_color IS
  'Couleur de fond de la bulle d''avatar (#RRGGBB) quand il n''y a pas de photo.';
COMMENT ON COLUMN public.users.avatar_icon IS
  'Nom d''icône lucide affichée à la place des initiales (ex. « dumbbell »). NULL = initiales.';

-- 2. upsert_my_profile v2 -----------------------------------------------------
-- ⚠ On DROP l'ancienne signature : deux fonctions homonymes à arité différente
-- rendraient l'appel PostgREST ambigu.
DROP FUNCTION IF EXISTS public.upsert_my_profile(TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.upsert_my_profile(
  p_first_name   TEXT    DEFAULT NULL,
  p_last_name    TEXT    DEFAULT NULL,
  p_username     TEXT    DEFAULT NULL,
  p_avatar_url   TEXT    DEFAULT NULL,
  p_avatar_color TEXT    DEFAULT NULL,
  p_avatar_icon  TEXT    DEFAULT NULL,
  -- Passer une valeur NULL ne veut pas dire « efface » (sinon toute mise à jour
  -- partielle écraserait le reste). Ces drapeaux disent explicitement « efface ».
  p_clear_avatar_url  BOOLEAN DEFAULT FALSE,
  p_clear_avatar_icon BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_email TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  INSERT INTO public.users (
    id, email, first_name, last_name, username, avatar_url, avatar_color, avatar_icon
  )
  VALUES (
    v_uid,
    COALESCE(v_email, ''),
    NULLIF(btrim(p_first_name), ''),
    NULLIF(btrim(p_last_name), ''),
    NULLIF(btrim(p_username), ''),
    CASE WHEN p_clear_avatar_url  THEN NULL ELSE NULLIF(btrim(p_avatar_url), '')   END,
    NULLIF(btrim(p_avatar_color), ''),
    CASE WHEN p_clear_avatar_icon THEN NULL ELSE NULLIF(btrim(p_avatar_icon), '')  END
  )
  ON CONFLICT (id) DO UPDATE SET
    -- COALESCE : on n'écrase que si une nouvelle valeur est fournie.
    first_name   = COALESCE(EXCLUDED.first_name,   public.users.first_name),
    last_name    = COALESCE(EXCLUDED.last_name,    public.users.last_name),
    username     = COALESCE(EXCLUDED.username,     public.users.username),
    avatar_color = COALESCE(EXCLUDED.avatar_color, public.users.avatar_color),
    avatar_url   = CASE WHEN p_clear_avatar_url  THEN NULL
                        ELSE COALESCE(EXCLUDED.avatar_url,  public.users.avatar_url)  END,
    avatar_icon  = CASE WHEN p_clear_avatar_icon THEN NULL
                        ELSE COALESCE(EXCLUDED.avatar_icon, public.users.avatar_icon) END,
    updated_at   = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_my_profile(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN
) TO authenticated;

-- 3. Les lectures renvoient l'avatar complet ---------------------------------
-- (changer le RETURNS TABLE impose un DROP préalable)

DROP FUNCTION IF EXISTS public.get_group_members(UUID);
CREATE FUNCTION public.get_group_members(p_group_id UUID)
RETURNS TABLE (
  id UUID,
  role member_role,
  weekly_target INTEGER,
  target_locked BOOLEAN,
  penalty_amount NUMERIC,
  joined_at TIMESTAMPTZ,
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  avatar_url TEXT,
  avatar_color TEXT,
  avatar_icon TEXT
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT gm.id, gm.role, gm.weekly_target, gm.target_locked, gm.penalty_amount,
         gm.joined_at, u.id, u.first_name, u.last_name, u.username,
         u.avatar_url, u.avatar_color, u.avatar_icon
  FROM public.group_members gm
  JOIN public.users u ON u.id = gm.user_id
  WHERE gm.group_id = p_group_id
    AND gm.left_at IS NULL
    AND public.is_group_member(p_group_id)
  ORDER BY gm.joined_at ASC;
$$;

DROP FUNCTION IF EXISTS public.get_group_invitations(UUID);
CREATE FUNCTION public.get_group_invitations(p_group_id UUID)
RETURNS TABLE (
  id UUID,
  status TEXT,
  created_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  invited_user_id UUID,
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
  SELECT gi.id, gi.status, gi.created_at, gi.resolved_at,
         gi.invited_user_id, u.username, u.first_name, u.last_name,
         u.avatar_url, u.avatar_color, u.avatar_icon
  FROM public.group_invitations gi
  JOIN public.users u ON u.id = gi.invited_user_id
  WHERE gi.group_id = p_group_id
    AND public.is_group_admin(p_group_id)
  ORDER BY
    CASE gi.status WHEN 'pending' THEN 0 WHEN 'accepted' THEN 1 ELSE 2 END,
    gi.created_at DESC;
$$;

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
  ORDER BY username
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.get_group_members(UUID)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_group_invitations(UUID)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_users_by_username(TEXT) TO authenticated;

-- 4. Données de l'écran Profil ------------------------------------------------

-- 4.a Statistiques personnelles, tous groupes confondus.
CREATE OR REPLACE FUNCTION public.get_my_profile_stats()
RETURNS TABLE (
  sessions_done   INTEGER,  -- séances validées
  streak_weeks    INTEGER,  -- semaines consécutives avec ≥ 1 séance validée
  target_rate     INTEGER,  -- % de semaines où l'objectif hebdo a été atteint
  penalties_paid  NUMERIC,  -- € réellement versés à une cagnotte
  groups_count    INTEGER
)
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_week   DATE := (date_trunc('week', (NOW() AT TIME ZONE 'Europe/Paris')::date::timestamp))::date;
  v_streak INTEGER := 0;
  v_cursor DATE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT count(*)::int INTO sessions_done
  FROM public.sessions
  WHERE user_id = v_uid AND status = 'validated';

  -- Série : on remonte semaine par semaine tant qu'il y a au moins une séance
  -- validée. On tolère que la semaine EN COURS soit encore vide (elle n'est pas
  -- finie) : dans ce cas la série démarre à la semaine précédente.
  v_cursor := v_week;
  IF NOT EXISTS (
    SELECT 1 FROM public.sessions
    WHERE user_id = v_uid AND status = 'validated' AND week_start = v_cursor
  ) THEN
    v_cursor := v_cursor - 7;
  END IF;

  WHILE EXISTS (
    SELECT 1 FROM public.sessions
    WHERE user_id = v_uid AND status = 'validated' AND week_start = v_cursor
  ) LOOP
    v_streak := v_streak + 1;
    v_cursor := v_cursor - 7;
  END LOOP;
  streak_weeks := v_streak;

  -- Taux d'objectifs atteints : semaines (groupe × semaine) où validées ≥ objectif.
  SELECT COALESCE(
    round(
      100.0 * count(*) FILTER (WHERE w.validated_sessions >= w.weekly_target)
      / NULLIF(count(*), 0)
    )::int,
    0
  )
  INTO target_rate
  FROM public.v_member_weekly_status w
  WHERE w.user_id = v_uid
    AND w.week_start < v_week;  -- la semaine en cours n'est pas encore jugeable

  SELECT COALESCE(sum(amount), 0) INTO penalties_paid
  FROM public.pot_transactions
  WHERE user_id = v_uid AND is_paid;

  SELECT count(*)::int INTO groups_count
  FROM public.group_members
  WHERE user_id = v_uid AND left_at IS NULL;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_profile_stats() TO authenticated;

-- 4.b Mes groupes, format « carte » de l'écran Profil.
-- Fonction dédiée (plutôt qu'étendre `get_my_groups`) pour ne rien casser ailleurs.
CREATE OR REPLACE FUNCTION public.get_my_profile_groups()
RETURNS TABLE (
  group_id       UUID,
  name           TEXT,
  role           member_role,
  weekly_target  INTEGER,
  penalty_amount NUMERIC,
  pot_total      NUMERIC,
  members_count  INTEGER
)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT
    g.id,
    g.name,
    gm.role,
    gm.weekly_target,
    COALESCE(gm.penalty_amount, g.penalty_amount),
    COALESCE(p.total_amount, 0),
    (SELECT count(*)::int FROM public.group_members m
      WHERE m.group_id = g.id AND m.left_at IS NULL)
  FROM public.group_members gm
  JOIN public.groups g ON g.id = gm.group_id
  LEFT JOIN public.pots p ON p.group_id = g.id
  WHERE gm.user_id = auth.uid() AND gm.left_at IS NULL
  ORDER BY gm.joined_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_profile_groups() TO authenticated;

NOTIFY pgrst, 'reload schema';
