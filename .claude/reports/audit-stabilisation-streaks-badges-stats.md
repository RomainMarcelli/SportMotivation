# Audit de stabilisation — streaks, badges, stats

Date : 3 septembre 2026  
Branche auditée : `feature/streaks-badges-stats`  
Périmètre : vérification et corrections ciblées uniquement. Aucun travail Google Places,
aucun déploiement Supabase et aucune commande Git d'écriture.

## A. État global

| Contrôle | Résultat |
|---|---|
| Expo SDK 54 | Documentation versionnée relue avant modification : <https://docs.expo.dev/versions/v54.0.0/> |
| TypeScript | ✅ `npx tsc --noEmit` |
| Lint | ✅ `npm run lint`, 0 erreur / 0 warning après correction |
| Jest | ✅ 68 suites / 624 tests, 0 échec (`--runInBand`), dernière passe 223,7 s |
| Playwright | ✅ 33/35 sur la passe complète (28,2 min), puis 2/2 ciblés sur serveur neuf (3,3 min) ; les deux échecs initiaux étaient des timeouts de navigation Expo, avant toute assertion métier |
| SQL 060–070 | ✅ audit statique ; 070 inchangée |
| SQL correctif | ⚠ `071_stabilize_gamification.sql` créée, à exécuter une fois après 070 |
| pgTAP | 32 tests historiques déjà validés ; 3 tests de droits + 12 tests métier définis, à lancer après 071 |

### Détail des exécutions

- `npx tsc --noEmit` : 0 erreur.
- `npm run lint` : la première passe remontait 84 erreurs d'apostrophes françaises et 9 warnings
  réels. Après correction : 0 erreur, 0 warning.
- `npm test` : le lancement parallèle standard est refusé par Windows dans cet environnement
  (`spawn EPERM` lors de la création des workers Jest). La même suite complète lancée avec
  `npm test -- --runInBand` termine avec **68/68 suites et 624/624 tests**, aucun fichier en échec.
  La dernière passe, après les deux corrections supplémentaires de 071, a duré **223,749 s**.
- Playwright : **35 tests, 33 passés, 2 échoués, 0 skipped**, en **28,2 min** lors de la passe
  complète finale. Les deux échecs (`cagnotte.spec.ts`, `challenge-end.spec.ts`) sont des timeouts
  `page.goto()` avant assertion. Leur relance conjointe sur serveur neuf donne **2/2 passés** en
  **3,3 min**. Les scénarios passés les plus lents sont `vote.spec.ts` (~1,3 min),
  `suspension-request.spec.ts` et `penalty-change.spec.ts` (~1,2 min), puis
  `vote-refuse.spec.ts` et `session-limit.spec.ts` (~1,1 min).
- Incidents E2E observés et isolés : attente `load` trop stricte, Metro réutilisé atteignant environ
  4 Go puis bloqué par le GC, refus ponctuel Windows `spawn EPERM` lors d'un lancement de serveur,
  puis suspension de la machine pendant une dernière tentative complète
  (`ERR_NETWORK_IO_SUSPENDED`, durée artificielle de 5,7 h). Cette tentative a été arrêtée après
  17/17 scénarios verts — y compris les deux anciens échecs — et n'est pas comptée comme une passe
  complète. Aucun de ces incidents n'a produit un échec d'assertion métier.

## Diagnostic Git, sans commande Git exécutée

- `HEAD` local : `feature/streaks-badges-stats` à `19b56304f9c9c05ae7cad80b829655fe902d64bb`.
- La référence distante de la branche pointe sur le même commit.
- `origin/main` actuel, vérifié via l'API GitHub en lecture seule :
  `3dfd7eef8413aea3f792bdcdffe293df24255697`.
- Comparaison GitHub : historique **divergent**, branche en avance de 2 commits et en retard de
  1 commit ; base commune `92ea15ef03e21fe7ab16481cef27005680e600f3`.
- Le commit manquant est le merge de la PR #1 `feature/refonte`. Son arbre est identique à celui
  de la base commune : **aucun fichier ni contenu métier ne manque réellement** dans la branche.
