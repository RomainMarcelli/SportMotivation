-- ============================================================================
-- 059 — Fix : « column reference "user_id" is ambiguous » dans les RPC cagnotte
-- ============================================================================
-- À exécuter APRÈS 046 (idempotent, CREATE OR REPLACE). Corrige un bug PRÉSENT
-- depuis 046 : dans `get_group_cagnotte` et `get_pot_history`, le nom de colonne
-- de SORTIE `user_id` (RETURNS TABLE(user_id …)) entre en collision avec la colonne
-- `group_members.user_id` du GARDE de membre, écrit sans alias :
--
--   SELECT 1 FROM public.group_members
--   WHERE group_id = p_group_id AND user_id = auth.uid() AND left_at IS NULL
--                                  ^^^^^^^ ambigu (paramètre OUT vs colonne)
--
-- → PostgreSQL lève « column reference "user_id" is ambiguous » à CHAQUE appel, donc
--   l'écran Cagnotte tombait toujours sur « 0 € / Aucune pénalité » (ce n'était pas
--   un souci de fraîcheur client). On qualifie le garde avec l'alias `gm`.
--
-- Seul le garde change ; le corps des requêtes est identique à 046.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_group_cagnotte(p_group_id UUID)
RETURNS TABLE (
  user_id       UUID,
  first_name    TEXT,
  last_name     TEXT,
  username      TEXT,
  avatar_url    TEXT,
  avatar_color  TEXT,
  avatar_icon   TEXT,
  role          public.member_role,
  penalty_count BIGINT,
  total_amount  NUMERIC,
  paid_amount   NUMERIC,
  is_paid       BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  -- Garde qualifié (`gm.`) : sinon `user_id` est ambigu avec le paramètre OUT.
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = p_group_id AND gm.user_id = auth.uid() AND gm.left_at IS NULL
  ) THEN RAISE EXCEPTION 'NOT_MEMBER'; END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.first_name,
    u.last_name,
    u.username,
    u.avatar_url,
    u.avatar_color,
    u.avatar_icon,
    gm.role,
    count(t.id)                                        AS penalty_count,
    COALESCE(sum(t.amount), 0)                         AS total_amount,
    COALESCE(sum(t.amount) FILTER (WHERE t.is_paid), 0) AS paid_amount,
    (count(t.id) > 0 AND bool_and(t.is_paid))          AS is_paid
  FROM public.pot_transactions t
  JOIN public.pots p  ON p.id = t.pot_id AND p.group_id = p_group_id
  JOIN public.users u ON u.id = t.user_id
  LEFT JOIN public.group_members gm
    ON gm.group_id = p_group_id AND gm.user_id = t.user_id AND gm.left_at IS NULL
  WHERE t.transaction_type = 'penalty_added'
  GROUP BY u.id, u.first_name, u.last_name, u.username,
           u.avatar_url, u.avatar_color, u.avatar_icon, gm.role
  ORDER BY (count(t.id) > 0 AND bool_and(t.is_paid)),
           COALESCE(sum(t.amount), 0) DESC,
           u.first_name;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_group_cagnotte(UUID) TO authenticated;


CREATE OR REPLACE FUNCTION public.get_pot_history(p_group_id UUID)
RETURNS TABLE (
  id           UUID,
  user_id      UUID,
  first_name   TEXT,
  username     TEXT,
  penalty_type public.penalty_type,
  amount       NUMERIC,
  week_start   DATE,
  created_at   TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  -- Garde qualifié (`gm.`) : sinon `user_id` est ambigu avec le paramètre OUT.
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = p_group_id AND gm.user_id = auth.uid() AND gm.left_at IS NULL
  ) THEN RAISE EXCEPTION 'NOT_MEMBER'; END IF;

  RETURN QUERY
  SELECT pen.id, pen.user_id, u.first_name, u.username,
         pen.penalty_type, pen.amount, pen.week_start, pen.created_at
  FROM public.penalties pen
  JOIN public.users u ON u.id = pen.user_id
  WHERE pen.group_id = p_group_id
  ORDER BY pen.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_pot_history(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
