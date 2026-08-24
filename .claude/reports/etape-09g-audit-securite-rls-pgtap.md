# Étape 9g — Audit sécurité : sweep RLS + socle pgTAP

> Demande Romain : « fais le 1 (sweep RLS complet) et le 2 (socle pgTAP) ». Objectif : ne plus se fier
> à une revue à l'œil, mais à des invariants testables + une photo réelle de la posture RLS.

## Méthode & livrables
- **Sweep statique** : lecture de toutes les policies/`ENABLE RLS`/`SECURITY DEFINER` des migrations `001→056`
  + prédicats (`is_group_member`/`is_group_admin` = `SECURITY DEFINER STABLE` sur `group_members`/`auth.uid()`).
- **Limite structurelle** : les fichiers sont des migrations **incrémentales** sur un schéma de base créé au
  dashboard. La RLS de plusieurs tables sensibles n'est **pas** dans le code → il faut la **vérité terrain**.
- **Livrables** :
  1. [`supabase/tests/rls_posture.sql`](../../supabase/tests/rls_posture.sql) — diagnostic **lecture seule**
     (RLS on/off + grants anon/authenticated + policies + fonctions SECDEF + vues). Un run → une table à me coller.
  2. [`supabase/tests/security_abuse.test.sql`](../../supabase/tests/security_abuse.test.sql) — **27 tests pgTAP**
     rejouant les abus (encadré `BEGIN … ROLLBACK`, zéro effet de bord).
  3. Ce rapport.

## Ce qui est CONFIRMÉ bon (policies visibles dans le code)
| Table | Lecture | Écriture |
|---|---|---|
| `groups` | membre **ou** créateur | via RPC (pas de policy directe) |
| `group_members` | soi **ou** membre du groupe | via RPC (pas de policy directe) — **UPDATE à vérifier** ⚠ |
| `sessions` | membre | DELETE auteur si `pending_vote` ; INSERT/UPDATE via RPC |
| `session_proofs` | membre | INSERT auteur |
| `votes` | membre (séance **et** excuse) | **aucune policy INSERT** → `cast_vote` seul ✅ (anti-bourrage) |
| `excuses`, `jokers`, `member_penalty_changes`, `activity_proposals`, `activity_proposal_votes` | membre | RPC |
| `suspensions` | membre | RPC (052) ✅ |
| `session_day_grants` | soi **ou** admin | RPC |
| `rule_acceptances` | soi | soi |
| `notifications` | *(SELECT non visible dans les fichiers)* | DELETE own |
| `group_invitations` | invité **ou** membre | UPDATE invité — **sans `WITH CHECK`** ⚠ |

- **Storage** : `session-proofs` (upload/dossier `{uid}`, lecture groupe), `excuse-justifications` (idem),
  `avatars` (**lecture publique** — par design, à confirmer). ✅
- **RPC SECURITY DEFINER** : toutes re-vérifient l'autorisation (`is_group_admin`/`is_group_member`/`auth.uid()`),
  `SET search_path=public` partout, pas de SQL dynamique. ✅ (cf. audit 09e + correctif **056**).

## ⚠ À TRANCHER via le diagnostic (non déterminable depuis le code)
Ces tables **n'ont aucune policy dans les fichiers** ; leur RLS a été posée (ou non) au dashboard. Le pire cas
(`RLS_OFF` **+** grant SELECT à `authenticated`) = **fuite inter-groupes de toute la table**.

1. 🔴 **`blames`** — la RLS est laissée **commentée** en [050](../../supabase/sql/050_security_invoker_views.sql)
   (« à décommenter si les pastilles disparaissent »). La vue `v_member_unsettled_blames` est passée en
   `security_invoker` → elle s'appuie sur la RLS de `blames`. **Si `blames` est `RLS_OFF`, un étranger lit les
   blâmes de tous les groupes.** → tests **T18**.
2. 🔴 **`penalties`, `pots`, `pot_transactions`** — données **financières**. Même risque. → tests **T19/T20/T21**.
3. 🟠 **`users`** — contient `email` **et `expo_push_token`** (PII + spoof de push). La RLS doit exister et
   restreindre le SELECT (le RPC `search_users_by_username` « contourne la RLS users », ce qui *suggère* qu'elle
   est active, mais à confirmer). 
