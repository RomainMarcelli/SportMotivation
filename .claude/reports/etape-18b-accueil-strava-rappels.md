# Étape 18b — Accueil (Ma semaine, historique, perso), Strava, rappels week-end

`npx tsc --noEmit` ✅ · `jest` **479/479** ✅ (59 suites, **+15 tests**). Aucun commit, aucune
commande git.

Lot de 9 demandes de Romain. Une seule décision de design lui a été posée (« Ma semaine ») ; le
reste tranché selon ses « fais au mieux », choix indiqués ci-dessous.

---

## ⚠️ SQL à exécuter — après 044

| Fichier | Rôle |
|---|---|
| [045_weekly_reminder.sql](../../supabase/sql/045_weekly_reminder.sql) | Rappel hebdo « n'oublie pas tes séances » (pg_cron, samedi 9h Paris). **Nécessite l'extension `pg_cron`.** |

Test manuel immédiat (sans attendre samedi) : `SELECT public.send_weekly_reminders(true);`

---

## 1. « Ma semaine » se met enfin à jour (superposition du réel) — *décision validée par Romain*

**Cause** : « Ma semaine » lisait seulement `weekly_plans` (les jours qu'on **coche à la main**), sans
aucun lien avec les séances déclarées. Une séance validée n'y apparaissait donc jamais.

**Choix retenu (option A) : superposer le réel au planning.** On garde la planification, et une
séance réelle **prime** sur son jour :

| État du jour | Rendu |
|---|---|
| Séance **validée** | Dégradé vert + ✓ |
| Séance **en attente** de vote | Aplat ambre + horloge |
| Séance **refusée** | Aplat rouge + croix |
| Jour **planifié** (sans séance) | Dégradé coral + ✓ (intention) |
| Aujourd'hui | Anneau coral (sauf si déjà rempli) |

Le compteur du bas passe de « jours prévus » à **« N validée(s) cette semaine »** — la réponse
directe à « ma séance n'apparaît pas ». Logique pure `weekSessionStatuses` (testée).

## 2. Historique borné au défi + filtre Jour / Semaine / Mois — *« fais au mieux »*

Avant : toujours les 6 dernières semaines **calendaires**, donc des semaines antérieures au début du
défi (vides, inutiles — ton cas du 15/06 alors que le défi démarre le 23/07).

Maintenant : histogramme **borné à la période du défi**, **défilable horizontalement**, qui se
**centre tout seul sur la période courante** (glisser à gauche = passé, à droite = à venir). Le texte
« séances par semaine » est remplacé par un **filtre Jour / Semaine / Mois**. Logique pure
`buildHistory` (testée, 3 granularités).

## 3. Rappel week-end (notification) — *« fais au mieux »*

Nouveau cron SQL : **samedi 9h (heure de Paris)**, un rappel in-app est envoyé aux membres **sous leur
objectif** de la semaine, sur les **défis en cours** seulement. Respecte la préférence
`session_reminders`, **idempotent** (jamais deux fois la même semaine), et **robuste au changement
d'heure** (garde interne sur l'heure de Paris, pas sur l'UTC). Message adapté au nombre de séances
restantes. Type `session_reminder` (déjà dans l'enum) → icône haltère ambre dans la liste.

> Samedi plutôt que dimanche : il reste tout le week-end pour agir. Passer au dimanche = changer un
> caractère du cron ; en ajouter un 2e = un second job.

## 4. Bouton « Voir tout » recentré

Puce refaite : **hauteur fixe + centrage explicite + `lineHeight`** → texte et chevron parfaitement
alignés (le padding vertical seul laissait le texte désaxé sur le web).

## 5. Commentaires de refus visibles dans la fiche séance

La fiche lit désormais `votes.comment` : sous chaque votant, **le commentaire** s'affiche (surtout
utile sur un refus). Un refus **sans** mot est signalé « Sans commentaire » plutôt qu'un vide ambigu.
Aucun SQL (la colonne existait, la RLS autorisait déjà la lecture des votes).

## 6. Organiser l'accueil (nouvelle page) — *« fais au mieux »*

Nouveau bouton **Paramètres → Accueil → « Organiser l'accueil »** menant à un écran DA
([home-layout.tsx](../../app/account/home-layout.tsx)) :

- **Ordre des défis** : réordonnancement par **flèches ↑/↓** (marche identique web/iOS/Android, sans
  dépendance native ; couvre « mettre le groupe 2 devant le groupe 1 »). Appliqué sur l'accueil.
- **Infos affichées** : interrupteurs **Cagnotte** / **Membres** sur la carte du défi. Extensible
  avec l'écran Statistiques (noté à l'écran).