- Risque de conflit de contenu : nul selon la comparaison actuelle. Une resynchronisation reste
  recommandée avant intégration afin que l'historique contienne le merge de `main`.

Commandes proposées à Romain, non exécutées :

```bash
git fetch origin
git rebase origin/main
git status
git log --oneline --graph --decorate -12
```

La branche distante étant déjà publiée, une mise à jour après rebase réécrirait ses deux commits :
utiliser plus tard `git push --force-with-lease`, jamais `--force`. Pour éviter toute réécriture,
alternative : `git merge origin/main`.

## B. Bugs trouvés et corrigés

### BUG 1 — régression critique de la résolution des votes

**Fichier :** `supabase/sql/069_streak_notifications.sql` (corrigé forward-only dans 071).  
**Cause :** 069 avait redéfini `resolve_session` à partir d'une version antérieure à SQL 054.  
**Impact :** perte du délai effectif `max(règle, publication + 24 h)`, clôture à majorité avant la
participation complète, nouveaux membres comptés à tort et réintroduction de `expired`. Les blâmes
« votes manqués » pouvaient donc être faux.  
**Correction :** restauration de la logique 054, conservation de la célébration 069 et verrou
`FOR UPDATE` contre deux verdicts/notifications concurrents.

### BUG 2 — fonctions `SECURITY DEFINER` internes appelables par le client

**Fichiers :** SQL 060–069, correction dans 071.  
**Cause :** plusieurs fonctions internes conservaient `EXECUTE` pour `PUBLIC`/`authenticated`.  
**Impact :** un client pouvait notamment tenter `grant_badge` pour un utilisateur arbitraire,
lancer le backfill ou figer prématurément les badges d'un défi.  
**Correction :** révocation explicite pour `PUBLIC`, `anon`, `authenticated`; seules les RPC client
avec gardes internes sont réaccordées. Trois tests d'abus T33–T35 ont été ajoutés.

### BUG 3 — clôture hebdomadaire non atomique

**Fichiers :** SQL 061, correction dans 071.  
**Cause :** `weekly_closures` était insérée après les pénalités. Deux exécutions simultanées pouvaient
toutes deux franchir le `NOT EXISTS`.  
**Impact :** doubles pénalités, doubles notifications et cagnotte incohérente.  
**Correction :** nouvelle primitive interne `close_group_week` qui revendique d'abord la clé
`(group_id, week_start)` avec `ON CONFLICT`, puis effectue toutes les écritures dans la transaction.

### BUG 4 — séance encore votable pénalisée à la clôture

**Fichiers :** SQL 054/061, correction dans 071.  
**Cause :** le cron de clôture peut tourner lundi à 00:00 alors qu'une séance publiée dimanche soir
dispose encore de son filet de 24 h.  
**Impact :** séance comptée manquante puis éventuellement validée plus tard.  
**Correction :** résolution + blâmes des seuls scrutins réellement échus, et report atomique de la
clôture tant qu'un vote reste ouvert. La complétion/déblocage final renvoie `PENDING_VOTES` au lieu de
figer un bilan faux ; l'UI affiche un message explicite.

### BUG 5 — dernière semaine partielle jamais clôturée

**Fichiers :** SQL 066, correction dans 071.  
**Cause :** un défi pouvait passer à `completed` avant le prochain lundi ; le cron hebdo ne traite
que les défis actifs.  
**Impact :** dernier outcome absent, pénalités/cagnotte/classement et badges finaux incomplets.  
**Correction :** fermeture de toutes les semaines manquantes avant `completed`, puis garde qui
interdit de finaliser les badges tant que chaque semaine couverte n'a pas son `weekly_closures`.
Le rattrapage applique désormais le même ordre aux défis déjà `completed` mais non finalisés, et
`unlock_pot` répare lui aussi leurs clôtures avant badges/déblocage.

### BUG 6 — badges de streak oubliés après clôture/excuse

**Fichiers :** SQL 061/065, correction dans 071.  
**Cause :** l'attribution était déclenchée uniquement lors du passage d'une séance à `validated`.  
**Impact :** un seuil atteint grâce à l'objectif effectif d'une clôture ou à une excuse standard
pouvait ne jamais débloquer son badge.  
**Correction :** réévaluation idempotente après écriture de chaque outcome et pendant le backfill.