4. 🟠 **`weekly_plans`** — plans hebdo par membre ; RLS à confirmer.
5. 🟠 **`group_members` UPDATE** — s'il existe une policy UPDATE permissive (self-update), un membre pourrait
   **se promouvoir `admin`**. → test **T25**.
6. 🟡 **`notifications` SELECT/INSERT** — SELECT doit être `user_id = auth.uid()` ; **pas** de policy INSERT
   ouverte (sinon spoof de notif). À confirmer.
7. 🟡 **`groups` UPDATE/INSERT** — l'édition d'un défi doit passer par RPC/admin, pas par une policy ouverte.
8. 🟡 **`group_invitations` UPDATE** sans `WITH CHECK` (004) : l'invité peut réécrire sa ligne d'invitation.
   Faible (le join réel passe par RPC), mais à resserrer (`FOR UPDATE … WITH CHECK (invited_user_id = auth.uid())`).

## Correctifs recommandés (à préparer une fois le diagnostic reçu)
- **Si `blames`/`penalties`/`pots`/`pot_transactions` sont `RLS_OFF`** → activer la RLS + policy SELECT
  « membre du groupe » (le filet de 050 est déjà écrit pour `blames`). Écritures : déjà en `SECURITY DEFINER`,
  donc non impactées.
- **Si `group_members` a une policy UPDATE self** → la restreindre (ne jamais laisser modifier `role`/`penalty_amount`
  côté client ; ces changements passent par `transfer_admin`/`set_my_penalty`).
- Resserrer le `WITH CHECK` de `group_invitations` UPDATE.
- Le tout dans un **`057_harden_rls.sql`** que j'écrirai selon la sortie du diagnostic (je ne devine pas l'état réel).

## Les 27 tests pgTAP (ce qu'ils verrouillent)
- **Suspension / anti-triche** : non-admin ne suspend pas (T1/T2), admin oui (T3), `is_suspended` borné (T4/T5),
  **une demande PENDING n'exonère pas** (T6), motif requis (T8), seul l'admin tranche (T9/T10), acceptation → exonération (T11).
- **Éligibilité vote** : non-membre (T12), auteur (T13), **arrivé après publication** (T14) refusés ; membre éligible OK (T15).
- **Isolation RLS lecture** : un étranger voit **0** séance/suspension/**blâme/pénalité/cagnotte/transaction**/vote du groupe (T16–T22) ;
  un membre voit bien son groupe (T23/T24).
- **Escalade** : un membre ne peut pas s'auto-promouvoir admin (T25).
- **Verrou cron 056** : `resolve_pending_votes`/`apply_session_blames` non appelables par `authenticated` (T26/T27).

> ⚠ **Je n'ai pas pu exécuter le pgTAP** (pas d'accès à la base ; l'exécution SQL est ton rôle). La logique est la
> spec. Au 1er run, un *seed* peut échouer sur un décalage de colonne/contrainte → colle-moi l'erreur, j'ajuste vite.
> Les tests **T18–T21** et **T25** peuvent passer au **rouge** : ce ne sont pas des bugs de test, ce sont les
> **failles réelles** que le sweep soupçonne — dans ce cas j'écris `057_harden_rls.sql`.

## RÉSULTATS du diagnostic (base réelle) — findings confirmés
Diagnostic exécuté (`rls_posture.sql` + `rls_policies.sql`). Bilan :

**✅ Bon (confirmé)** : RLS **ON sur les 22 tables** ; policies de **lecture** correctes partout
(`blames`/`penalties`/`pots`/`pot_transactions` = `is_group_member` ; `users` = self **+ groupmate**,
pas world ; `notifications` = self, aucune INSERT ; vues `v_member_*` = `security_invoker` ✅ ;
storage scoping OK). La plupart des RPC ont `search_path` + se gardent via `auth.uid()`.

