-- ============================================================================
-- 049 — Fin de défi : déblocage de la cagnotte + passage automatique en « terminé »
-- ============================================================================
-- À exécuter APRÈS 048. Idempotent. Le cron nécessite `pg_cron` (déjà créé en 045).
--
-- Étape 12 (écrans `fin-defi` / `cloture`). Le bilan (podium, stats, contributions) est
-- calculé CÔTÉ CLIENT — aucune RPC de reporting ici. Le serveur ne gère que :
--   1. `unlock_pot`                 → l'action « Débloquer la cagnotte » (admin/trésorier).
--   2. `complete_expired_challenges`→ bascule `active → completed` quand l'échéance est passée.
--
-- Modèle : `pots.status` passe à 'unlocked' et `pots.unlocked_at` est horodaté. Le client lit
-- ces deux colonnes (`usePotStatus`) pour afficher la clôture.
--
-- Robustesse :
--   • `unlock_pot` IDEMPOTENT : rappelé sur une cagnotte déjà débloquée, il renvoie
--     simplement l'horodatage existant (aucun double effet).
--   • Contrôles serveur : membre du groupe, rôle admin/trésorier, défi réellement terminé.
--   • DST-safe : la complétion auto compare des DATES en heure de Paris (le cron tourne UTC).
-- ============================================================================

-- 1. Déblocage de la cagnotte -------------------------------------------------
-- Réservé à l'admin/trésorier, une fois le défi terminé. Renvoie l'horodatage de
-- déblocage (idempotent). Les erreurs sont des codes courts, mappés côté app.
CREATE OR REPLACE FUNCTION public.unlock_pot(p_group_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      UUID := auth.uid();
  v_role     TEXT;
  v_end      DATE;
  v_status   TEXT;
  v_today    DATE := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_pot_id   UUID;
  v_unlocked TIMESTAMPTZ;
BEGIN
  -- (a) Le demandeur doit être membre actif et admin/trésorier du groupe.
  SELECT gm.role INTO v_role
  FROM public.group_members gm
  WHERE gm.group_id = p_group_id AND gm.user_id = v_uid AND gm.left_at IS NULL;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_MEMBER'; END IF;
  IF v_role NOT IN ('admin', 'treasurer') THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;

  -- (b) Le défi doit être terminé (échéance atteinte, ou déjà clôturé/annulé).
  SELECT g.challenge_end, g.status INTO v_end, v_status
  FROM public.groups g WHERE g.id = p_group_id;

  IF NOT (v_end <= v_today OR v_status IN ('completed', 'cancelled')) THEN
    RAISE EXCEPTION 'CHALLENGE_NOT_ENDED';
  END IF;

  -- Cohérence : un défi actif dont l'échéance est atteinte devient « terminé ».
  IF v_status = 'active' AND v_end <= v_today THEN
    UPDATE public.groups SET status = 'completed' WHERE id = p_group_id;
  END IF;

  -- (c) La cagnotte du groupe.
  SELECT p.id, p.unlocked_at INTO v_pot_id, v_unlocked
  FROM public.pots p WHERE p.group_id = p_group_id;

  IF v_pot_id IS NULL THEN RAISE EXCEPTION 'NO_POT'; END IF;

  -- (d) Déjà débloquée → on renvoie l'horodatage existant (idempotent).
  IF v_unlocked IS NOT NULL THEN RETURN v_unlocked; END IF;

  UPDATE public.pots
  SET status = 'unlocked', unlocked_at = now(), updated_at = now()
  WHERE id = v_pot_id
  RETURNING unlocked_at INTO v_unlocked;

  RETURN v_unlocked;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unlock_pot(UUID) TO authenticated;


-- 2. Complétion automatique des défis échus -----------------------------------
-- Passe en 'completed' tout défi ACTIF dont l'échéance est STRICTEMENT dépassée
-- (on laisse le dernier jour « actif » ; l'auto-clôture se fait le lendemain).
-- Renvoie le nombre de défis clôturés.
CREATE OR REPLACE FUNCTION public.complete_expired_challenges()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_count INTEGER;
BEGIN
  UPDATE public.groups
  SET status = 'completed'
  WHERE status = 'active' AND challenge_end < v_today;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


-- 3. Planification quotidienne (heure UTC ; la fonction raisonne en date Paris) --
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $cron$
BEGIN
  PERFORM cron.unschedule('complete-challenges');
EXCEPTION WHEN OTHERS THEN NULL;  -- pas encore planifié : rien à faire
END
$cron$;

SELECT cron.schedule('complete-challenges', '30 2 * * *', $$ SELECT public.complete_expired_challenges(); $$);

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- Tests manuels
--   -- Clôturer les défis échus (exécutable directement en tant que postgres) :
--   SELECT public.complete_expired_challenges();
--
--   -- Débloquer une cagnotte : à faire DEPUIS L'APP (bouton « Débloquer »), car
--   -- `unlock_pot` s'appuie sur auth.uid() (l'admin connecté). En SQL brut,
--   -- auth.uid() vaut NULL → 'NOT_MEMBER' (comportement attendu).
-- ============================================================================