**Choix de stockage : local (AsyncStorage), pas en base.** C'est un confort d'affichage par
appareil — pas une donnée métier partagée. Évite table + RLS + réseau, réponse instantanée. La
synchro multi-appareils, si un jour souhaitée, se branchera sans toucher aux écrans. Helpers purs
`orderGroups` / `moveInList` (testés).

## 7. Strava : l'erreur ne sera plus muette ⚠️

**Cause du bug** (« ça s'est fermé comme si ça marchait, puis on me redemande de me connecter ») :
`connect()` renvoyait `null` en cas d'échec de l'échange de jeton, et l'écran **l'ignorait en
silence** → aucune session enregistrée → reconnexion redemandée.

**Corrigé** : `connect()` renvoie maintenant `{ token, error }` et **les 3 écrans** (Paramètres,
compte Strava, sélecteur de preuve) **affichent la raison**. Tu verras donc enfin *pourquoi* ça
échoue.

> **Action backend requise** : l'échange du code contre un jeton passe par l'Edge Function
> `strava-token` (le *client secret* doit rester serveur). Il faut : (1) fonction déployée, (2)
> secrets `STRAVA_CLIENT_ID` + `STRAVA_CLIENT_SECRET` configurés, (3) *Authorization Callback Domain*
> de l'app Strava correct. Le message d'erreur affiché indique lequel manque.

**Correctif suivant (CORS web)** : une fois connecté, le chargement des **activités** échouait sur le
**web** — l'API Strava n'envoie pas d'en-têtes CORS, un `fetch` navigateur est donc bloqué. Les
activités passent désormais elles aussi par l'Edge Function (nouvelle action `activities`, proxy
serveur), ce qui règle web + natif. **⚠ L'Edge Function `strava-token` doit être RE-DÉPLOYÉE** avec
le contenu mis à jour (aucun nouveau secret). Le proxy renvoie toujours 200 en encodant le statut
Strava dans le corps, pour que le client distingue un token révoqué (401) d'une panne générique.

