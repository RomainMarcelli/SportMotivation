# Sport Motiv — Handoff complet (reprise de projet)

> **À lire en premier si tu reprends ce projet.** Ce fichier se veut auto-suffisant :
> il rassemble la vision, la stack, les règles métier, la DA, toutes les fonctionnalités
> déjà en place, ce qui reste à faire, les pièges connus et les conventions de travail.
> Les autres docs (référencés au fil du texte) creusent chaque point.
>
> Documents-frères : [`.claude/PROGRESS.md`](PROGRESS.md) (tableau de bord des étapes),
> [`.claude/DA.md`](DA.md) (design system détaillé), [`.claude/PROJECT.md`](PROJECT.md),
> [`.claude/reports/`](reports/) (un rapport par étape), [`docs/`](../docs/) (specs, setup,
> guides Strava/Google/Storage), [`maquette/V3/*.html`](../maquette/V3/) (les maquettes,
> **source de vérité UI**).
>
> Dernière mise à jour : audit de stabilisation streaks/badges/stats du 3 septembre 2026.
> État SQL constaté côté Supabase : **jusqu'à `070_group_interests_location.sql`**.
> Correctif forward-only **`071_stabilize_gamification.sql` à exécuter** après revue ; ne pas rejouer 060–070.
> Après 071, exécuter aussi `security_abuse.test.sql` (35 assertions) puis
> `gamification_stabilization.test.sql` (12 assertions), tous deux transactionnels avec rollback.

---

## 1. Ce qu'est l'app (concept)

**Sport Motiv** aide des **groupes d'amis (2 à ~10)** à faire du sport régulièrement, par
trois leviers : **engagement social**, **perte financière** (plus motivante que le gain) et
**récompense collective**.

Principe : on crée un **défi** de groupe sur une durée (ex. 3 mois). Chacun s'engage sur un
**nombre de séances par semaine** et une **pénalité par séance manquée**. Chaque séance est
**déclarée avec une preuve** (photo in-app / Strava / lien), puis **votée** par les autres
membres. Les séances manquées génèrent des **pénalités** qui alimentent une **cagnotte
commune**, débloquée en fin de défi pour une sortie collective. S'ajoutent : **blâmes**
(séances jugées non honnêtes), **excuses** (standard / majeure), **jokers** mensuels,
**classement** intra-groupe.

Langue de l'app et du code (commentaires, libellés) : **français**.
Public : mobile (iOS/Android), **mais la revue se fait sur navigateur en viewport mobile ~390 px**.

Spécification complète : [`docs/SPECIFICATIONS_MVP.md`](../docs/SPECIFICATIONS_MVP.md).

---

## 2. Stack technique (versions réelles — cf. `package.json`)

| Domaine | Choix |
|---|---|
| Framework | **Expo ~54** (SDK 54) + **Expo Router v6** (routing par fichiers) |
| Runtime | **React Native 0.81**, **React 19** |
| Cible | iOS + Android + **Web** (`react-native-web ~0.21`) |
| Styles | **NativeWind v4** + **Tailwind CSS v3** (`darkMode: "class"`, **dark-first**) |
| Backend | **Supabase** (Postgres + Auth + Storage + RLS) — `@supabase/supabase-js ^2` |
| Data serveur | **TanStack Query v5** (`@tanstack/react-query`) |
| État client | **Zustand v5** |
| Formulaires | **react-hook-form** + **Zod v4** (`@hookform/resolvers`) |
| Icônes | **lucide-react-native** (⚠ **zéro emoji**, uniquement lucide) |
| Animations | **react-native-reanimated v4** (+ `react-native-worklets`) |
| Dégradés | **expo-linear-gradient** · SVG : **react-native-svg** · QR : **react-native-qrcode-svg** |
| Polices | **Bricolage Grotesque** (display) + **Plus Jakarta Sans** (body) via `@expo-google-fonts/*` |
| Auth tierce | Google OAuth (optionnel) · **Strava** OAuth (`expo-auth-session`, `expo-web-browser`) |
| Média | `expo-camera`, `expo-image-picker`, `expo-image`, `expo-location`, `expo-file-system` |
| Tests | **Jest** (`jest-expo`) + `@testing-library/react-native` |
| Langage | **TypeScript strict, aucun `any`** |

> ⚠ **Expo a beaucoup changé** : lire la doc versionnée exacte
> <https://docs.expo.dev/versions/v54.0.0/> avant d'écrire du natif (rappel de `AGENTS.md`).

---

## 3. Règles de travail non négociables

Ces règles priment sur tout le reste. Les casser = travail refusé.

1. **Romain fait les commits et les commandes git lui-même.** Ne jamais lancer `git commit`,
   `git push`, ni aucune commande git. On propose au besoin un message de commit, c'est tout.
2. **SQL à exécuter → écrit dans `supabase/sql/NNN_*.sql`**, jamais collé dans le chat, jamais
   exécuté par l'assistant. Romain les exécute lui-même dans Supabase.
3. **Libs natives : `npx expo install`**, jamais `npm install` (versions alignées au SDK).
4. **Sécurité** : ne **jamais** exposer la `service_role key` côté client. Uniquement l'`anon key`
   avec préfixe `EXPO_PUBLIC_`. La RLS Supabase est la ligne de défense — jamais la désactiver
   sans justification écrite dans [`docs/DECISIONS.md`](../docs/DECISIONS.md).