**🔴 CRITIQUE — `delete_account_internal` appelable par `anon`/`authenticated`.** SECURITY DEFINER,
supprime/anonymise le compte passé en **paramètre** sans contrôle d'appelant (réservé service_role
par design). Le `REVOKE … FROM PUBLIC` de 031 ne retire PAS les grants que Supabase ajoute
automatiquement à anon/authenticated → **suppression de n'importe quel compte par UUID avec la clé
anon publique**. → **fix `056` (réécrit)** : `REVOKE … FROM PUBLIC, anon, authenticated`.

**🔴 HAUT — auto-validation de séance.** `sessions_update_owner` (+ `sessions_insert_self`) laissaient
un auteur passer SA séance en `validated` en écriture directe → contournement total du vote anti-triche.
Client n'écrit jamais `sessions` en direct (RPC `declare_session`). → **fix `057`** : DROP des 2 policies.

**🔴 HAUT — bourrage/altération de votes.** `votes_insert_self`/`votes_update_self` : voter sa propre
séance, voter en étant inéligible, changer son vote après coup. → **fix `057`** : DROP.

**🔴 HAUT — `group_members` : adhésion/élévation.** `group_members_insert_self` (WITH CHECK =
`user_id = auth.uid()` seul) → **s'insérer admin dans n'importe quel groupe** ;
`group_members_update_self_or_admin` (pas de WITH CHECK) → **se promouvoir admin** via UPDATE de sa
ligne. → **fix `057`** : INSERT resserré au **créateur** (`is_group_creator`), trigger
`guard_group_members_role` (seul un admin/backend change un `role`). Création & gestion admin préservées.

**🟠 MOYEN — fonctions internes/cron exposées.** `resolve_pending_votes`, `apply_session_blames`,
`resolve_group_pending_votes`, `run_weekly_closure`, `complete_expired_challenges`,
`send_weekly_reminders`, `notify_member_*`, `notify_session_declared`, `is_suspended`,
`session_effective_deadline` → toutes `anon=X | authenticated=X`. → **fix `056`** (même REVOKE).

**🟠 MOYEN — `search_path` manquant** sur `is_group_admin` (prédicat utilisé dans quasi toutes les
policies !) et `handle_new_user` → risque de hijack SECDEF. → **fix `057`** : `ALTER … SET search_path`.

**🟡 FAIBLE (à arbitrer, non corrigé)** : un membre peut baisser **sa propre** `penalty_amount` /
`weekly_target` par UPDATE direct (le trigger 057 ne borne que `role`, pour ne pas casser `set_my_penalty`).
`group_invitations` UPDATE sans `WITH CHECK`. À trancher selon l'intention métier.

## Correctifs livrés
- **`supabase/sql/056_harden_cron_grants.sql`** (réécrit) — verrou des fonctions internes (PUBLIC+anon+authenticated).
- **`supabase/sql/057_harden_rls.sql`** (nouveau) — DROP policies d'écriture permissives + INSERT group_members
  resserré + trigger anti-élévation + `search_path` figé.
- **pgTAP** enrichi : T28 (auto-validation), T29 (vote direct), T30 (adhésion admin), **T31 (CRITIQUE delete_account_internal)**.

## STATUT : ✅ VALIDÉ sur la base réelle — **32/32 pgTAP au vert**
Lot `052`(corrigé enum)→`057` exécuté par Romain ; `security_abuse.test.sql` → **TOUS OK ✅** (T1→T32),
y compris le test critique **T31** (`delete_account_internal` verrouillé) et **T32** (mise figée après join).

### Corrections en cours de route
- `052` : bug d'insertion notif dans `decide_suspension` (CASE → `text` sur une colonne enum) → cast
  `::public.notification_type` (cf. 024). Aurait aussi cassé « admin accepte/refuse une suspension » dans l'app.
- `057` : le 1er jet révoquait au niveau **colonne** (sans effet car `authenticated` a l'UPDATE **table**) →
  corrigé en `REVOKE UPDATE ON group_members` + `GRANT UPDATE (role, left_at)`.

### Reste (optionnel, à trancher)
- `group_invitations` UPDATE sans `WITH CHECK` (mineur) — je resserre si tu veux.
- Tester **côté app** les flux durcis (créer un groupe, changer un rôle, quitter, accepter/refuser une suspension).
