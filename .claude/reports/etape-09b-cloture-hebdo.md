# Étape 9b — Clôture hebdomadaire (génération des pénalités)

C'est la brique qui **remplit la cagnotte** : chaque lundi, on transforme les séances manquées de la
semaine écoulée en pénalités. `npx tsc --noEmit` ✅. Aucun commit, aucune commande git.

Pas de nouveau code TS (hors 1 ligne de navigation notif) : c'est **du backend** (SQL + cron).

---

## ⚠️ SQL à exécuter — après 046

| Fichier | Rôle |
|---|---|
| [047_weekly_closure.sql](../../supabase/sql/047_weekly_closure.sql) | Clôture hebdo `run_weekly_closure()` + cron `pg_cron`. **Nécessite `pg_cron`** (déjà créé en 045). Idempotent. |

**Test manuel immédiat** (sans attendre lundi) :
```sql
SELECT public.run_weekly_closure(p_force := true);                        -- semaine écoulée
SELECT public.run_weekly_closure(p_week_start := '2026-07-13', p_force := true); -- une semaine précise
```
> Ça ne crée des pénalités **que si** des membres ont réellement manqué des séances cette semaine-là.

---

## Règle métier implémentée (§9 + §7 + §8)

Pour chaque **groupe actif**, pour la **semaine écoulée** comprise dans la période du défi, et pour
chaque membre actif :

1. **Objectif effectif** selon les excuses acceptées de la semaine :
   - Excuse **majeure** → semaine **annulée**, aucune pénalité.
   - Excuse **standard** → objectif **−1**.
2. **Séances validées** de la semaine comptées.
3. **Manquées** = `max(0, objectif − validées)`.
4. **Joker** du mois non consommé → annule **1** manquée, puis marqué `consumed_at` (ne se re-déclenche
   pas les semaines suivantes).
5. **1 pénalité par manquée** (montant = pénalité **du membre**) → table `penalties`, puis alimente le
   pot ; **notification `penalty_applied`** au membre (ouvre la Cagnotte au tap).

## Robustesse (les 3 pièges anticipés)

- **Idempotent** : une semaine n'est clôturée qu'une fois par groupe (nouvelle table `weekly_closures`,
  PK `(group_id, week_start)`). Rejouable sans risque (retry cron, test manuel répété).
- **Sûr même si un trigger de base `penalties → pot_transactions` existe** : on ne crée une transaction
  que pour une pénalité **qui n'en a pas déjà une** (réconciliation par `related_penalty_id`), puis on
  **recalcule** `pots.total_amount` depuis la somme des transactions. → marche **avec ou sans** trigger,
  **jamais de double comptage** (je ne pouvais pas voir le schéma de base, d'où cette précaution).
- **Robuste au changement d'heure** : le cron tourne en UTC (`0 * * * 0,1`), mais la fonction ne fait le
  travail qu'un **lundi en heure de Paris** ; l'idempotence couvre les exécutions horaires en trop.

## Modifs

- **SQL** : [047_weekly_closure.sql](../../supabase/sql/047_weekly_closure.sql) — table `weekly_closures`,
  colonne `jokers.consumed_at`, fonction `run_weekly_closure(p_week_start, p_force)`, cron `weekly-closure`.
- **App** : [notifications.tsx](../../app/notifications.tsx) — la notif `penalty_applied` ouvre désormais
  la **Cagnotte** du groupe (au lieu du dashboard).

## À noter / suites

- **Pénalités de blâme** (§6 : au seuil de blâmes → pénalité `blame_threshold`) : **pas encore générées**.
  Les blâmes existent (table + vue) mais rien ne crée la pénalité au seuil. À brancher (à la résolution
  du vote **ou** dans cette clôture) — l'écran Cagnotte les affiche déjà si elles existent.
- **Déblocage de la cagnotte** en fin de défi (`pots.status`/`unlocked_at`) : écran **Clôture** (Étape 12).
- **Rappels de séances planifiées** : distinct du rappel week-end (045), non fait.
