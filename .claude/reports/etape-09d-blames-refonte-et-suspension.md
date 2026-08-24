# Étape 9d — Refonte des blâmes (= votes manqués) & Suspension d'un joueur

> Lot transverse : fait suite à 9c (blâmes → pénalité). **Change la définition du blâme** et ajoute
> la **suspension**. Backend + logique + tests verts ; **UI DA de la suspension = prochain lot**.

## Contexte & décision produit

Ancien modèle (9c / SQL 048) : **un blâme = ta séance est refusée** au vote. Romain l'a corrigé :
c'est **manipulable** (des amis mal intentionnés refusent tes séances pour te faire payer).

Nouveau modèle (validé par Romain) : **un blâme = tu n'as pas voté** une séance d'un autre avant
l'échéance. C'est **anti-collusion** et **pro-engagement** : ne pas voter **aide** l'auteur (séance
validée par défaut) et **pénalise** le non-votant. « Ça garde l'user sur l'app et actifs. »

Suspension : un membre suspendu (période à date de fin) est **exonéré de tout** (blâmes ET pénalités
« séance manquée »). L'admin suspend, ou le joueur demande (motif) → l'admin accepte/refuse.

## Ce qui a changé

### SQL (à exécuter dans l'ordre : 052 → 053 → 054)

- **052_suspensions.sql** — table `suspensions` (`status` pending/active/rejected/cancelled,
  `origin` admin/request, plage `start_date`/`end_date` incluses, motif, décision). Helper
  `is_suspended(group, user, date)`. RLS (lecture membres). RPC : `admin_suspend_member`,
  `request_suspension` (motif obligatoire), `decide_suspension`, `cancel_suspension`,
  `get_group_suspensions` (lecture typée). Valeurs d'enum notif : `suspension_requested/set/
  accepted/rejected`, `blame_threshold_reached`.
- **053_closure_respects_suspension.sql** — `run_weekly_closure` re-`CREATE OR REPLACE` (identique à
  047 **+ garde** : un suspendu sur tout ou partie de la semaine ne reçoit **aucune** pénalité
  « séance manquée »).
- **054_blames_are_missed_votes.sql** — le cœur :
  - `session_effective_deadline` = **max(règle du groupe, publication + 24 h)** ;
  - `resolve_session` **v3** : clôture anticipée **seulement si participation complète** ; à
    l'échéance **refus majoritaire → refusée, sinon validée par défaut** ; **plus de statut
    `expired`** ; notifs de verdict inchangées (043) ;
  - `apply_session_blames` : **+1 blâme** à chaque non-votant (actif, hors auteur, **non suspendu**,
    présent à l'échéance, sans vote) ; au **seuil** → pénalité (montant du membre) + solde `seuil`
    blâmes (**cascade** 7 = 2 pénalités) + réconciliation cagnotte + **notif joueur & admin** ;
  - `resolve_pending_votes` : **cron horaire** (`resolve-votes`) qui résout + blâme les séances
    échues ; garde-fou de déploiement `p_lookback_days` (défaut 30) ;
  - **retire le trigger 048** (`trg_sessions_blame`) + ses fonctions ; ajoute l'index unique
    `blames (session_id, user_id)`.

### Front / TS (tsc 0, jest 556/63)

- `features/suspensions/suspension.ts` (**pur**, RN-free) + tests : mapping ligne, `isSuspendedOn`,
  `activeSuspensionOn`, `isCurrentlySuspended`, `pendingRequests`, libellés de plage/statut,
  validation de formulaire, `mapSuspensionError`.
- `features/suspensions/queries.ts` (`useGroupSuspensions`) & `mutations.ts` (`useAdminSuspendMember`,
  `useRequestSuspension`, `useDecideSuspension`, `useCancelSuspension`) — via `.rpc(… as never)`
  (convention repo, table pas encore dans les types générés).
- `features/votes/vote-logic.ts` **réaligné** sur 054 (miroir serveur) : `voteDeadline` (+24 h),
  `resolveVote` (participation complète / validée par défaut / plus d'`expired`) + tests mis à jour.
- Rename **« Blâme atteint » → « Vote manqué »** : `features/cagnotte/cagnotte.ts` (`penaltyTypeLabel`)
  et `features/challenge-end/report.ts` (`contributionSubLabel` → « N votes manqués ») + tests.
- `app/notifications.tsx` : visuels des nouveaux types (`blame_received`, `blame_threshold_reached`,
  `suspension_*`). *(Boutons d'action suspension = prochain lot.)*

## #6 — déjà fait

Le retour #6 (notifs de résultat de vote de séance) était **déjà implémenté dans 043** :
`resolve_session` notifie le verdict (`session_validated`/`session_rejected`), `cast_vote` v4 notifie
chaque refus (`session_refused_by_member`). Rien à recoder.

## Vérifs

`npx tsc --noEmit` → **0**. `jest` → **556 tests / 63 suites** (nouvelle suite `suspension`, suites
`vote-logic`/`cagnotte`/`report` mises à jour). Test manuel : `work-log/PHASE-14-tests-suspension-blames.md`.

## Reste

- **UI DA — Suspension** : section dashboard (qui est suspendu / jusqu'à quand), bouton admin
  « Suspendre », bouton joueur « Demander », boutons Accepter/Refuser sur la notif. Hooks + logique prêts.
- Points à valider par Romain (cf. HANDOFF « Questions ouvertes ») : `same_day` devient de fait « ≥ 24 h » ;
  plus de clôture anticipée sur simple majorité.