**Correctif final (scope `403 Forbidden`)** : une fois le proxy en place, le message diagnostic a
révélé la vraie cause — **`Strava 403 Forbidden`** au chargement des activités. Le jeton était
**valide** (le compte se connectait, le nom s'affichait) mais **sans le scope `activity:read_all`** :
Strava avait accordé la seule permission de base. Racine du problème : `approval_prompt: "auto"` —
quand un compte a **déjà** autorisé l'app une fois, `auto` fait **sauter l'écran de consentement** à
Strava, qui réémet alors un jeton gardant l'**ancien** scope. Reconnecter ne servait donc à rien.

- **Fix** : `approval_prompt: "force"` (dans `useAuthRequest`, [`lib/strava.ts`](../../lib/strava.ts))
  → l'écran de consentement réapparaît à chaque connexion, le scope activités est bien (re)demandé.
- **Message dédié** : nouvelle fonction pure `describeStravaError` ([`features/sessions/strava.ts`](../../features/sessions/strava.ts))
  partagée par l'écran compte Strava et le sélecteur de preuve — un **403** affiche désormais « Strava
  n'a pas donné accès à tes activités… reconnecte-toi en autorisant *Voir tes activités* », un **401**
  invite à se reconnecter, le reste remonte le message brut. Testée (+5 tests).
- **Action Romain** : **déconnecter** Strava dans l'app puis **reconnecter** — l'écran de consentement
  Strava réapparaîtra ; **laisser cochée** la case « *View data about your activities (including
  private)* ». Après ça, les activités se chargent.

**Round de diagnostic (force appliqué mais toujours 403, case cochée)** : signe que le blocage n'était
plus forcément le scope. On instrumente pour lever le doute :

- **Scope réellement accordé, capté et affiché** : `result.params.scope` (retour d'autorisation, seule
  source où Strava le donne) est stocké dans la session (`StravaSession.scope`) et **affiché sous
  « Compte connecté »** (en **ambre** s'il manque `activity:read`, via `stravaScopeHasActivityRead`).
  On voit donc en clair si le jeton a le droit « activités ».
- **Détail Strava dé-masqué** : l'Edge Function joint désormais le tableau `errors` au message (ex.
  `activity:read_permission:missing` vs `rate limit:exceeded`) ; `describeStravaError` ajoute une
  **branche « limite d'API »** (403 « Rate Limit Exceeded » → patienter ~15 min, rien à reconnecter) et
  conserve le message brut entre crochets. +tests.

**Verdict du diagnostic (scope OK mais 403 persiste)** : à l'écran, **« Accès : read,activity:read_all »**
→ le scope EST accordé. Et l'erreur est un **`Strava 403: Forbidden` nu** (ni « Rate Limit Exceeded »,
ni « Authorization Error », ni « Limit of connected athletes exceeded » — qui ont chacun un message
distinct côté Strava). Un « Forbidden » nu **alors que le scope demandé est bien renvoyé dans l'URL de
retour** = signature d'une **autorisation restée partielle côté Strava** : Strava renvoie le scope
demandé mais conserve un ancien consentement incomplet, que `approval_prompt=force` ré-affiche sans
toujours le **purger**.

- **Remède** : **révoquer l'app sur [strava.com/settings/apps](https://www.strava.com/settings/apps)**
  (le « Déconnecter » in-app ne purge QUE le stockage local, pas le consentement serveur Strava), puis
  **reconnecter** dans l'app → Strava émet un consentement propre avec le bon scope.
- Message 403 de `describeStravaError` réécrit en ce sens (« va sur strava.com/settings/apps, révoque
  Sport motiv, puis reconnecte »), le mot « scope manquant » retiré (trompeur : le scope est là).
**🟥 CAUSE RACINE CONFIRMÉE — quota d'athlètes de l'app Strava (rien à voir avec le code)** : après
révocations, Strava a fini par afficher le message explicite **« Erreur 403 : limite d'athlètes
connectés dépassée »**. Une application Strava neuve est en **« Single Player Mode » = 1 athlète
autorisé** (le propriétaire, pour ses propres données — ce qui suffit à notre usage). Le compteur
d'athlètes connectés a été **saturé par nos dizaines de connexions/révocations de test**. C'était **déjà
la cause du `403 Forbidden` initial** (l'API renvoie « Forbidden » nu ; la page d'autorisation, elle,
donne le message complet). Le **scope n'a jamais été le problème** — piste confirmée par l'affichage
`read,activity:read_all`.

