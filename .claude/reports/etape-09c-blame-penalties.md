# Étape 9c — Blâmes : création au refus + pénalité au seuil

Complète l'**alimentation de la cagnotte** : après les séances manquées (clôture 047), voici la 2ᵉ
source de pénalités — les **blâmes** (§6). Backend uniquement (SQL). Aucun code TS modifié → le vert
précédent tient (`tsc` ✅, 502 tests). Aucun commit.

---

## ⚠️ SQL à exécuter — après 047

| Fichier | Rôle |
|---|---|
| [048_blame_penalties.sql](../../supabase/sql/048_blame_penalties.sql) | Blâme au refus + pénalité au seuil (trigger sur `sessions`). Idempotent. |

**Test manuel** : faire **rejeter 3 séances** d'un même membre (seuil par défaut) → une pénalité
`blame_threshold` apparaît dans la cagnotte, et les blâmes du membre repassent à zéro.

---

## Le problème résolu

`cast_vote` (018) résolvait le scrutin mais laissait un **TODO** : quand une séance passait à `rejected`,
**aucun blâme n'était créé**. Tout le système de blâmes était dormant (table + vue présentes, jamais
alimentées → les pastilles « Blâmes » du dashboard ne s'affichaient jamais).

## Le mécanisme (§6)

Un **trigger** sur `sessions` (statut → `rejected`) appelle `apply_blame_on_rejection` :

1. **1 blâme par séance rejetée** (idempotent, un seul par séance). Jamais pour une **expiration /
   absence de vote** (on vérifie `status = 'rejected'`, pas `expired`).
2. **Seuil atteint** (`groups.blame_threshold`, 3 par défaut) → **1 pénalité** `blame_threshold`
   (montant = pénalité du membre) + **reset du compteur** (les blâmes comptés passent `settled = TRUE`).
3. La pénalité **alimente la cagnotte** (réconciliation `pot_transactions` + recalcul du total) et
   **notifie** le membre (`penalty_applied` → ouvre la Cagnotte).

**Pourquoi un trigger plutôt que réécrire `cast_vote`** : il capte **toutes** les voies de refus (le vote
aujourd'hui, une future résolution automatique à l'échéance) sans reproduire la fonction, et reste
explicite dans la migration.

## Robustesse (mêmes garde-fous que 047)

- **Blâme idempotent** : un seul par séance (`NOT EXISTS session_id`).
- **Pénalité une seule fois par seuil** : les blâmes comptés sont marqués `settled` → le compteur
  repart de zéro (cumul honnête sur le défi, sans re-pénaliser les mêmes blâmes).
- **Pot sûr avec/sans trigger de base** : réconciliation par `related_penalty_id` + recalcul du total
  (jamais de double comptage).

## Effet de bord (positif, sans code)

Les **pastilles « Blâmes »** du dashboard (`v_member_unsettled_blames`) et l'entrée **« Blâme atteint »**
de l'historique cagnotte **s'affichent enfin** — l'UI existait, il lui manquait juste les données.

## À noter / suites

- **Alimentation de la cagnotte = complète** : séances manquées (047) + blâmes (048). Reste, côté
  « argent » : le **déblocage** en fin de défi (`pots.status`/`unlocked_at`) → écran **Clôture (Étape 12)**.
- **Backfill** volontairement non fait : les séances déjà `rejected` avant 048 ne reçoivent pas de blâme
  rétroactif (éviter des pénalités surprises). Forward-only.
- **Résolution à l'échéance** (séances sans assez de votes au deadline → validées par défaut, §5) : cron
  encore à écrire ; le trigger de blâme est déjà prêt à en capter les éventuels refus.