### BUG 7 — double incrément de semaine courante

**Fichiers :** `features/streaks/streak-logic.ts`, SQL 060/065, correction SQL dans 071.  
**Cause :** la couche live ajoutait `+1` même si une clôture forcée de la semaine courante était déjà
présente dans le cache. Elle transformait aussi l'absence d'adhésion active en objectif zéro, donc en
succès live automatique pour un ancien membre.  
**Impact :** série affichée/évaluée trop élevée et badge potentiellement anticipé, notamment pendant
le backfill des anciennes séances.  
**Correction :** comparaison à `last_processed_week` côté SQL et au lundi courant côté logique pure ;
pour un ancien membre, `live_streak_for` renvoie strictement le cache persistant (ou zéro).

### BUG 8 — incohérence du joker quand plusieurs séances manquent

**Fichier :** `features/streaks/streak-logic.ts`.  
**Cause :** le miroir TypeScript indiquait `jokerUsed: false` si le joker retirait une séance mais
laissait un manque résiduel. SQL, lui, le consommait bien.  
**Impact :** divergence TS/SQL dans ce cas limite.  
**Correction :** outcome `fail`, streak cassé, pénalité sur le résiduel et `jokerUsed: true`.

### BUG 9 — classement et bilan final fondés sur l'objectif brut

**Fichiers :** `features/challenge-end/report.ts`, `queries.ts`, `app/group/[id]/fin-defi.tsx`,
SQL 066 corrigé dans 071.  
**Cause :** le taux utilisait `séances validées / (objectif brut × semaines calendaires)`.  
**Impact :** excuses, jokers, suspensions et semaines neutres rendaient le classement, le taux et la
meilleure série incohérents avec le profil et la clôture.  
**Correction :** source unique `member_weekly_outcomes`; taux = `success/(success+fail)`, neutres
exclues ; record = success `+1`, fail `0`, neutral inchangé. Même tri côté badge champion.

### BUG 10 — backfill défini mais non lancé et effectif historique incomplet

**Fichier :** SQL 062, correction dans 071.  
**Cause :** 062 créait la fonction sans l'appeler et ne parcourait que les membres encore actifs.  
**Impact :** anciennes semaines absentes des stats/streaks et anciens seuils de badges non rejoués.  
**Correction :** backfill non destructif lancé par 071, limité aux semaines réellement présentes
dans `weekly_closures`, avec l'effectif présent au moment de `closed_at`, puis reconstruction du cache
et attribution idempotente des badges.

### BUG 11 — célébrations concurrentes et regroupement incomplet

**Fichiers :** `BadgeCelebration.tsx`, `celebration.ts`, `notifications/realtime.ts`, SQL 069/071.  
**Cause :** la notification objectif pouvait arriver avant le rafraîchissement des trophées ; un seul
objectif était retenu et deux validations concurrentes pouvaient passer le couple `EXISTS/INSERT`.  
**Impact :** deux popups, événement oublié ou notification dupliquée.  
**Correction :** verrou transactionnel par groupe/utilisateur/semaine, fenêtre de groupement de
350 ms, invalidation conjointe notifications/trophées, traitement de tous les objectifs non lus et
zone scrollable pour les lots longs.

### BUG 12 — absence de signal de streak perdu et emoji serveur

**Fichier :** SQL 069, correction dans 071.  
**Cause :** la clôture notifiait la pénalité sans indiquer la série cassée ; les nouveaux textes
objectif contenaient des emoji malgré la convention Lucide.  
**Impact :** perte de série invisible et DA incohérente.  
**Correction :** ajout de `streak_lost/previous_streak` dans la notification groupée de pénalité et
texte d'objectif sans emoji, sans créer une notification supplémentaire.

### BUG 13 — erreurs de données présentées comme des zéros

**Fichiers :** `features/profile/queries.ts`, `app/(tabs)/profile.tsx`, `app/trophies.tsx`,
`app/group/[id]/fin-defi.tsx`.  
**Cause :** une erreur réseau/RLS de stats était avalée et affichait un profil à zéro ; certains
écrans n'avaient pas d'état d'erreur.  
**Impact :** données mensongères et écran sans recours.  
**Correction :** propagation des erreurs et états explicites avec bouton Réessayer.