5. **UI 100 % issue des maquettes** `maquette/V3/*.html`. Ne pas inventer d'écran ni de style.
   **Zéro emoji** (icônes lucide), **dark-first** (jamais de blanc pur), animations d'entrée
   staggerées, `prefers-reduced-motion` respecté.
6. **iOS + Android + Web** : chaque écran doit fonctionner **et bien rendre en viewport mobile
   ~390 px sur navigateur** (voir §10, pièges web).
7. **TypeScript strict, pas de `any`.** Avant de clore une tâche : **`npx tsc --noEmit` ✅ +
   `npx jest` ✅**. Tests Jest systématiques (logique pure ~100 %, UI 60–70 %).
8. **Documenter en continu** : un rapport par étape dans `.claude/reports/etape-NN-*.md`, et
   mettre à jour `.claude/PROGRESS.md`.
9. **Poser des questions** quand un choix produit est ambigu, plutôt que deviner. Ne pas
   inventer de backend en silence : signaler les manques.
10. Commentaires de code **en français**, denses en « pourquoi » (le code du repo explique
    systématiquement la raison d'un choix, pas seulement ce qu'il fait — garder ce style).

---

## 4. Design system (DA)

DA **sombre et chaude** (« ember/brown »), premium, sans emoji. Détail complet et rôles
typographiques dans [`.claude/DA.md`](DA.md). Source de vérité code : `constants/colors.ts`,
`constants/fonts.ts`, `tailwind.config.js`.

### Couleurs (tokens)
| Token | Valeur | Usage |
|---|---|---|
| `ink` | `#15100C` | fond d'écran |
| `ink2` | `#1B140E` | tab bar / dégradés de pied |
| `surface` | `#231A12` | cartes, inputs, boutons icône |
| `surface2` | `#2D2218` | surface surélevée / état actif |
| `line` / `line2` | `rgba(255,238,221,.08)` / `.13` | séparateurs |
| `coral` | `#FF6A45` | **accent principal** |
| `amber` | `#FFB23E` | accent 2 / argent / warning |
| `mint` | `#5FE0A8` | succès / validé |
| `red` | `#F2554A` | danger / refusé / suppression |
| `cream` / `creamDim` | `#FBEEDD` / `#B7A18B` | texte principal / secondaire |
| `onCoral` `onMint` `onAmber` `onAvatar` | `#23120A` `#0C2C20` `#3A2406` `#1A1006` | texte/icône **sur aplat coloré** |

