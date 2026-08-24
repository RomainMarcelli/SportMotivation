-- ============================================================================
-- 057 — Durcissement RLS : fermer les policies d'écriture trop permissives
-- ============================================================================
-- À exécuter APRÈS 056. Idempotent.
--
-- CONTEXTE (audit 9g, sortie de `rls_policies` sur la base réelle) : la RLS est
-- active partout et les policies de LECTURE sont correctes (chaque table filtre
-- par `is_group_member`/`user_id = auth.uid()`). MAIS plusieurs policies d'ÉCRITURE
-- directe doublonnent les RPC `SECURITY DEFINER` en IGNORANT leurs règles métier
-- (anti-fraude, éligibilité, gouvernance). Comme le client n'écrit PAS ces tables
-- en direct (vérifié : sessions/votes/excuses passent uniquement par declare_session
-- / cast_vote / submit_excuse), on peut retirer ces policies sans rien casser.
--
-- Ce que ça ferme :
--   • sessions : un auteur pouvait passer SA séance en 'validated' (UPDATE direct)
--     ou l'INSÉRER déjà validée → auto-validation, contournement du vote anti-triche.
--   • votes    : un membre pouvait INSÉRER un vote en direct (voter sa propre séance,
--     voter une séance pour laquelle il est inéligible) ou MODIFIER son vote après coup.
--   • excuses  : un membre pouvait INSÉRER une excuse déjà 'accepted' → auto-exonération.
--   • group_members : (1) s'INSÉRER admin dans N'IMPORTE quel groupe ; (2) se
--     promouvoir admin via UPDATE de sa propre ligne.
--
-- ⚠ Les écritures LÉGITIMES conservées (vérifiées côté client) :
--   • création de groupe : l'auteur s'insère admin dans LE groupe qu'il vient de créer ;
--   • un ADMIN change le rôle d'un membre / exclut un membre (left_at) ;
--   • un membre quitte (left_at).
-- ============================================================================

-- 1. SESSIONS — l'écriture passe par `declare_session` (SECURITY DEFINER). --------
--    On retire l'INSERT direct (statut arbitraire) et l'UPDATE direct (auto-validation).
--    On GARDE `sessions_select_*` (lecture membre) et `sessions_delete_author`
--    (retirer sa propre séance encore en attente = geste légitime, sans risque).
DROP POLICY IF EXISTS sessions_insert_self  ON public.sessions;
DROP POLICY IF EXISTS sessions_update_owner ON public.sessions;

-- 2. VOTES — l'écriture passe par `cast_vote` (éligibilité + anti-auto-vote). ------
DROP POLICY IF EXISTS votes_insert_self ON public.votes;
DROP POLICY IF EXISTS votes_update_self ON public.votes;

-- 3. EXCUSES — l'écriture passe par `submit_excuse` (statut 'pending_vote' imposé). -
DROP POLICY IF EXISTS excuses_insert_self ON public.excuses;

-- 4. GROUP_MEMBERS — resserrer l'INSERT direct au SEUL cas légitime : le créateur
--    s'ajoute dans le groupe qu'il vient de créer. Toute AUTRE adhésion passe par
--    `join_group_by_code` / `accept_invitation` (SECURITY DEFINER, hors RLS).
--    Helper SECURITY DEFINER (évite toute récursion RLS dans la policy).
CREATE OR REPLACE FUNCTION public.is_group_creator(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = p_group_id AND g.created_by = auth.uid()
  );
$$;

DROP POLICY IF EXISTS group_members_insert_self ON public.group_members;
CREATE POLICY group_members_insert_self ON public.group_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_group_creator(group_id));

-- 5. GROUP_MEMBERS — bloquer l'auto-promotion admin (la policy UPDATE laisse un
--    membre modifier SA ligne, or la RLS ne peut pas comparer OLD/NEW). Un trigger
--    le fait : seul un ADMIN (ou un contexte backend sans JWT : Edge/service_role,
--    RPC de transfert) peut CHANGER un `role`. Un non-admin gardant son rôle inchangé
--    (quitter = left_at) n'est pas gêné.
CREATE OR REPLACE FUNCTION public.guard_group_members_role()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() IS NOT NULL                    -- NULL = backend/service_role (RLS bloque déjà l'anon direct)
     AND NOT public.is_group_admin(NEW.group_id)   -- un admin peut changer les rôles
  THEN
    RAISE EXCEPTION 'ONLY_ADMIN_CHANGES_ROLE';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_group_members_guard_role ON public.group_members;
CREATE TRIGGER trg_group_members_guard_role
  BEFORE UPDATE ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.guard_group_members_role();

-- 5bis. MISE / OBJECTIF figés APRÈS l'adhésion (règle Romain : « il choisit au
--    moment de rejoindre, puis il ne change plus »).
--    ⚠ Un `REVOKE UPDATE (colonnes)` est SANS EFFET si le rôle a déjà l'UPDATE au
--    niveau TABLE (cas de `authenticated` chez Supabase) : un privilège de table
--    n'est pas entamé par un revoke de colonne. Il faut donc RETIRER l'UPDATE table
--    puis ne re-GRANTer QUE les colonnes que le client écrit vraiment en direct.
--    Vérifié côté client : seuls `role` (changement par l'admin) et `left_at`
--    (départ/exclusion) sont modifiés directement. Tout le reste
--    (penalty_amount / weekly_target / target_locked / group_id / user_id / joined_at)
--    ne passe plus que par les RPC SECURITY DEFINER (propriétaire → non bornés par
--    les grants de colonne), donc figé après l'adhésion.
REVOKE UPDATE ON public.group_members FROM anon, authenticated;
GRANT  UPDATE (role, left_at) ON public.group_members TO authenticated;

-- 6. SEARCH_PATH manquant sur 2 fonctions SECURITY DEFINER (risque de hijack) -----
--    `is_group_admin` est un prédicat de sécurité utilisé dans QUASI TOUTES les
--    policies → search_path figé obligatoire. `handle_new_user` s'exécute au signup.
--    ALTER ... SET (pas de réécriture du corps). Boucle regprocedure = robuste aux signatures.
DO $sp$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('is_group_admin', 'handle_new_user')
      AND p.proconfig IS NULL                      -- seulement celles qui n'ont pas déjà un search_path
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.sig);
    RAISE NOTICE 'search_path figé sur : %', r.sig;
  END LOOP;
END
$sp$;

NOTIFY pgrst, 'reload schema';