- **Rien à corriger côté code app.** L'app se contente désormais de **reconnaître** cette erreur
  (`describeStravaError` : branche « quota d'athlètes ») pour **cesser de conseiller la reconnexion**
  (qui aggrave le compteur). +test.
- **Résolution (côté Strava, Romain)** :
  1. [strava.com/settings/apps](https://www.strava.com/settings/apps) → **révoquer TOUTES** les entrées
     « Sport motiv ».
  2. [strava.com/settings/api](https://www.strava.com/settings/api) → vérifier le **compteur d'athlètes
     connectés** de l'app ; attendre qu'il retombe (peut avoir un délai côté Strava).
  3. **Connecter UNE seule fois** depuis l'app — puis **ne plus churner**. En Single Player Mode, 1
     connexion (le proprio) est dans la limite.
  4. Si le compteur reste bloqué > 1 : demander une **hausse de quota** via le *Developer Program form*
     (section « Athlete Capacity » de la [doc rate-limits](https://developers.strava.com/docs/rate-limits/)),
     délai ~1–3 semaines. Non nécessaire pour un usage perso si le compteur redescend.
- **Leçon** : l'aller-retour révoquer/reconnecter que j'avais conseillé a nourri le compteur ; à
  refaire, connecter **une** fois et laisser tel quel.

Réf. Strava : [Single Player Mode / 1 athlète](https://communityhub.strava.com/developers-api-7/number-of-athletes-allowed-to-connect-1-11078),
[trop d'athlètes en test](https://communityhub.strava.com/developers-api-7/mistake-403-too-many-athletes-10264),
[augmenter le quota](https://communityhub.strava.com/developers-api-7/how-to-increase-the-number-of-athletes-allowed-to-connect-for-my-api-application-2432).

## 8. Logo Strava

Nouveau composant SVG [`StravaLogo`](../../components/brand/StravaLogo.tsx) (orange de marque
`#FC4C02`) à la place de l'icône générique — dans la **ligne des Paramètres** et sur le **rond de
connexion** de l'écran Strava.

## 9. Icônes des paramètres colorées

`IconTile`/`Row` acceptent un **ton** (coral / ambre / menthe / rouge, + orange Strava). Chaque
réglage a sa couleur assortie à un fond doux — on reste dans la DA chaude (pas de bleu/violet qui
jureraient).

---

## Tests ajoutés (+15)

| Fichier | Couvre |
|---|---|
| [home-order.test.ts](../../features/home/__tests__/home-order.test.ts) | `orderGroups` (défi en avant, nouveau à la fin, id obsolète ignoré), `moveInList` (bornes, immutabilité) |
| [home-stats.test.ts](../../features/home/__tests__/home-stats.test.ts) | `weekSessionStatuses` (mapping jour, priorité validée>attente>refus, filtres) ; `buildHistory` (jour/semaine/mois, borné au défi, échelle) — remplace l'ancien `historyBars` |

## Fichiers touchés (principaux)

- **Ma semaine / historique** : `features/home/home-stats.ts` (+`weekSessionStatuses`,`buildHistory`,
  −`historyBars`), `components/home/{WeekPlanner,WeeklyHistory}.tsx`, `app/(tabs)/index.tsx`
- **Perso accueil** : `features/home/home-order.ts`, `lib/home-prefs-store.ts`,
  `app/account/home-layout.tsx`, `app/settings.tsx`, `components/home/ChallengeHero.tsx`, `app/_layout.tsx`
- **Séance / refus** : `features/sessions/queries.ts`, `components/sessions/SessionDetailSheet.tsx`
- **Strava** : `lib/strava.ts`, `components/brand/StravaLogo.tsx`, `app/settings.tsx`,
  `app/account/strava.tsx`, `components/sessions/StravaProofPicker.tsx`
- **Paramètres (couleurs)** : `app/settings.tsx`
- **Rappels** : `supabase/sql/045_weekly_reminder.sql`, `app/notifications.tsx`
- **Divers** : `components/home/RecentSessions.tsx` (bouton)

## À noter / suites possibles

- **Strava** : le correctif client est complet ; la connexion effective dépend du déploiement de
  l'Edge Function (voir §7).
- **Stats d'accueil** : l'ossature de personnalisation est là (Cagnotte/Membres) ; elle s'enrichira
  avec l'écran **Statistiques** (étape 20).
- Aperçus avant adhésion : `max_sessions_per_day` toujours à ajouter aux RPC `get_group_preview*`
  (report étape 17, non bloquant).