### BUG 14 — instabilité Playwright sur Expo Web

**Fichiers :** `playwright.config.ts`, helpers et specs `e2e/*.spec.ts`.  
**Cause :** `page.goto()` attendait `load`, alors que Metro/Expo Router pouvait conserver des
sous-ressources ouvertes bien après que le DOM soit interactif. Un Metro réutilisé sur plusieurs
passes montait aussi près de la limite de heap Node et finissait par bloquer certaines navigations.  
**Impact :** timeouts aléatoires sur des pages correctement rendues ; nettoyage parfois bloqué par
une animation/overlay.  
**Correction :** attente `domcontentloaded` sur toutes les navigations explicites, assertions d'UI
conservées comme preuve de disponibilité, serveur neuf par passe, délai de bundle froid porté à
360 s, plafond d'un test à 150 s, plafond d'une navigation à 120 s, heap Metro à 8 Go et clics de
suppression forcés uniquement dans le nettoyage best-effort.

La dernière passe complète a validé 33 scénarios sur 35. Les deux seuls échecs ont expiré dans
`page.goto()` (`/group/create` et `/sign-up`) avant toute assertion ; relancés ensemble avec leur
propre serveur neuf, ils ont réussi 2/2. Le comportement métier couvert est donc vert, mais la passe
complète reste sensible aux latences ponctuelles du serveur Expo local.

### BUG 15 — lint inutilisable sur les textes français

**Fichiers :** `eslint.config.js` et neuf composants/écrans.  
**Cause :** 84 apostrophes françaises remontaient comme erreurs `react/no-unescaped-entities`; neuf
warnings réels restaient (imports, dépendances de hooks, variable inutilisée).  
**Impact :** `npm run lint` rouge sans défaut JSX effectif, masquant les vrais warnings.  
**Correction :** règle limitée aux caractères réellement dangereux `>` et `}`, puis suppression des
neuf warnings. Résultat : 0 erreur / 0 warning.

## C. Scénarios métier vérifiés

| Scénario | Résultat |
|---|---|
| `success, success, success` | série 3 |
| `success, fail, success` | série courante 1, record conservé |
| `success, neutral, success` | série 2 |
| historique 5 + semaine 1/3 | affichage 5, aucun reset anticipé |
| historique 5 + semaine 3/3 | affichage 6 |
| objectif 3, 2 séances, joker | neutral, aucun `+1`, aucune pénalité |
| objectif 3, 1 excuse standard, 2 séances | objectif effectif 2, success |
| excuse majeure | neutral, série inchangée |
| suspension | neutral, série inchangée |
| vrai échec | fail, série 0, record et badges acquis conservés |

Les cas obligatoires sont couverts dans `streak-logic.test.ts`. Le cas nouveau « semaine courante
déjà clôturée » vérifie aussi l'absence de double incrément.

## D. Audit SQL 060–070

- **060/061** : modèle `success/fail/neutral`, PK des outcomes, cache reconstructible et RLS cohérents.
  Les défauts de concurrence, double-live et attente de vote sont corrigés par 071.
- **062** : compatible avec les données existantes mais historiquement approximatif et non lancé ;
  remplacé forward-only et exécuté une fois par 071.
- **063–065** : unicité `(user_id, badge_key)` correcte ; acquisition permanente. Attribution
  idempotente correcte, droits et déclenchement post-clôture renforcés par 071.
- **064/068** : valeurs d'enum ajoutées avant usage, cohérentes avec les types de notifications.
- **066** : finalisation idempotente ; formule de classement et ordre clôture/finalisation corrigés.
- **067** : stats alignées sur les outcomes ; neutres exclues. `penalties_avoided` reste volontairement
  une estimation fondée sur le montant courant du membre.
- **069** : préférences réutilisées via `notification_category`; régression de vote, doublons et DA
  corrigés dans 071.
- **070** : colonnes intérêts/localisation et commentaire seulement. Aucun fichier Places, formulaire,
  clé, fonction Edge ou déploiement n'a été touché.

