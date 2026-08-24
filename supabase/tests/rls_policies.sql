-- ============================================================================
-- DIAGNOSTIC CIBLÉ — policies RLS (le vrai rempart) + vues + storage + fonctions
-- ============================================================================
-- LECTURE SEULE. Suite de `rls_posture.sql` : on a confirmé que la RLS est ON sur
-- toutes les tables et que les grants anon/authenticated sont larges (normal
-- Supabase). Donc CE QUI COMPTE = le contenu des POLICIES. Cette requête les
-- remonte EN PREMIER (grants retirés → sortie bien plus courte, copiable d'un bloc).
--
-- À exécuter dans le SQL editor → copie-moi tout le résultat. Si c'est encore
-- tronqué, colle-moi au moins toutes les lignes `3_policy` (les plus importantes).
--
-- Ce que je vais regarder en priorité :
--   • `users`      : le SELECT doit être restreint (pas `USING (true)` → sinon email
--                    + expo_push_token lisibles par tous).
--   • `group_members` : PAS de policy UPDATE ouverte (sinon auto-promotion admin).
--   • `blames`/`penalties`/`pots`/`pot_transactions` : SELECT filtré « membre du groupe ».
--   • `notifications` : SELECT = `user_id = auth.uid()` ; pas d'INSERT ouvert.
--   • `votes`/`sessions` : pas d'INSERT/UPDATE direct (doivent passer par RPC).
--   • vues `v_member_*` : `INVOKER_ok` (sinon contournent la RLS).
-- ============================================================================

WITH d AS (
  -- 3) POLICIES (public) — cmd, rôles, filtre USING, filtre WITH CHECK -----------
  SELECT '3_policy'::text AS categorie,
         (p.tablename || '.' || p.policyname)::text AS objet,
         p.cmd::text AS cmd,
         array_to_string(p.roles, ',')::text AS roles,
         left(COALESCE(p.qual,       '(aucun USING)'),      300)::text AS using_expr,
         left(COALESCE(p.with_check, '(aucun WITH CHECK)'), 300)::text AS check_expr,
         1 AS sort1, p.tablename::text AS sort2
  FROM pg_policies p
  WHERE p.schemaname = 'public'

  UNION ALL
  -- 5) VUES : security_invoker (sinon la vue contourne la RLS des tables sources)
  SELECT '5_views', c.relname::text, 'view',
         CASE WHEN c.reloptions @> ARRAY['security_invoker=true'] THEN 'INVOKER_ok'
              ELSE 'DEFINER(!) — contourne RLS' END,
         array_to_string(c.reloptions, ','), '', 2, c.relname::text
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'v'

  UNION ALL
  -- 6) POLICIES STORAGE (buckets avatars / preuves / justificatifs) --------------
  SELECT '6_storage', (p.tablename || '.' || p.policyname)::text, p.cmd::text,
         array_to_string(p.roles, ',')::text,
         left(COALESCE(p.qual,'(aucun USING)'),200)::text,
         left(COALESCE(p.with_check,'(aucun WITH CHECK)'),200)::text,
         3, p.policyname::text
  FROM pg_policies p
  WHERE p.schemaname = 'storage'

  UNION ALL
  -- 4) FONCTIONS SECURITY DEFINER + qui peut les EXÉCUTER (PUBLIC = tout le monde)
  --    En dernier (le plus volumineux) : si tronqué, on perd le moins important.
  SELECT '4_secdef', p.proname::text, 'DEFINER',
         COALESCE(array_to_string(p.proacl,' | '), 'PUBLIC(default)')::text,
         COALESCE(array_to_string(p.proconfig,','), '(pas de search_path !)')::text,
         '', 4, p.proname::text
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prosecdef
)
SELECT categorie, objet, cmd, roles, using_expr, check_expr
FROM d
ORDER BY sort1, sort2, objet;
