# Étape 9 — Cagnotte (vue trésorier)

Écran `sport-motiv-cagnotte.html` implémenté. `npx tsc --noEmit` ✅ · `jest` ✅. Aucun commit, aucune
commande git.

Deux décisions validées par Romain (AskUserQuestion) :
1. **Trésorier = l'admin** du groupe (V1). Le rôle enum `treasurer` existe déjà mais n'est pas assigné →
   le code autorise `admin` **ou** `treasurer` partout (prêt pour un trésorier dédié, sans refonte).
2. **Accès = la carte « Cagnotte » du dashboard devient cliquable** (« Détail → »).

---

## ⚠️ SQL à exécuter — après 045

| Fichier | Rôle |
|---|---|
| [046_cagnotte.sql](../../supabase/sql/046_cagnotte.sql) | RPC cagnotte + type de notif `payment_reminder`. Idempotent. |

Contenu : 4 RPC `SECURITY DEFINER` + 1 valeur d'enum.
- `get_group_cagnotte(group_id)` → détail par membre (montant dû/réglé, nb pénalités, statut), membres seulement.
- `get_pot_history(group_id)` → historique des pénalités (type, montant, semaine), membres seulement.
- `settle_member_pot(group_id, user_id, paid)` → **trésorier/admin** coche/décoche toutes les dettes d'un membre.
- `remind_unpaid_members(group_id)` → **trésorier/admin** notifie les membres avec un solde en attente.

> Si Supabase refuse (« unsafe use of new value of enum type »), exécuter d'abord SEULE la ligne
> `ALTER TYPE … ADD VALUE 'payment_reminder'`, puis relancer le reste.

---

## Écran [app/group/[id]/cagnotte.tsx](../../app/group/[id]/cagnotte.tsx)

Fidèle à la maquette, avec un état vide propre :

| Section | Détail |
|---|---|
| **Héro** | Montant total (count-up ambre), sous-titre, barre **réglé (menthe) / en attente (ambre)** (en `flex`, pas de `%` — typage `DimensionValue`), légende chiffrée. Puce « Trésorier · toi » si trésorier. |
| **Vue trésorier** | Toggle (admin seulement) → bascule les lignes membres en mode édition. |
| **Détail par membre** | Avatar, tags **Toi** / **Trésorier**, montant (barré si réglé), statut **Réglé**/**À régler** ; en mode trésorier : boutons **Marquer payé** / **Annuler** (spinner par ligne). |
| **Historique** | Pénalités **regroupées par semaine** (« Cette semaine », « Semaine dernière », « Il y a N semaines »), icône **Séance manquée** (coral) / **Blâme atteint** (ambre), + « Afficher tout ». |
| **Note** | Cagnotte virtuelle (règlement entre membres, déblocage fin de défi). |
| **Footer** | **« Relancer les retardataires (N) »** (trésorier) → notif `payment_reminder` ; « Tout est réglé » désactivé sinon. |
| **État vide** | « Aucune pénalité pour l'instant » — la cagnotte se remplit à la clôture hebdo. |

Lecture ouverte à **tous les membres** (transparence, comme les blâmes) ; toggle + boutons + relance
réservés au **trésorier**.

## Accès

La carte « Cagnotte du groupe » du **dashboard** ([index.tsx](../../app/group/[id]/index.tsx)) est
désormais un `Pressable` (« Détail → ») → écran Cagnotte. Route déclarée dans
[_layout.tsx](../../app/group/[id]/_layout.tsx) (`headerShown: false`, header custom dans l'écran).

## Notifications

Nouveau type `payment_reminder` (Wallet ambre) dans [notifications.tsx](../../app/notifications.tsx) ;
le tap ouvre **directement la cagnotte** du groupe. Ajouté à l'enum dans
[database.types.ts](../../types/database.types.ts) (le 046 l'ajoute en base).

---

## Logique pure + tests

[features/cagnotte/cagnotte.ts](../../features/cagnotte/cagnotte.ts) — testé
([+13 tests](../../features/cagnotte/__tests__/cagnotte.test.ts)) :
- `cagnotteTotals` (total/réglé/en attente/part, pas de division par zéro, en attente jamais négatif) ;
- `unpaidMembers`, `penaltyCountLabel`, `penaltyTypeLabel` ;
- `formatEuro` (entier « 5 € » / décimal « 12,50 € », arrondi des flottants) ;
- `weeksBetween`, `groupHistoryByWeek` (regroupement + libellés relatifs).

Data : [queries.ts](../../features/cagnotte/queries.ts) (`useCagnotte`, `usePotHistory`),
[mutations.ts](../../features/cagnotte/mutations.ts) (`useSettleMember`, `useRemindUnpaid`, `mapCagnotteError`).

## Modèle de données (déjà en place, aucune table créée)

- `pot_transactions` (`transaction_type = 'penalty_added'`) = dettes ; `is_paid`/`marked_by`/`paid_at` = suivi.
- `penalties` = registre (type séance manquée / blâme, semaine).
- `pots.total_amount` = agrégat (déjà affiché sur le dashboard).

## À noter / suites

- **La cagnotte reste vide tant que les pénalités ne sont pas générées.** Le calcul auto des séances
  manquées = **clôture hebdo** (§9, cron/Edge Function), étape séparée encore à faire. L'écran est
  complet et fonctionnel dès qu'il y a des données (blâmes/clôture).
- **Trésorier dédié** (au-delà de l'admin) : brancher l'assignation du rôle `treasurer` (déjà géré en
  lecture par les RPC) + un réglage dans « Modifier le groupe ». Non bloquant.
- **Déblocage de la cagnotte** en fin de défi (`pots.status`/`unlocked_at`) : à l'écran de **Clôture**
  (Étape 12).