### Fidélité du backfill historique

Reconstruit uniquement les semaines ayant un marqueur `weekly_closures`, et seulement les couples
membre/semaine présents au moment de cette clôture.

Reconstructible avec une bonne fidélité : séances validées actuelles, pénalités `missed_session`,
excuses acceptées encore présentes, effectif via `joined_at/left_at/closed_at`.

Reste approximatif : la semaine exacte consommée par un ancien joker (pas de FK joker→semaine), une
suspension ancienne ensuite levée/annulée, et les valeurs historiques remplacées lors d'une
réadhésion éventuelle. Une validation tardive peut aussi modifier le compteur brut, même si la
pénalité existante préserve le statut `fail`. 071 n'écrase jamais un outcome déjà historisé.

## E. Fichiers modifiés

### Produit et tests unitaires

- `app/(tabs)/profile.tsx`
- `app/group/[id]/cagnotte.tsx`
- `app/group/[id]/excuse.tsx`
- `app/group/[id]/fin-defi.tsx`
- `app/group/[id]/index.tsx`
- `app/group/join.tsx`
- `app/notifications.tsx`
- `app/trophies.tsx`
- `components/badges/BadgeCelebration.tsx`
- `components/groups/GroupTabs.tsx`
- `eslint.config.js`
- `features/challenge-end/{mutations,queries,report}.ts`
- `features/challenge-end/__tests__/{mutations,report}.test.ts`
- `features/notifications/realtime.ts`
- `features/profile/queries.ts`
- `features/streaks/{celebration,streak-logic}.ts`
- `features/streaks/__tests__/{celebration,streak-logic}.test.ts`
- `types/database.types.ts`

### SQL et sécurité

- `supabase/sql/071_stabilize_gamification.sql` (nouveau)
- `supabase/tests/gamification_stabilization.test.sql` (nouveau, 12 assertions)
- `supabase/tests/security_abuse.test.sql`

### E2E

- `playwright.config.ts`
- `e2e/helpers/{groups,sessions,signup}.ts`
- `e2e/account.spec.ts`, `activity-reject.spec.ts`, `activity-request.spec.ts`,
  `activity-vote.spec.ts`, `admin-transfer.spec.ts`, `auth.spec.ts`, `blames.spec.ts`,
  `cagnotte-remind.spec.ts`, `cagnotte-treasurer.spec.ts`, `cagnotte.spec.ts`,
  `challenge-end.spec.ts`, `excuses.spec.ts`, `group-delete.spec.ts`, `group-edit.spec.ts`,
  `group-leave.spec.ts`, `invitations.spec.ts`, `notifications-manage.spec.ts`,
  `onboarding.spec.ts`, `penalty-change.spec.ts`, `profile.spec.ts`,
  `publication-deadline.spec.ts`, `realtime-notif.spec.ts`, `session-limit.spec.ts`,
  `session-multi-scope.spec.ts`, `suspension-request.spec.ts`, `suspensions.spec.ts`,
  `vote-refuse.spec.ts`, `vote.spec.ts`.

### Documentation

- `.claude/PROGRESS.md`
- `.claude/HANDOFF.md`
- `.claude/reports/audit-stabilisation-streaks-badges-stats.md`

## F. Reste à exécuter hors audit local

1. Exécuter **uniquement** `supabase/sql/071_stabilize_gamification.sql` sur Supabase, après revue.
2. Lancer `supabase/tests/security_abuse.test.sql` : résultat attendu 35/35 (les trois nouveaux
   tests ne peuvent pas être validés avant le déploiement de 071).
3. Lancer `supabase/tests/gamification_stabilization.test.sql` : résultat attendu 12/12. Il couvre
   l'ancien membre, le rattrapage `completed`, l'idempotence et `unlock_pot`.
4. Faire la resynchronisation Git choisie. Aucun merge/rebase/commit/push n'a été lancé ici.

Le SQL 071 a été contrôlé statiquement et via ses miroirs TypeScript, mais n'a volontairement pas été
exécuté sur la base distante. C'est la seule vérification qui reste nécessaire avant de déclarer le
backend effectivement stabilisé en production.
