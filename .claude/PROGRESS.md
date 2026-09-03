# Sport Motiv — PROGRESS (tableau de bord)

Statut : ✅ fait · 🔄 en cours · ⬜ à faire
Rapports détaillés par étape dans `.claude/reports/`.

| # | Étape | Statut | Rapport |
|---|-------|--------|---------|
| 0 | Design system | ✅ | [etape-00-setup-da.md](reports/etape-00-setup-da.md) |
| 1 | Auth (onboarding, sign-in, **inscription en un écran** : photo/prénom/pseudo/e-mail/mdp) | ✅ | [etape-01-auth.md](reports/etape-01-auth.md) |
| 2 | ~~Setup profil post-inscription~~ → **fusionné dans l'inscription (Étape 1)**, `(setup)` supprimé | ✅ | [etape-02-setup.md](reports/etape-02-setup.md) *(superseded)* |
| 3 | Home (accueil = salutation + **Ma semaine**) + onglet **Groupes** adaptatif (0/1/2+) | ✅ | [etape-03-accueil.md](reports/etape-03-accueil.md) |
| 4 | Création & adhésion (create, join, join-confirm, scan, accept-invite) | ✅ | [etape-04-creation-adhesion.md](reports/etape-04-creation-adhesion.md) |
| 5 | Groupe dashboard (Infos/Séances, membres, classement, blâmes) | ✅ | [etape-05-groupe.md](reports/etape-05-groupe.md) |
| 6 | Déclarer une séance | ✅ | [etape-06-declarer.md](reports/etape-06-declarer.md) |
| 7 | Voter (scrutin séances : deck, vote, résolution) | ✅ | [etape-07-voter.md](reports/etape-07-voter.md) |
| 8 | Excuses (déclaration au vote du groupe + joker mensuel) | ✅ | [etape-08-excuses.md](reports/etape-08-excuses.md) |
| 9 | Cagnotte (vue trésorier) : détail par membre, historique, trésorier coche, relance | ✅ | [etape-09-cagnotte.md](reports/etape-09-cagnotte.md) |
| 10 | Gestion des invitations (statuts, renvoyer/annuler) | ✅ | [etape-08c-notifications-quitter-filtres.md](reports/etape-08c-notifications-quitter-filtres.md) |
| 11 | Notifications in-app (liste à la DA) ✅ · temps réel / push ⬜ | 🔄 | [etape-08i-carrousel-notifs-regles.md](reports/etape-08i-carrousel-notifs-regles.md) |
| 12 | Fin de défi / Clôture (bilan podium + déblocage cagnotte) | ✅ | [etape-12-fin-defi-cloture.md](reports/etape-12-fin-defi-cloture.md) |
| 13 | Profil (avatars, stats, mes groupes) · **Paramètres** (notifs, mot de passe, e-mail, Strava, légal) | ✅ | [etape-13-parametres.md](reports/etape-13-parametres.md) |
| 14 | Séances partagées entre défis · Strava · Aide & légal · Groupes | ✅ | [etape-14-seances-partagees.md](reports/etape-14-seances-partagees.md) |
| 15 | Navigation, vote, Strava, invitations par pseudo, pénalités | ✅ | [etape-15-corrections-groupes.md](reports/etape-15-corrections-groupes.md) |
| 16 | Adhésion (fix), confidentialité, fiche séance, demandes admin, popup invit. | ✅ | [etape-16-adhesion-confidentialite.md](reports/etape-16-adhesion-confidentialite.md) |
| 17 | Sports (refus/vote), limite séances/jour, notifs de résultat, édition groupe DA | ✅ | [etape-17-sports-limite-notifs.md](reports/etape-17-sports-limite-notifs.md) |
| 18 | **Système d'amis** (ajouter en ami, inviter ses amis) | ⬜ | — |
| 19 | **Thème clair** — palette à valider (aucune maquette claire n'existe) | ⬜ | — |
| 20 | **Écran Statistiques** (séances/semaine, sport favori, cadence…) | ⬜ | — |

## Écrans restants (maquettes `maquette/V3/`)

| Maquette | Écran | État |
|---|---|---|
| `sport-motiv-cagnotte.html` | Cagnotte / vue trésorier | ✅ fait (Étape 9) |
| `sport-motiv-cloture.html` | Clôture du défi | ✅ fait (Étape 12) |
| `sport-motiv-fin-defi.html` | Bilan de fin de défi | ✅ fait (Étape 12) |
| `sport-motiv-parametres.html` | `app/settings.tsx` | ✅ fait |

Les autres maquettes ont leur écran (`sport-motiv-maquettes.html` est l'index, pas un écran).
**Toutes les maquettes V3 ont désormais leur écran.**

## Notes transverses
- **Audit stabilisation streaks/badges/stats (03/09/2026)** : audit Git en lecture seule, SQL
  060–070, streaks/badges/stats/notifs/clôture/fin de défi, TypeScript, lint, Jest et Playwright.
  Corrections critiques forward-only dans **071** : restaure `resolve_session` 054 écrasée par 069,
  fermeture hebdo atomique et différée tant qu'un vote reste ouvert, dernière semaine clôturée avant
  `completed`, badges réévalués après outcome/backfill, classement aligné sur
  `member_weekly_outcomes`, droits `SECURITY DEFINER` resserrés. Dernière revue : aucun `+1` live pour
  un ancien membre ; les défis déjà `completed` et `unlock_pot` ferment aussi les semaines manquantes
  avant finalisation. **071 reste à exécuter** ; 3 tests d'abus T33–T35 et 12 tests métier dédiés
  restent à valider après déploiement. Contrôles locaux : TypeScript et lint verts,
  Jest **68 suites / 624 tests**, Playwright **33/35 en passe complète puis 2/2 ciblés** (les deux
  échecs étaient des timeouts de navigation Expo avant assertion). Rapport
  [audit-stabilisation-streaks-badges-stats.md](reports/audit-stabilisation-streaks-badges-stats.md).
- **Audit sécurité (9g — ✅ VALIDÉ, 32/32 pgTAP au vert sur la base réelle)** : sweep RLS (diagnostic live) + socle **pgTAP** (32 tests d'abus,
  `supabase/tests/`). RLS **ON partout**, lectures OK. **Findings → corrigés `056`+`057`** : 🔴 `delete_account_internal`
  appelable par anon/authenticated (suppression de compte par UUID) ; 🔴 auto-validation séance / vote direct /
  auto-adhésion admin (policies d'écriture trop larges) ; 🟠 fonctions internes exposées + `search_path` manquant
  (`is_group_admin`/`handle_new_user`). Leçon : `REVOKE FROM PUBLIC` insuffisant → `FROM PUBLIC, anon, authenticated`.
  Rapport [etape-09g-audit-securite-rls-pgtap.md](reports/etape-09g-audit-securite-rls-pgtap.md).
- Convention rapports : un fichier par étape `.claude/reports/etape-NN-nom.md`.
- Vérifs avant clôture d'étape : `npx tsc --noEmit` ✅ + `jest` ✅.
- **Passe qualité (17b)** : couverture unitaire de **toute la logique pure** exportée
  (`features/`, `lib/`, `constants/`) — **464 tests / 58 suites** (pilotée par `jest --coverage`).
  Aucun code de prod modifié. Rapport [etape-17b-tests-et-couverture.md](reports/etape-17b-tests-et-couverture.md).
  Reste hors périmètre unitaire (convention) : hooks/queries/mutations à effets de bord.
- **Lot accueil/Strava/rappels (18b)** : « Ma semaine » superpose les séances réelles au planning ;
  historique borné au défi + filtre Jour/Semaine/Mois + scroll ; rappel week-end (SQL 045, pg_cron) ;
  page « Organiser l'accueil » (ordre des défis + infos affichées, **préférences locales**) ;
  commentaires de refus dans la fiche séance ; **Strava — erreur de connexion enfin visible**
  (connexion effective = déployer l'Edge Function `strava-token`) ; logo Strava ; icônes de réglages
  colorées. **479 tests / 59 suites**. Rapport [etape-18b-accueil-strava-rappels.md](reports/etape-18b-accueil-strava-rappels.md).
- **Lot cagnotte (9)** : écran `sport-motiv-cagnotte.html` (héro réglé/en attente, vue trésorier =
  admin en V1, détail par membre, historique par semaine, relance) ; accès = carte cagnotte du
  dashboard cliquable ; RPC `get_group_cagnotte`/`get_pot_history`/`settle_member_pot`/
  `remind_unpaid_members` (SQL 046) + notif `payment_reminder`. **502 tests / 60 suites**. Rapport
  [etape-09-cagnotte.md](reports/etape-09-cagnotte.md).
- **Clôture hebdo (9b)** : `run_weekly_closure()` + cron (SQL 047) — chaque lundi, séances manquées de
  la semaine écoulée → pénalités (montant du membre) → **alimente la cagnotte** + notif `penalty_applied`.
  Gère excuses (majeure = annulée, standard = −1) et joker (annule 1 manquée). **Idempotent**
  (`weekly_closures`), **sûr même avec un trigger pot** (réconciliation), **DST-safe**. C'est ce qui
  remplit enfin la cagnotte. Rapport [etape-09b-cloture-hebdo.md](reports/etape-09b-cloture-hebdo.md).
- **Blâmes → pénalité (9c)** : trigger sur `sessions` (statut → `rejected`, SQL 048) — 1 blâme par
  séance rejetée, et au **seuil** (`blame_threshold`) → pénalité `blame_threshold` + reset du compteur +
  alimente la cagnotte. Réveille les pastilles « Blâmes » du dashboard (aucun code TS).
  **Alimentation cagnotte = complète** (manquées + blâmes). Rapport
  [etape-09c-blame-penalties.md](reports/etape-09c-blame-penalties.md). Reste : **déblocage** = Étape 12.
  ⚠ **SUPERSEDED par 9d** : le trigger 048 est retiré, le blâme change de définition (voir ci-dessous).
- **Refonte blâmes + Suspension (9d)** : ⚠ **change le sens du blâme**. Un blâme n'est plus « ta
  séance refusée » mais « **tu n'as pas voté** une séance d'un autre avant l'échéance » (anti-collusion,
  décision Romain). SQL **054** : échéance effective = `max(règle du groupe, publication + 24 h)`,
  `resolve_session` v3 (clôture anticipée seulement si participation complète, plus de statut
  `expired` → **validée par défaut** à l'échéance sans majorité de refus), cron horaire
  `resolve_pending_votes` (résout + **+1 blâme aux non-votants** sauf auteur/suspendus, seuil →
  pénalité + cascade), **trigger 048 retiré**. **Suspension** (Chantier 4) SQL **052/053** : table
  `suspensions` + `is_suspended` + RPC (`admin_suspend_member`, `request_suspension`,
  `decide_suspension`, `cancel_suspension`, `get_group_suspensions`) + notifs ; la clôture hebdo
  **exonère les suspendus** des pénalités « séance manquée ». Front : hooks `features/suspensions/*`,
  logique pure + tests, miroir `vote-logic` réaligné, rename **« Blâme atteint » → « Vote manqué »**,
  visuels notifs des nouveaux types. #6 (notifs verdict/refus) était **déjà fait dans 043**.
  **UI Suspension = FAITE (9f)** : écran `app/group/[id]/suspensions.tsx` (route + menu ⋮ + notifs
  `suspension_*` qui l'ouvrent au tap) — admin suspend / accepte / refuse / lève, joueur demande /
  retire. **559 tests / 63 suites.** Rapports
  [etape-09d-blames-refonte-et-suspension.md](reports/etape-09d-blames-refonte-et-suspension.md) &
  [etape-09e-lot-retours-vote-strava-dates.md](reports/etape-09e-lot-retours-vote-strava-dates.md).
  Test manuel : `work-log/PHASE-14-tests-suspension-blames.md`.
- **Fin de défi (12)** : écrans `fin-defi` (podium, classement, « ton bilan ») + `cloture` (confettis,
  grand montant dégradé, « qui a rempli la cagnotte ») à la maquette. **Déblocage** `unlock_pot`
  (admin/trésorier, idempotent) + auto-complétion des défis échus (SQL 049, cron `complete-challenges`,
  DST-safe). Bilan **100 % côté client** (module pur `features/challenge-end/report.ts`, 25 tests) —
  aucune RPC de reporting. Animations : confettis, « pop » du trophée, podium qui se dresse, compteurs —
  **toutes coupées si `prefers-reduced-motion`**. **Toutes les maquettes V3 sont faites. 527 tests /
  61 suites.** Rapport [etape-12-fin-defi-cloture.md](reports/etape-12-fin-defi-cloture.md).
- Commits faits par Romain (jamais en automatique).
- **SQL exécuté côté Supabase : jusqu'à `070_group_interests_location.sql`** ; le correctif
  **`071_stabilize_gamification.sql` est à exécuter** après revue (ne pas rejouer 060–070).
  Historique utile des prérequis : jusqu'à `055_vote_eligibility_join_date.sql`,
  (exécuter les fichiers d'enum **avant** ceux qui les utilisent : `038` avant 039, `042` avant 043/044 ;
  `052` avant 053/054). `045` (rappel week-end), `047` (clôture hebdo), `049` (complétion des défis
  échus) et `054` (résolution des votes à l'échéance) **nécessitent l'extension `pg_cron`**. `050`
  corrige l'alerte linter « Security Definer View ». `051` : défi **actif dès la création**.
  `052` : **suspensions** (table + `is_suspended` + RPC + enum notif). `053` : la clôture hebdo
  **exonère les suspendus**. `054` : **refonte des blâmes** (blâme = vote manqué ; retire le trigger
  048 ; cron `resolve-votes`). `055` : **éligibilité de vote** — on ne vote pas une séance publiée
  avant son arrivée (`cast_vote` garde `JOINED_AFTER_PUBLICATION`).
- **Lot retours (6 items, post-9d)** : (1) dates de déclaration **bornées à la période du défi**
  (helper + schéma + écran + tests) ; (3) « Retour au groupe » après vote va **vraiment** au groupe ;
  (6) un nouveau membre **ne vote pas** les séances d'avant son arrivée (deck + SQL 054/055) ;
  (4) Strava **indexé par user** (plus de nom partagé entre comptes du device) ; (2) onglet groupe
  **« À voter »** (conditionnel) + **CTA « Voter »** dans la fiche séance (règle « clic qui ne fait
  rien ») + section **« À valider »** sur l'accueil ; (5) Organiser l'accueil : **glisser-déposer**
  (voir 9g).
- **Lot 9g** : **glisser-déposer réel** dans « Organiser l'accueil » (`SortableGroups`, rangs absolus
  + reanimated + gesture-handler, web/iOS/Android, scroll coupé pendant le drag ; remplace les flèches)
  + **badge « Suspendu »** sur les lignes membres du dashboard (`useGroupSuspensions` + `isSuspendedOn`).
- **Cycle de vie d'un défi** : un défi est `active` dès sa création — **plus d'étape « lancer »**.
  L'affichage (à venir / en cours / terminé) et les pénalités dérivent des **dates**
  (`challenge_start`/`challenge_end`), via `features/groups/challenge-phase.ts` (pur, testé).
  L'enum `setup` est conservé mais n'est plus produit. `completed` reste posé par le déblocage
  (049) / la complétion auto (cron).
- Décision produit : **inviter par pseudo est ouvert à tout membre** (SQL 040) ; seule la gestion
  des invitations (renvoyer/annuler) reste admin.
- **Étape 18 (amis) — nuance à retenir** : une fois le système d'amis en place, le mode **privé**
  (`users.is_searchable = false`) devra rester **trouvable par ses amis** (aujourd'hui privé =
  invisible pour tous dans la recherche). C'est la finalité du réglage confidentialité.
- **Demandé, à planifier** : système d'amis (Étape 18) — ajouter quelqu'un en ami puis l'inviter
  d'un geste depuis sa liste, au lieu de le rechercher par pseudo à chaque défi.
- **Demandé, à planifier** : écran Statistiques (Étape 20) — nb de séances/semaine, sport favori,
  cadence dans le temps, etc. Idée notée par Romain « pour plus tard ».
- ~~**Question ouverte** : notifier l'auteur quand sa séance est validée / refusée~~ → **TRANCHÉ /
  FAIT** : `resolve_session` (043) crée `session_validated` / `session_rejected` (1 notif au verdict)
  et `cast_vote` v4 crée `session_refused_by_member` à chaque refus. C'était le retour **#6** — déjà
  couvert avant même de le redemander.
