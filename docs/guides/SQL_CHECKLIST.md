# Checklist SQL — Sport Motiv

> À suivre dans Supabase Dashboard → **SQL Editor** → New query → coller le contenu du fichier → **Run**.
> Coche au fur et à mesure. Les fichiers sont dans `supabase/sql/`.

## Ordre d'exécution recommandé

Exécute dans l'ordre numérique **001 → 014**. Quelques fichiers sont des **correctifs** (007, 008, 010, 011) nés du débogage : ils sont idempotents, sans risque à ré-exécuter.

> 💡 **Astuce diagnostic** : mets `EXPO_PUBLIC_ENABLE_DEBUG_LOGS=true` dans `.env`. L'app loguera alors le **code + message Supabase** exact en cas d'erreur (ex. « Could not find the function… » = un fichier SQL manquant).

## Tableau récapitulatif

| # | Fichier | Rôle | Indispensable ? | Coché |
|---|---|---|---|---|
| 001 | `001_fix_pot_trigger_security_definer.sql` | Trigger création cagnotte en SECURITY DEFINER | Oui | ☐ |
| 002 | `002_join_group_rpcs.sql` | Aperçu groupe par code (`get_group_preview_by_code`) | Oui | ☐ |
| 003 | `003_per_member_penalty.sql` | Colonne pénalité/membre + enums notif + join | Oui (⚠ voir 008) | ☐ |
| 004 | `004_invitations.sql` | Invitations par pseudo (table + RPC) | Oui | ☐ |
| 005 | `005_penalty_changes.sql` | Demandes de changement de pénalité | Oui | ☐ |
| 006 | `006_sessions.sql` | Déclaration de séance + RLS + bucket `session-proofs` | Oui (Phase 3) | ☐ |
| 007 | `007_fix_join_group_function.sql` | Recrée `join_group_by_code` + reload cache | Correctif | ☐ |
| 008 | `008_fix_penalty_column.sql` | **Colonne `penalty_amount` + enums (à exécuter SEUL)** | **Oui — corrige le blocage join** | ☐ |
| 009 | `009_delete_group.sql` | RPC `delete_group` (admin) | Oui | ☐ |
| 010 | `010_fix_rule_acceptances_rls.sql` | RLS upsert acceptation des règles | Correctif | ☐ |
| 011 | `011_fix_group_read_rls.sql` | RLS lecture groupe/adhésions par les membres | Correctif | ☐ |
| 012 | `012_group_read_rpcs.sql` | **RPC de lecture des groupes** (`get_my_groups`…) | **Oui — affichage des groupes** | ☐ |
| 013 | `013_group_invitations_admin.sql` | Liste/annulation des invitations (admin) | Oui (Ajout) | ☐ |
| 014 | `014_notifications_delete.sql` | Suppression de notifications (RLS delete) | Oui (Ajout) | ☐ |

> ⚠ **003 vs 008** : 003 contient des `ALTER TYPE … ADD VALUE` qui peuvent faire échouer tout le script s'ils sont exécutés avec le reste (la colonne `penalty_amount` n'est alors jamais créée). Si tu as eu l'erreur « column penalty_amount does not exist », exécute **008 seul** : il rattrape la colonne + les enums.

## Comment vérifier que tout est en place

Colle ces requêtes dans le SQL Editor pour comparer avec l'attendu.

### 1. La colonne pénalité existe ?
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'group_members' AND column_name = 'penalty_amount';
-- Doit retourner 1 ligne.
```

### 2. Les fonctions RPC attendues existent ?
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_my_groups', 'get_group_dashboard', 'get_group_members',
    'join_group_by_code', 'declare_session', 'delete_group',
    'get_group_invitations', 'cancel_invitation',
    'invite_user_to_group', 'accept_invitation',
    'propose_penalty_change', 'respond_penalty_change',
    'search_users_by_username', 'is_group_member', 'is_group_admin'
  )
ORDER BY routine_name;
-- Compare la liste : toutes doivent apparaître.
```

### 3. Les valeurs d'enum de notification existent ?
```sql
SELECT enumlabel FROM pg_enum
WHERE enumtypid = 'notification_type'::regtype
ORDER BY enumsortorder;
-- Doit inclure 'group_invitation' et 'penalty_change_request'.
```

### 4. Les policies RLS clés sont là ?
```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('groups', 'group_members', 'rule_acceptances', 'sessions', 'session_proofs', 'notifications')
ORDER BY tablename, policyname;
```

### 5. Le bucket de preuves existe ?
```sql
SELECT id, public FROM storage.buckets WHERE id = 'session-proofs';
-- Doit retourner 1 ligne, public = false.
```

### 6. Lister TOUTES les fonctions et policies du schéma public (vue d'ensemble)
```sql
-- Fonctions
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' ORDER BY routine_name;

-- Policies
SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname = 'public' ORDER BY tablename, policyname;
```

## Edge Functions (hors SQL, à déployer via le Dashboard)

| Fonction | Secrets requis | Guide |
|---|---|---|
| `strava-token` | `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` | `docs/guides/STRAVA_SETUP.md` |
| `delete-account` | Aucun (fournis automatiquement) | `docs/guides/ACCOUNT_DELETION.md` |

## Si « rejoindre un groupe » échoue encore

1. Active `EXPO_PUBLIC_ENABLE_DEBUG_LOGS=true`, regarde la console : le message dira quelle RPC/colonne manque.
2. « column penalty_amount does not exist » → exécute **008**.
3. « Could not find the function … » → exécute **007** (join) et/ou **012** (lecture).
4. « violates row-level security policy » sur `rule_acceptances` → exécute **010**.
5. Rejoint mais « impossible de charger le groupe » → exécute **011** puis **012**.
