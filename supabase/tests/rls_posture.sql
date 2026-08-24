-- ============================================================================
-- DIAGNOSTIC RLS / GRANTS — vérité terrain (LECTURE SEULE, aucun effet de bord)
-- ============================================================================
-- POURQUOI : les fichiers `supabase/sql/001→056` sont des migrations INCRÉMENTALES
-- posées sur un schéma de base créé au dashboard. Plusieurs tables sensibles
-- (`blames`, `penalties`, `pots`, `pot_transactions`, `users`, `weekly_plans`)
-- n'ont AUCUNE policy dans les fichiers → leur posture RLS réelle est inconnue
-- depuis le code seul. Cette requête la révèle.
--
-- COMMENT : à coller dans le SQL editor Supabase et exécuter. 100 % SELECT, ne
-- modifie rien. L'éditeur n'affiche QUE le dernier résultat → tout est fusionné
-- en UNE table (colonne `categorie`). Copie-colle le résultat complet dans le
-- chat, j'audite la sortie ligne par ligne.
--
-- LECTURE RAPIDE des lignes qui doivent t'alerter :
--   • `1_rls_state` avec `RLS_OFF` sur une table qui contient des données de
--     groupe (surtout blames/penalties/pots/pot_transactions/weekly_plans) →
--     🔴 si `2_grants` montre un SELECT à `anon`/`authenticated` pour la même
--     table, alors N'IMPORTE QUEL utilisateur lit TOUTES les lignes (fuite
--     inter-groupes). RLS_OFF n'est acceptable QUE si aucun grant anon/auth.
--   • `3_policy` : une `qual` = `true` (ou vide) sur un SELECT ouvert à
--     `authenticated` = lecture non filtrée. Attendu : chaque policy filtre par
--     `is_group_member(...)` ou `user_id = auth.uid()`.
--   • `4_secdef` : `PUBLIC(default)` en col. `execute_acl` sur une fonction
--     interne/cron = appelable par tout le monde via PostgREST (cf. correctif 056).
--   • `5_views` : `DEFINER(!)` = la vue contourne la RLS (fuite potentielle).
-- ============================================================================

WITH diag AS (
  -- 1) RLS activée / forcée par table -----------------------------------------
  SELECT '1_rls_state' AS categorie,
         c.relname::text AS objet,
         CASE WHEN c.relrowsecurity      THEN 'RLS_ON'  ELSE 'RLS_OFF'     END AS col_a,
         CASE WHEN c.relforcerowsecurity THEN 'FORCED'  ELSE 'not_forced' END AS col_b,
         ''::text AS col_c,
         ''::text AS col_d
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'

  UNION ALL
  -- 2) Privilèges de table accordés à anon / authenticated --------------------
  --    (le danger quand RLS_OFF : un SELECT ici = lecture de toute la table)
  SELECT '2_grants',
         g.table_name::text,
         g.grantee::text,
         g.privilege_type::text,
         '', ''
  FROM information_schema.role_table_grants g
  WHERE g.table_schema = 'public'
    AND g.grantee IN ('anon', 'authenticated')

  UNION ALL
  -- 3) Toutes les policies RLS (public) : commande, rôles, filtres ------------
  SELECT '3_policy',
         (p.tablename || '.' || p.policyname)::text,
         p.cmd::text,
         array_to_string(p.roles, ',')::text,
         left(COALESCE(p.qual, '(aucun USING)'), 200)::text,
         left(COALESCE(p.with_check, '(aucun WITH CHECK)'), 200)::text
  FROM pg_policies p
  WHERE p.schemaname = 'public'

  UNION ALL
  -- 4) Fonctions SECURITY DEFINER + qui peut les EXÉCUTER --------------------
  SELECT '4_secdef',
         p.proname::text,
         'DEFINER',
         COALESCE(array_to_string(p.proconfig, ','), '(pas de search_path !)')::text,
         COALESCE(array_to_string(p.proacl, ' | '), 'PUBLIC(default = tout le monde)')::text,
         ''
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prosecdef

  UNION ALL
  -- 5) Vues : security_invoker (sinon la vue contourne la RLS) ----------------
  SELECT '5_views',
         c.relname::text,
         CASE WHEN c.reloptions @> ARRAY['security_invoker=true']
              THEN 'INVOKER_ok' ELSE 'DEFINER(!) — contourne RLS' END,
         array_to_string(c.reloptions, ','),
         '', ''
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'v'

  UNION ALL
  -- 6) Policies de stockage (buckets : avatars, preuves, justificatifs) -------
  SELECT '6_storage_policy',
         (p.tablename || '.' || p.policyname)::text,
         p.cmd::text,
         array_to_string(p.roles, ',')::text,
         left(COALESCE(p.qual, '(aucun USING)'), 160)::text,
         left(COALESCE(p.with_check, '(aucun WITH CHECK)'), 160)::text
  FROM pg_policies p
  WHERE p.schemaname = 'storage'
)
SELECT * FROM diag
ORDER BY categorie, objet;
