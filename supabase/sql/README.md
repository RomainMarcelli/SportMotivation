# SQL à exécuter manuellement dans Supabase

Ce dossier contient les scripts SQL à exécuter dans **Supabase Dashboard → SQL Editor → New query → Run**.

⚠ Ces fichiers sont **versionnés Git** (contrairement à `work-log/`) car ils documentent l'évolution du schéma DB. Exécute-les dans l'ordre numérique.

| Fichier | Description | Statut |
|---|---|---|
| `001_fix_pot_trigger_security_definer.sql` | Corrige le trigger de création de cagnotte (RLS) | ✅ exécuté |
| `002_join_group_rpcs.sql` | RPC pour rejoindre un groupe par code | ✅ exécuté |
| `003_per_member_penalty.sql` | Pénalité par membre + enums notif + RPC join avec pénalité | ⏳ à exécuter |
| `004_invitations.sql` | Invitations par pseudo + recherche users + accept | ⏳ à exécuter (après 003) |
| `005_penalty_changes.sql` | Demandes de changement de pénalité (admin→membre) | ⏳ à exécuter (après 003) |
| `006_sessions.sql` | RPC declare_session + RLS sessions/preuves + bucket `session-proofs` | ⏳ à exécuter |
| `007_fix_join_group_function.sql` | Correctif : recrée join_group_by_code + reload cache PostgREST | ⏳ à exécuter si erreur "schema cache" |
| `008_fix_penalty_column.sql` | Correctif : colonne penalty_amount + valeurs d'enum (à exécuter SEUL) | ⏳ à exécuter |
| `009_delete_group.sql` | RPC delete_group (admin) | ⏳ à exécuter |
| `010_fix_rule_acceptances_rls.sql` | Correctif RLS : autorise l'upsert d'acceptation des règles | ⏳ à exécuter |
| `011_fix_group_read_rls.sql` | Correctif RLS : un membre peut lire son groupe + ses adhésions | ⏳ à exécuter |
| `012_group_read_rpcs.sql` | RPC de lecture (get_my_groups / get_group_dashboard / get_group_members) — **requis** | ⏳ à exécuter |

**Ordre impératif** : 003 avant 004 et 005 (à cause des valeurs d'enum ajoutées). 006 indépendant, à exécuter après les autres.

Quand un fichier est exécuté, note-le ici (ou dis-le moi et je mets à jour le statut).