Chaque accent a sa version `…Soft` (~15 % d'opacité) pour les fonds de pastille. Dégradés :
**brand** (coral→amber, CTA/marques), **green** (validation), **amber** (cagnotte).

### Typographie
- **Display** = Bricolage Grotesque (titres, chiffres/stats, libellés de boutons).
- **Body** = Plus Jakarta Sans (paragraphes, champs, labels, chips).
- Gestion **par graisse** (familles dédiées, **jamais** `fontWeight` → évite le faux-gras
  Android). Classes : `font-display*`, `font-body*`. Tracking : `tracking-tighter/-tight/-label/-eyebrow`.

### Rayons / espacement / animations
- Rayons : inputs **14**, chips **13**, cartes **18**, héro/vote **24**, sheets **~28–36**, pills/avatars pleins.
- Padding horizontal écran **18**, gap listes **16**, CTA hauteur **56**, bas de page **96** (tab bar).
- Animations : entrées staggerées (`Reveal`, ~16 px, 450–600 ms, délai 40–80 ms/pas), **count-up**
  ease-out cubique, **anneau** de progression tracé au `strokeDashoffset`, sheen sur CTA. Tout est
  gelé si `prefers-reduced-motion` (via `useAppReducedMotion` = système **ou** réglage manuel).

> ⚠ **Thème clair non implémenté** : toute la DA est écrite en sombre, et **aucune maquette
> claire n'existe**. L'option « Clair »/« Auto » des Paramètres est **volontairement grisée**.
> L'implémenter suppose d'abord une palette validée par Romain (≈600 couleurs en dur, 58 fichiers).

---

## 5. Règles métier (le cœur du produit — toute violation = bug)

1. **Semaine** : lundi **00 h 00** → dimanche **23 h 59**, fuseau **Europe/Paris** (jamais UTC).
2. **Verrouillage de l'objectif** : le nombre de séances/semaine choisi par un membre **à son
   entrée** est **figé pour toute la durée du défi**. Aucune modification en cours de route.
3. **Pénalité par membre** : l'admin fixe une pénalité **par défaut** à la création. À l'entrée,
   chaque membre peut fixer **librement** la sienne (même inférieure). En cours de défi, l'admin
   peut **proposer** un changement aux autres (ils acceptent/refusent via notification) ; **pour
   lui-même il applique directement** (pas d'auto-proposition).
4. **Preuve & anti-fraude** : photo prise **dans l'app** (caméra) = idéal, avec **horodatage +
   géolocalisation** stockés dans `session_proofs`. Pragmatique multi-plateforme : sur **web /
   galerie**, la **date EXIF de la photo doit correspondre au jour déclaré** (contrôle
   `checkProofDate`). Autres preuves : **Strava** (données récupérées) ou **lien externe** (+
   description). Anti-triche = preuve + vote collectif + blâmes.
5. **Vote** : tous les membres votent **OUI/NON** ; l'**auteur ne vote pas** sa séance. Vote
   **public** (on voit qui a voté quoi). **Égalité = validé** (bénéfice du doute). **Échéance
   effective = max(règle du groupe, publication + 24 h)** — règle = jour même 23 h 59 **ou**
   dimanche 23 h 59, le +24 h garantit toujours 24 h pour voter (SQL 054). On ne clôt **avant
   l'échéance que si TOUT LE MONDE a voté** ; sinon on attend l'échéance (pour que les retardataires
   restent blâmables). **À l'échéance : refus majoritaire → refusée, sinon VALIDÉE par défaut**
   (plus de statut « expired »). Notifs de verdict à l'auteur + notif à chaque refus (043).
6. **Blâmes = VOTES MANQUÉS** ⚠ (refonte 054, ancien modèle « séance rejetée » abandonné) :
   **1 blâme quand tu ne votes PAS** une séance d'un autre avant l'échéance (anti-collusion : ne pas
   voter aide l'auteur — validée par défaut — et te pénalise). Distribués par le cron horaire
   `resolve_pending_votes`, sauf **auteur** et **suspendus**. Au **seuil** (`blame_threshold`, 3 par
   défaut) → **pénalité** (montant du membre) + on solde `seuil` blâmes (cascade : 7 = 2 pénalités) +
   **notif à l'admin**. L'**excuse ne dispense PAS** de voter ; seule la **suspension** exonère.
   Libellé cagnotte : **« Vote manqué »**.
6bis. **Suspension** (Chantier 4, SQL 052/053) : un membre **suspendu** (période à date de fin) est
   **exonéré de tout** (blâmes ET pénalités « séance manquée »). L'**admin** suspend directement, ou
   un **joueur demande** (motif obligatoire) → l'admin **accepte / refuse**. Notifs à chaque étape.
   Table `suspensions` + helper `is_suspended`. (UI DA : en cours.)
7. **Excuses** (déclarées à l'avance, motif obligatoire, soumises au vote majoritaire) :
   - **standard** acceptée → objectif de la semaine **réduit de 1** ;
   - **majeure** acceptée (hospitalisation, blessure grave…) → **semaine remise à zéro**, aucune
     pénalité possible. Philosophie **volontairement stricte** (maladie bénigne/vacances ≠ excuse).
8. **Joker** : **1 par membre et par mois** pour annuler une séance manquée **sans pénalité ni vote**.
9. **Clôture hebdo** (dimanche 23 h 59, traitement à venir côté Edge Function) : pour chaque membre,
   séances validées vs objectif → **1 pénalité par séance manquante** (= pénalité du membre),
   ajoutée à la cagnotte + notifications. **Cagnotte V1 = virtuelle** : pas de paiement intégré, un
   **trésorier** coche manuellement les paiements reçus, l'**admin débloque** en fin de défi.
10. **Départ d'un membre** : sa contribution **reste** dans la cagnotte par défaut (l'admin peut
    exceptionnellement rembourser) ; il peut être réinvité plus tard.
11. **Séance partagée entre défis** : si on est dans plusieurs défis, **une seule déclaration**
    peut être **publiée dans plusieurs groupes** à la fois (cases à cocher). Techniquement une
    **ligne par groupe reliée par `shared_id`** ; **une seule notification** par personne même si
    l'auteur est commun à plusieurs de tes groupes, et **le vote se propage aux jumelles** (chaque
    groupe tranche pour lui, mais ton vote vaut pour toutes celles que tu partages).
12. **Confidentialité** (`users.is_searchable`, **public par défaut**) : en **privé**, on
    n'apparaît **plus dans la recherche par pseudo** ; code d'invitation, lien et QR marchent
    toujours. En public, c'est **n'importe qui** (pas « tes amis » — le système d'amis n'existe pas
    encore) qui peut te trouver. **Finalité visée** : quand les amis existeront (Étape 18), le mode
    privé devra rester **trouvable par ses amis uniquement**.
13. **Inviter est ouvert à tout membre** (pas seulement l'admin) : n'importe quel membre peut
    chercher quelqu'un par pseudo et l'inviter (l'invité accepte ensuite). Cohérent avec le
    code/QR déjà partageable par tous. Seule la **gestion** des invitations envoyées
    (renvoyer/annuler, vue d'ensemble) reste réservée à l'admin.
15. **Limite de séances par jour** (`groups.max_sessions_per_day`, **défaut 3**, `NULL` = illimité) :
    contrôlée côté serveur dans `declare_session` (`DAILY_LIMIT_REACHED`). Au-delà, le joueur
    demande à l'admin (`request_session_limit`), qui accorde **+1 pour ce jour précis**
    (`grant_session_limit` → table `session_day_grants`). Les copies vers d'autres défis
    (`publish_session_to_my_groups`) ne repassent pas ce contrôle.
16. **Ajout d'un sport hors liste** — trois issues côté admin depuis la notification : **ajouter**
    (1 tap, prévient tout le groupe), **refuser** (commentaire facultatif → notif au demandeur), ou
    **lancer un vote** de groupe (`start_activity_vote` → chacun vote oui/non depuis sa notif,
    **majorité stricte des membres, égalité = pas ajouté** ; tables `activity_proposals` /
    `activity_proposal_votes`).
17. **Résultat d'une séance** : l'auteur est prévenu à **chaque refus d'un membre**
    (`session_refused_by_member`, avec l'explication) et du **verdict final**
    (`session_validated` / `session_rejected`, à la résolution). **Pas** de notification par vote « oui ».
18. **Demande d'assouplissement de règle** : gêné par « le jour même » ou une autre règle, un membre
    peut **demander un assouplissement** (`request_rule_change` → la notif de l'admin ouvre
    « Modifier le défi », car une règle vaut pour tout le monde). Le sport hors liste, lui, part par
    la voie de l'item 16.

**Hors périmètre V1 (NE PAS implémenter)** : paiements réels, chat interne, intégrations Apple
Health/Google Fit/Garmin/Nike, streaks/badges, classements inter-groupes, monétisation, pénalités
progressives.

---

## 6. Architecture du dépôt

```
app/                    Écrans (Expo Router, routing par fichiers) — voir §7
components/
  ui/                   Primitives DA (Button, GradientButton, TextField, Card, Avatar, Toggle,
                        BottomSheet, Reveal, Chip, Badge, ProgressBar, CountUp, SegmentedControl…)
  home/ groups/ sessions/ profile/ auth/ excuses/ feedback/   Composants par domaine
features/               Logique métier + hooks React Query, PAR DOMAINE :
  auth/ groups/ sessions/ votes/ excuses/ notifications/
  settings/ profile/ home/ plans/ dev/
  (chaque domaine : queries.ts, mutations.ts, schemas.ts, helpers purs, __tests__/)
lib/                    Utilitaires transverses (supabase, auth-store, query-client, date,
                        duration, strava, shadow, sports, count-up, ring, theme-store,
                        motion-store, web-input, invite-link…)
hooks/                  useProfile, useAppReducedMotion, useFocusReplay, use-color-scheme…
constants/              colors, fonts, avatars, activities, legal, roles
types/                  database.types.ts (types Supabase générés + entretenus à la main)
supabase/sql/           NNN_*.sql — migrations à exécuter par Romain (voir §9)
maquette/V3/            Maquettes HTML = SOURCE DE VÉRITÉ UI
.claude/                DA.md, PROJECT.md, PROGRESS.md, HANDOFF.md (ce fichier), reports/
docs/                   Specs, setup, décisions, known issues, guides (Strava/Google/Storage)
```

**Convention** : la **logique pure** (calculs, mappings, formats) vit dans des fichiers sans import
RN → **testée à ~100 %**. Les composants/écrans consomment ces helpers + les hooks React Query.

---

## 7. Carte des écrans (routes)

```
app/_layout.tsx                 Racine : polices, QueryClient, auth gate, Stack.Protected
app/(auth)/
  index.tsx                     Splash/redirection
  onboarding.tsx                3 slides de présentation
  sign-in.tsx                   Connexion email/mot de passe (+ Google si configuré)
  sign-up.tsx                   Inscription EN UN ÉCRAN : avatar, prénom, pseudo, email, mdp,
                                + confidentialité public/privé
app/(tabs)/
  _layout.tsx                   Onglets (barre du bas custom : BottomNav)
  index.tsx                     ACCUEIL : salutation, carrousel de défis, hero (anneau hebdo,
                                cagnotte, membres), dernières séances, état vide si 0 défi
  groups.tsx                    Onglet Groupes : liste si 2+ (si 1 défi → ouvert direct via BottomNav)
  profile.tsx                   Profil : avatar, stats (count-up), mes groupes, cloche notifs,
                                thème (clair/auto grisés), déconnexion, suppression de compte
app/group/
  create.tsx                    Créer un défi (steppers, presets durée, sports, règles, recap)
  join.tsx                      Rejoindre (saisie code)      scan.tsx  Scanner un QR
  join-confirm.tsx              Récap règles + objectif + pénalité + case CGU → rejoindre
  accept-invite.tsx             Accepter une invitation reçue (même flux)
  penalty-response.tsx          Accepter/refuser un changement de pénalité proposé par l'admin
  [id]/
    index.tsx                   DASHBOARD défi : hero cagnotte, onglets Infos/Séances, membres,
                                classement, blâmes, menu ⋮ (inviter, modifier, changer d'admin,
                                quitter, créer/rejoindre un autre défi), popup d'invitation
    declare.tsx                 Déclarer une séance (activité, durée, date, preuve, "compte pour
                                N défis" avec cases à cocher, demandes admin sport/règle)
    vote.tsx                    Voter (deck de séances + excuses, preuve, tally, swipe)
    excuse.tsx                  Déclarer une excuse (standard/majeure, motif, justificatif)
    edit.tsx                    Modifier le défi (admin) : règles + pénalités par membre
    members.tsx                 Liste des membres     invitations.tsx  Invitations envoyées (admin)
app/account/                    password.tsx · email.tsx · strava.tsx  (+ _layout)
app/legal/[doc].tsx             Aide / CGU / Confidentialité (textes provisoires) (+ _layout)
app/notifications.tsx           Boîte de réception in-app (sections par jour, actions inline,
                                swipe-to-delete, "tout marquer lu")
app/settings.tsx                Paramètres : compte, confidentialité, notifications (5 bascules),
                                apparence, langue/région, aide & légal, zone danger
app/profile-edit.tsx            Modifier le profil (avatar, prénom, pseudo)
```

> Écran supprimé récemment : `app/group/[id]/invite.tsx` (remplacé par la popup `GroupInviteSheet`).

---

## 8. Données & backend (Supabase)

### Tables (schéma déjà en place)
`users`, `groups`, `group_members`, `rule_acceptances`, `sessions`, `session_proofs`, `votes`,
`excuses`, `penalties`, `blames`, `pots`, `pot_transactions`, `weekly_plans`, `notifications`,
`group_invitations`, `member_penalty_changes`, `activity_proposals`, `activity_proposal_votes`,
`weekly_closures`, `suspensions` (SQL 052). Vues : `v_member_weekly_status`,
`v_member_unsettled_blames`.

Colonnes ajoutées en cours de route (retenir) : `group_members.penalty_amount` (pénalité par
membre), `users.avatar_color` / `avatar_icon` (avatar bulle), `users.notification_prefs` (jsonb),
`users.is_searchable` (confidentialité), `sessions.shared_id` (séances partagées).

### Types de notification (`notification_type`)
`session_reminder`, `weekly_recap`, `vote_pending_session`, `vote_pending_excuse`,
`excuse_accepted`, `excuse_rejected`, `blame_received`, `penalty_applied`, `member_joined`,
`member_left`, `admin_transferred`, `challenge_ending_soon`, `challenge_completed`,
`session_validated`, `session_rejected`, `group_invitation`, `penalty_change_request`,
`activity_request`, `rule_change_request`, `activity_added`.

> ⚠ `session_validated` / `session_rejected` **existent dans l'enum mais rien ne les crée encore**
> (voir §11, question ouverte).

### Fonctions RPC clés (SECURITY DEFINER, contournent la RLS proprement)
Adhésion : `join_group_by_code`, `accept_invitation`, `invite_user_to_group`,
`get_group_preview_by_id`, `search_users_by_username`, `cancel_invitation`,
`notify_join_from_invitation`. Groupe : `get_my_groups`, `delete_group`, `transfer_admin`,
`leave_group`, `set_my_penalty`. Profil : `upsert_my_profile` (renvoie la ligne écrite depuis
039), `get_my_profile_stats`, `get_my_profile_groups`, `delete_my_account`. Séances/votes :
`publish_session_to_my_groups`, `notify_session_declared`, `resolve_session`, `cast_vote`.
Excuses/jokers : voir `022`–`024`, `use_joker`. Notifications : `set_notification_prefs`,
`wants_notification` + **trigger `filter_notification_by_prefs`** (filtre à l'insertion selon les
préférences). Demandes : `request_group_activity`, `add_group_activity`, `request_rule_change`.

> **Réflexe RLS** : si une donnée ne remonte pas ou qu'un écran dit « introuvable / accès refusé »,
> **suspecter la RLS ou une fonction SECURITY DEFINER en premier**.
>
> **Piège PL/pgSQL à connaître** (nous a coûté deux bugs, cf. `020` et `039`) : `FOUND` reflète la
> **dernière** requête. Un `SELECT COUNT(*)` placé entre un `SELECT … INTO` et un `IF FOUND`
> **écrase `FOUND`**. Toujours capturer l'existence dans une variable booléenne **avant** tout
> autre `SELECT`.

### Stockage & setup externe (à faire côté Supabase par Romain)
- Buckets : `avatars` (public), `session-proofs` (privé), `excuse-justifications` (privé).
  Policies : [`docs/guides/STORAGE_POLICIES.md`](../docs/guides/STORAGE_POLICIES.md).
- **Strava** : Edge Function `strava-token` déployée avec `STRAVA_CLIENT_ID` /
  `STRAVA_CLIENT_SECRET`, et « Authorization Callback Domain » incluant `localhost` (dev web).
  Guide : [`docs/guides/STRAVA_SETUP.md`](../docs/guides/STRAVA_SETUP.md). Le bouton Strava est
  masqué si non configuré (`isStravaConfigured`).
- **Google OAuth** (optionnel) : [`docs/guides/GOOGLE_OAUTH_SETUP.md`](../docs/guides/GOOGLE_OAUTH_SETUP.md).
- **Clôture hebdo + rappels** = Edge Functions + cron, **pas encore branchés** (voir §11).

---

## 9. État des migrations SQL

Fichiers dans `supabase/sql/` numérotés `000`→`056`. **Romain les exécute lui-même, dans l'ordre.**
**Lot en attente d'exécution : `052`→`057`** (Suspension + refonte blâmes + éligibilité vote +
durcissement grants **056** + durcissement RLS **057** — cf. audit 9g). Avant ça, état attendu jusqu'à `049`.
Points d'attention :

- Les `ALTER TYPE … ADD VALUE` (nouvelles valeurs d'enum) doivent être dans un **fichier séparé
  exécuté avant** celui qui les utilise — Postgres refuse d'utiliser une valeur d'enum ajoutée dans
  la **même transaction**, et l'éditeur SQL de Supabase enveloppe un onglet dans une transaction.
  (C'est pour ça que `038_notification_types.sql` précède `039`, comme `003`/`008` avant eux.)
- **Fonctions de cron/interne = `REVOKE ALL … FROM PUBLIC`** (elles tournent sous le propriétaire,
  jamais depuis le client). Précédents : `send_weekly_reminders` (045), `delete_account_internal`
  (031/033), et `resolve_pending_votes`/`apply_session_blames` (**056**, correctif : sinon appelables
  via PostgREST avec un `lookback` qui contourne le garde-fou anti-blâme-rétroactif).
- Avant la prod : **supprimer** `dev_reset_excuse_joker` (outil de test, `027`), et **remplacer les
  textes légaux provisoires** (`constants/legal.ts`).
- Checklist d'exécution : [`docs/guides/SQL_CHECKLIST.md`](../docs/guides/SQL_CHECKLIST.md).
- **Sécurité (audit 9g — ✅ VALIDÉ 32/32)** : `supabase/tests/` = diagnostic lecture seule (`rls_posture.sql`,
  `rls_policies.sql`) + socle **pgTAP** (`security_abuse.test.sql`, 32 tests d'abus, **tous verts sur la base
  réelle**). Diagnostic → RLS **ON partout**, lectures correctes. **Findings corrigés par `056`+`057`** :
  🔴 `delete_account_internal` appelable par anon/authenticated (suppression de compte par UUID !) ;
  🔴 auto-validation de séance / bourrage de votes / auto-adhésion admin (policies d'écriture trop larges) ;
  🟠 fonctions internes exposées ; `search_path` manquant sur `is_group_admin`/`handle_new_user`.
  **Leçon** : le `REVOKE … FROM PUBLIC` NE suffit PAS (Supabase re-grant anon/authenticated) → toujours
  `REVOKE … FROM PUBLIC, anon, authenticated`. Rapport : [`reports/etape-09g-audit-securite-rls-pgtap.md`](reports/etape-09g-audit-securite-rls-pgtap.md).

---

## 10. Pièges plateforme (durement appris)

L'app tourne aussi **sur le web**, et plusieurs bugs venaient d'un comportement web silencieux.
À garder en tête systématiquement :

- **`onMomentumScrollEnd` ne se déclenche PAS sur web** → dériver l'état de scroll d'un carrousel
  via `onScroll` (`scrollEventThrottle=16`), pas du momentum.
- **`gap` sur le `contentContainer` d'une `SectionList`/`FlatList` n'est pas appliqué sur web** →
  utiliser une **marge par ligne** (`marginBottom`) plutôt que `gap`.
- **Les callbacks de fin d'animation Reanimated** (`withTiming(..., cb)`) **peuvent ne pas se
  déclencher** sur web (perte de focus, re-render) → ne **jamais** faire dépendre une action
  fonctionnelle (envoi de vote, navigation) d'un callback d'animation. L'animation est un décor.
- **Champs de saisie web** : Chrome/Safari posent un **anneau de focus** par-dessus la bordure DA →
  neutralisé par `lib/web-input.ts` (`WEB_INPUT_RESET`), **sans** retirer notre propre état focus.
- **Caméra/EXIF** absents sur web → parcours photo web = galerie + contrôle de date EXIF.
- **Ombres/glow** : `elevation` (Android) est ignorée sur web → toujours passer par
  `lib/shadow.ts → glow()` (rend `shadow*`+`elevation` en natif, `boxShadow` sur web). Jamais de
  `shadow*` en dur.
- **SafeArea** : insets = 0 sur web → ne pas dépendre du padding SafeArea pour l'espacement.
- **SSR (Expo Router rend en Node au build web)** : ne jamais toucher `window`/`document`/
  `localStorage`/`WebSocket` au niveau module sans garde (`typeof x === "undefined"` /
  `Platform.OS`). Cf. `lib/supabase.ts`.
- **Dégradés** : `expo-linear-gradient`, **jamais** sous une layout-animation `entering` (casse le
  rendu Android) → d'où le composant `Reveal` (fade+translate manuel).

Détails supplémentaires : [`docs/KNOWN_ISSUES.md`](../docs/KNOWN_ISSUES.md).

---

## 11. État d'avancement

Suivi vivant : [`.claude/PROGRESS.md`](PROGRESS.md). Rapports détaillés : [`.claude/reports/`](reports/).

### ✅ Fait
- **0** Design system (DA, tokens, composants) · **1** Auth (onboarding, sign-in, **inscription en
  un écran** avec avatar + confidentialité). L'ancienne « Setup profil » est **fusionnée** dans
  l'inscription (le groupe `(setup)` a été supprimé).
- **3** Accueil (carrousel de défis, hero anneau/cagnotte/membres, dernières séances, état vide).
- **4** Création & adhésion (create, join, join-confirm, scan, accept-invite).
- **5** Dashboard défi (Infos/Séances, membres, classement, blâmes).
- **6** Déclarer une séance (preuves photo/Strava/lien, **publication multi-défis**).
- **7** Voter (deck séances + excuses, résolution).
- **8** Excuses (standard/majeure + joker mensuel).
- **9** Cagnotte (vue trésorier) : détail par membre, historique par semaine, trésorier (= admin en V1)
  coche les paiements, relance des retardataires (SQL 046). Accès = carte cagnotte du dashboard cliquable.
- **9b** Clôture hebdo (SQL 047, cron `weekly-closure`) : chaque lundi, séances manquées de la semaine
  écoulée → pénalités (montant du membre) → **alimente la cagnotte** + notif. Gère excuses (majeure =
  annulée, standard −1) et joker (annule 1 manquée). Idempotent, sûr même avec trigger pot, DST-safe.
- **9c** ~~Blâmes → pénalité (SQL 048, trigger « rejeté »)~~ **SUPERSEDED par 9d.**
- **9d** ⚠ **Refonte blâmes + Suspension.** Blâme = **vote manqué** (ne pas voter à l'échéance), plus
  « séance rejetée ». SQL **054** : échéance effective (+24 h), `resolve_session` v3 (clôture anticipée
  seulement si participation complète, plus d'`expired`, validée par défaut), cron horaire
  `resolve_pending_votes` (résout + blâme les non-votants sauf auteur/suspendus, seuil → pénalité +
  cascade + notif admin), **trigger 048 retiré**. **Suspension** SQL **052/053** : table `suspensions`,
  `is_suspended`, RPC (admin_suspend / request / decide / cancel / get_group_suspensions), clôture hebdo
  qui **exonère les suspendus**. Front : `features/suspensions/*` (logique pure + hooks), miroir
  `vote-logic` réaligné, rename **« Blâme atteint » → « Vote manqué »**, visuels notifs. **#6 déjà fait
  en 043.**
- **9f** **UI Suspension** : écran `app/group/[id]/suspensions.tsx` (route + menu ⋮ + notifs `suspension_*`
  qui l'ouvrent au tap). Admin : suspendre (picker membre + dates `DateField` + motif), Accepter/Refuser
  les demandes, Lever. Joueur : demander (dates + motif obligatoire), retirer. Branché sur les hooks
  `features/suspensions/*`. Chantier 4 **complet** (backend 052/053 + front).
- **9e** Lot retours (6 items) : (1) dates de déclaration **bornées à la période du défi** ;
  (3) « Retour au groupe » après vote → **vrai** dashboard du défi ; (6) **éligibilité de vote** : un
  membre ne vote pas une séance publiée **avant son arrivée** (deck `useVotableSessions` + SQL **054/055**,
  garde serveur `JOINED_AFTER_PUBLICATION`) ; (4) **Strava indexé par user id** (clé `strava-session:<uid>`
  au lieu d'une clé globale → plus de « connecté en tant que Romain » pour un autre compte) ; (2) onglet
  groupe **« À voter »** (conditionnel, séances des autres) + **CTA « Voter »** dans `SessionDetailSheet`
  (règle « je clique, rien ne se passe ») + section **« À valider »** sur l'accueil ; (5) **animation
  « switch »** (reanimated `LinearTransition`) dans Organiser l'accueil — vrai glisser-déposer = lib à évaluer.
- **10** Gestion des invitations (statuts, renvoyer/annuler).
- **11** Notifications in-app (liste DA, actions inline). *(Temps réel / push : à faire.)*
- **12** Fin de défi / Clôture : écrans `fin-defi` (podium, classement, « ton bilan ») et `cloture`
  (confettis, grand montant dégradé, « qui a rempli la cagnotte »). **Déblocage** `unlock_pot`
  (admin/trésorier, idempotent) + **auto-complétion** des défis échus (SQL 049, cron
  `complete-challenges`, DST-safe). Bilan **calculé côté client** (module pur testé, aucune RPC de
  reporting). Entrée = bannière « Défi terminé » du dashboard. **Toutes les maquettes V3 sont faites.**
- **Cycle de vie du défi** : un défi est `active` **dès la création** (plus d'étape « lancer »).
  L'affichage (à venir / en cours / terminé) et les pénalités dérivent des **dates**
  (`challenge_start`/`challenge_end`), via `features/groups/challenge-phase.ts` (pur, testé). SQL 051
  migre les `setup` existants et change le défaut ; l'enum `setup` est conservé mais plus produit.
- **13** Profil + **Paramètres** (notifs en base, mot de passe, e-mail, Strava, légal, thème
  verrouillé sombre).
- **14** Séances partagées entre défis · Strava · Aide & légal.
- **15** Navigation (1 défi → ouverture directe), vote (commit immédiat), Strava (endpoints web),
  invitations par pseudo, pénalités par membre.
- **16** **Fix critique adhésion par invitation** (bug `FOUND`/`COUNT`), confidentialité
  public/privé, **fiche séance** en lecture seule, **demandes à l'admin** (sport/règle), **popup
  d'invitation** (remplace l'ancienne page hors DA), durées en `1h10`, anneau tracé.

### ⬜ Reste à faire
- ~~**UI DA — Suspension**~~ **FAIT (9f)** : écran `app/group/[id]/suspensions.tsx` (admin : suspendre
  un membre = picker + dates + motif, + Accepter/Refuser les demandes, + Lever ; joueur : demander +
  retirer). Accès via le **menu ⋮** du dashboard ; les notifs `suspension_*` ouvrent l'écran au tap.
  **Badge « Suspendu »** sur les lignes membres du dashboard (9g).
- ~~**Glisser-déposer**~~ **FAIT (9g)** : « Organiser l'accueil » réordonne les défis en
  **glisser-déposer** (poignée), rangs absolus + reanimated + gesture-handler (web/iOS/Android, sans
  lib tierce), scroll de page coupé pendant le drag. Composant `SortableGroups` dans
  `app/account/home-layout.tsx` (les flèches ↑/↓ sont remplacées).
- **Cagnotte — cycle complet fait** : écran (9), alimentation (clôture hebdo 047 + blâmes 054) et
  **déblocage** en fin de défi (`unlock_pot`, SQL 049, Étape 12). Reste éventuellement un flux de
  **dépense** de la cagnotte (`pots.usage_date`/`usage_description`) — pas de maquette à ce jour.
- ~~**Résolution à l'échéance**~~ **FAIT** (SQL 054, cron `resolve-votes`) : résout les séances échues
  (validée par défaut) + distribue les blâmes aux non-votants. Voir 9d.
- **Rappels de séances planifiées** : distinct du rappel week-end (045) ; + notifications temps réel/push.
- **Notifications temps réel / push** (Expo Notifications) — aujourd'hui seulement in-app.
- **17 — Système d'amis** (demandé) : ajouter quelqu'un en ami puis l'inviter d'un geste, au lieu
  de le rechercher par pseudo à chaque défi.
- **18 — Thème clair** (Romain le veut) : **bloqué** sur une palette claire à concevoir/valider
  (aucune maquette claire n'existe).
- **19 — Écran Statistiques** (idée notée « pour plus tard ») : séances/semaine, sport favori,
  cadence dans le temps, etc.

### ❓ Questions ouvertes (Romain décide)
- ~~Notifier l'auteur quand sa séance est validée/refusée ?~~ **TRANCHÉ + FAIT (043)** : notif au
  résultat final (`session_validated`/`session_rejected`) + notif à chaque refus
  (`session_refused_by_member`). C'était le retour **#6**.
- **`same_day` devient de fait « ≥ 24 h »** avec le filet +24 h (max l'emporte toujours). Fidèle à
  la spec ; si Romain préfère un vrai « jour même » strict pour les publications matinales, à ajuster.
- **Clôture anticipée d'un scrutin** : on n'anticipe plus sur simple majorité (seulement si tout le
  monde a voté), pour garder les non-votants blâmables. Si Romain trouve ça trop lent en petit
  groupe, on pourra ré-autoriser la majorité anticipée (mais ça rouvre une petite faille anti-blâme).

### Maquettes → écran
**Toutes les maquettes V3 ont désormais leur écran** (les 2 dernières, `sport-motiv-fin-defi.html`
et `sport-motiv-cloture.html`, faites à l'Étape 12). `sport-motiv-maquettes.html` est l'index, pas
un écran.

---

## 12. Workflow de contribution (à suivre à chaque tâche)

1. **Comprendre** la demande, lire la/les maquette(s) concernée(s), poser les questions produit
   ambiguës **avant** de coder.
2. **Coder** en respectant DA + règles métier + pièges plateforme. Logique pure isolée et testée.
3. **SQL** éventuel → nouveau fichier `supabase/sql/NNN_*.sql` (jamais exécuté par l'assistant) ;
   mettre à jour `types/database.types.ts` en cohérence.
4. **Vérifier** : `npx tsc --noEmit` ✅ **et** `npx jest` ✅ (ajouter des tests pour toute logique
   nouvelle).
5. **Documenter** : rapport `.claude/reports/etape-NN-*.md` + mise à jour `.claude/PROGRESS.md`.
6. **Livrer** un message clair à Romain (bugs corrigés + *pourquoi*, SQL à exécuter et dans quel
   ordre, points à vérifier de son côté). **Ne pas commiter** — Romain s'en charge.

Le style des rapports et messages : direct, explique la **cause racine** d'un bug (pas seulement le
correctif), signale honnêtement ce qui reste fragile ou reporté.

---

## 13. Index des fichiers à connaître en priorité

| Besoin | Fichier |
|---|---|
| Tokens couleur / dégradés | `constants/colors.ts` · design complet `.claude/DA.md` |
| Polices | `constants/fonts.ts` |
| Client Supabase (garde SSR/web) | `lib/supabase.ts` |
| Auth (store, session) | `lib/auth-store.ts` · `features/auth/` |
| React Query (défauts) | `lib/query-client.ts` |
| Dates / semaine lundi-dimanche | `lib/date.ts` · durées `lib/duration.ts` |
| Anneau de progression | `features/home/ring.ts` · `components/home/ChallengeHero.tsx` |
| Strava (OAuth + endpoints web/natif) | `lib/strava.ts` · `features/sessions/strava.ts` |
| Confidentialité public/privé | `features/settings/privacy.ts` · `components/profile/PrivacyToggleCard.tsx` |
| Préférences notifications | `features/settings/notification-prefs.ts` (+ SQL `035`) |
| Demandes à l'admin (sport/règle) | `features/groups/requests.ts` |
| Popup d'invitation | `components/groups/GroupInviteSheet.tsx` · `components/ui/BottomSheet.tsx` |
| Fiche séance (lecture seule) | `components/sessions/SessionDetailSheet.tsx` |
| Types Supabase | `types/database.types.ts` |
| Suivi projet | `.claude/PROGRESS.md` · rapports `.claude/reports/etape-16-*.md` (le plus récent) |

---

*Fin du handoff. Si un point manque, la vérité est dans le code et dans les maquettes
`maquette/V3/*.html` ; ce document doit être mis à jour à chaque étape pour rester le point
d'entrée unique.*
