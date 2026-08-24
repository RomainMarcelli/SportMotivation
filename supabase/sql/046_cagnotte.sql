-- ============================================================================
-- 046 — Cagnotte (vue trésorier) : détail par membre, historique, règlement
-- ============================================================================
-- À exécuter APRÈS 045. Idempotent (CREATE OR REPLACE + ADD VALUE IF NOT EXISTS).
--
-- V1 : le « trésorier » = l'ADMIN du groupe. Le rôle enum `treasurer` existe déjà
-- mais n'est pas encore assigné → on autorise `admin` OU `treasurer` partout, pour
-- rester compatible le jour où un trésorier dédié sera nommé (aucune refonte).
--
-- Modèle de données (déjà en place) :
--   • pot_transactions (transaction_type = 'penalty_added') = les DETTES des membres
--     is_paid / marked_by / paid_at = suivi de règlement (le trésorier coche)
--   • penalties = registre des pénalités (type séance manquée / blâme, semaine)
--   • pots = agrégat (total_amount, status, unlocked_at)
--
-- ⚠ Si Supabase refuse le script avec « unsafe use of new value of enum type »,
--   exécute d'abord SEULE la ligne `ALTER TYPE … ADD VALUE …`, puis relance le reste.
-- ============================================================================

-- 0. Nouveau type de notification pour la relance des retardataires -----------
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'payment_reminder';


-- 1. Détail de la cagnotte par membre ----------------------------------------
-- Une ligne par membre AYANT au moins une pénalité (dette), avec son profil, le
-- montant dû / réglé et le nombre de pénalités. Réservé aux membres du groupe.
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
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = auth.uid() AND left_at IS NULL
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
    -- « réglé » = a des pénalités ET toutes sont cochées payées.
    (count(t.id) > 0 AND bool_and(t.is_paid))          AS is_paid
  FROM public.pot_transactions t
  JOIN public.pots p  ON p.id = t.pot_id AND p.group_id = p_group_id
  JOIN public.users u ON u.id = t.user_id
  -- LEFT JOIN : un membre PARTI garde ses dettes dans la cagnotte (cf. règle 10),
  -- son rôle devient alors NULL — on l'affiche quand même.
  LEFT JOIN public.group_members gm
    ON gm.group_id = p_group_id AND gm.user_id = t.user_id AND gm.left_at IS NULL
  WHERE t.transaction_type = 'penalty_added'
  GROUP BY u.id, u.first_name, u.last_name, u.username,
           u.avatar_url, u.avatar_color, u.avatar_icon, gm.role
  ORDER BY (count(t.id) > 0 AND bool_and(t.is_paid)),  -- non réglés d'abord
           COALESCE(sum(t.amount), 0) DESC,
           u.first_name;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_group_cagnotte(UUID) TO authenticated;


-- 2. Historique des pénalités -------------------------------------------------
-- Toutes les pénalités du groupe (séances manquées + blâmes), les plus récentes
-- d'abord. Réservé aux membres. Le regroupement par semaine se fait côté client.
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
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = auth.uid() AND left_at IS NULL
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


-- 3. Le trésorier coche / décoche le règlement d'un membre --------------------
-- Passe TOUTES les dettes du membre (penalty_added) à payé / non payé, en gardant
-- QUI a coché (marked_by) et QUAND (paid_at). Réservé admin / trésorier.
-- Renvoie le nombre de transactions mises à jour.
CREATE OR REPLACE FUNCTION public.settle_member_pot(
  p_group_id UUID,
  p_user_id  UUID,
  p_paid     BOOLEAN
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.member_role;
  v_pot  UUID;
  v_n    INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT role INTO v_role FROM public.group_members
    WHERE group_id = p_group_id AND user_id = auth.uid() AND left_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_MEMBER'; END IF;
  IF v_role NOT IN ('admin', 'treasurer') THEN RAISE EXCEPTION 'NOT_TREASURER'; END IF;

  SELECT id INTO v_pot FROM public.pots WHERE group_id = p_group_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_POT'; END IF;

  UPDATE public.pot_transactions
    SET is_paid   = p_paid,
        marked_by = CASE WHEN p_paid THEN auth.uid() ELSE NULL END,
        paid_at   = CASE WHEN p_paid THEN NOW()      ELSE NULL END
    WHERE pot_id = v_pot
      AND user_id = p_user_id
      AND transaction_type = 'penalty_added';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;
GRANT EXECUTE ON FUNCTION public.settle_member_pot(UUID, UUID, BOOLEAN) TO authenticated;


-- 4. Relancer les membres avec un solde en attente ---------------------------
-- Envoie une notification in-app à chaque membre ayant encore des dettes non
-- réglées. Réservé admin / trésorier. Renvoie le nombre de membres relancés.
CREATE OR REPLACE FUNCTION public.remind_unpaid_members(p_group_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role  public.member_role;
  v_name  TEXT;
  v_row   RECORD;
  v_count INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT role INTO v_role FROM public.group_members
    WHERE group_id = p_group_id AND user_id = auth.uid() AND left_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_MEMBER'; END IF;
  IF v_role NOT IN ('admin', 'treasurer') THEN RAISE EXCEPTION 'NOT_TREASURER'; END IF;

  SELECT name INTO v_name FROM public.groups WHERE id = p_group_id;

  FOR v_row IN
    SELECT t.user_id
    FROM public.pot_transactions t
    JOIN public.pots p ON p.id = t.pot_id AND p.group_id = p_group_id
    WHERE t.transaction_type = 'penalty_added' AND NOT t.is_paid
    GROUP BY t.user_id
    HAVING COALESCE(sum(t.amount), 0) > 0
  LOOP
    -- On ne se relance pas soi-même.
    IF v_row.user_id = auth.uid() THEN CONTINUE; END IF;
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_row.user_id,
      'payment_reminder',
      'Cagnotte à régler',
      'Il te reste un solde à régler pour la cagnotte de « ' || COALESCE(v_name, 'ton défi') || ' ».',
      jsonb_build_object('group_id', p_group_id)
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.remind_unpaid_members(UUID) TO authenticated;


NOTIFY pgrst, 'reload schema';
