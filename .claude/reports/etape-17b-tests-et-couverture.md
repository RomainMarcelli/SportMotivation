# Étape 17b — Durcissement des tests unitaires & couverture de la logique pure

`npx tsc --noEmit` ✅ · `jest` **464/464** ✅ (58 suites). Base de départ : 418/418 (50 suites)
→ **+46 tests, +8 suites**. **Aucun fichier de production modifié** (uniquement des fichiers de
test ajoutés/étendus), aucun commit, aucune commande git, aucun SQL touché.

---

## Objectif

Passer en revue tout le code et **couvrir par un test unitaire chaque fonction pure exportée** qui
n'en avait pas — en restant sur la convention du projet (**logique pure testée à ~100 %**, les
hooks / requêtes / mutations à effets de bord ne sont pas testés en unitaire).

## Méthode — pilotée par la couverture

Plutôt que de deviner, j'ai lancé la couverture restreinte à la logique pure
(`jest --coverage --collectCoverageFrom='features/**/*.ts' 'lib/**/*.ts' 'constants/**/*.ts'`).
Ça a révélé deux catégories de trous :

1. **Fichiers purs sans aucun test** (0 % alors qu'ils sont testables).
2. **Fichiers testés mais avec une fonction pure oubliée** (le motif « `invitationOutcome` » :
   une suite qui importe tout sauf une fonction). Invisible à l'œil, évident en couverture.

Résultat : **toutes les fonctions pures exportées** de `features/`, `lib/` et `constants/` ont
désormais un test. Les fichiers restés à 0 % sont des hooks/queries/mutations Supabase (effets de
bord) — volontairement hors périmètre unitaire.

---

## 8 nouvelles suites (fonctions pures jusque-là non testées)

| Suite | Ce qu'elle verrouille | Pourquoi ça compte |
|---|---|---|
| [features/groups/__tests__/cache.test.ts](../../features/groups/__tests__/cache.test.ts) | `invalidateMembership` — **ensemble exact** des clés invalidées (avec/sans `groupId`) | Garde la régression documentée : le profil était oublié → un groupe rejoint restait invisible dans l'onglet Profil |
| [features/groups/__tests__/rules-snapshot.test.ts](../../features/groups/__tests__/rules-snapshot.test.ts) | `buildRulesSnapshot` / `…FromPreview` — recopie fidèle des règles + horodatage ISO | Un champ oublié dans le snapshot des règles acceptées passerait totalement inaperçu à l'exécution |
| [features/groups/__tests__/leave.test.ts](../../features/groups/__tests__/leave.test.ts) | `mapLeaveError` — dont le match **par sous-chaîne** (différent des autres mappers) | Un code enrobé (`"… LAST_MEMBER …"`) doit rester reconnu |
| [features/excuses/__tests__/mutations.test.ts](../../features/excuses/__tests__/mutations.test.ts) | `mapExcuseError` (10 codes) | Renommer une clé SQL sans mettre à jour le message afficherait un code technique |
| [features/excuses/__tests__/schemas.test.ts](../../features/excuses/__tests__/schemas.test.ts) | `excuseFormSchema` — motif obligatoire, `trim`, borne 500 inclusive | Un motif de seuls espaces ne doit pas passer (le groupe vote dessus) |
| [features/jokers/__tests__/queries.test.ts](../../features/jokers/__tests__/queries.test.ts) | `mapJokerError` | « Déjà utilisé ce mois-ci » doit être clair, pas un code |
| [features/votes/__tests__/mutations.test.ts](../../features/votes/__tests__/mutations.test.ts) | `mapVoteError` (dont `CANNOT_VOTE_OWN`, `ALREADY_VOTED`) | Garde-fous métier du scrutin |
| [lib/__tests__/shadow.test.ts](../../lib/__tests__/shadow.test.ts) | `glow` — props natives **et** conversion hex→rgba de la branche web | RN Web ignore `shadow*` : la chaîne `boxShadow` est le seul rendu, et la conversion hex→rgba est facile à casser. Teste les deux plateformes via bascule de `Platform.OS` |

## 5 suites étendues (fonction pure oubliée)

| Fichier | Fonction ajoutée | Détail |
|---|---|---|
| [notifications/format.test.ts](../../features/notifications/__tests__/format.test.ts) | `invitationOutcome` | Ne tranche pas (`null`) tant que le statut est inconnu/en attente → ne cache pas les boutons d'une invitation encore à traiter |
| [lib/date.test.ts](../../lib/__tests__/date.test.ts) | `formatDateRange`, `formatDbDate` | Structure `fr-FR` (mois en toutes lettres, année sur la fin) + **tolérance** de `formatDbDate` (vide/timestamp/illisible → `""`, jamais d'« Invalid time value ») |
| [groups/schemas.test.ts](../../features/groups/__tests__/schemas.test.ts) | `createGroupFormSchema` | Le schéma réellement câblé à l'écran : refuse la création tant que les règles ne sont pas acceptées, borne l'objectif hebdo 1–14 |
| [settings/support.test.ts](../../features/settings/__tests__/support.test.ts) | `detectTimezone` | Contrat tolérant : fuseau non vide **ou** `null`, jamais d'exception |
| [auth/account.test.ts](../../features/auth/__tests__/account.test.ts) | `deletionMessage` | « supprimé » vs « anonymisé » doivent être **distincts** — sinon on croit ses données effacées alors qu'un historique anonymisé subsiste (cagnotte engagée) |

---

## Détails techniques utiles

- **`glow` / `Platform.OS`** : `glow` lit `Platform.OS` à l'appel. Le test bascule
  `Platform.OS = "web"` (typé, sans `any`) pour couvrir la branche web, puis restaure. La branche
  web est vérifiée au caractère près : `#FF0080 → rgba(255, 0, 128, 0.5)`.
- **`invalidateMembership`** : testé avec un faux `QueryClient` (`{ invalidateQueries: jest.fn() }`).
  L'assertion porte sur l'**ordre et l'ensemble complet** des clés — seul moyen d'attraper un
  « on a oublié une clé ».
- **Dates `fr-FR`** : Node embarque l'ICU complet, `juin`/`août` sont donc fiables ; on assertionne
  malgré tout la **structure** (fragments) et non une chaîne figée, pour ne pas casser au gré des
  versions d'ICU.

## Commentaires (consigne permanente de Romain)

- Les **12 fichiers de test** créés/étendus sont **densément commentés sur le « pourquoi »** (le cas
  métier gardé, le piège, l'invariant), pas sur le « quoi ».
- Le **code de production est déjà uniformément et finement commenté** (revu au passage :
  `Toggle.tsx`, `BottomSheet.tsx`, `strava.ts`, `cache.ts`, `auth-store.ts`, `home-stats.ts`…).
  Sur-commenter du code déjà dense le dégraderait → **rien ajouté côté prod** pour éviter du bruit
  et de la churn inutile.
- Consigne « toujours commenter le code » **enregistrée en mémoire** pour les prochaines sessions.

## Périmètre volontairement exclu (et pourquoi)

- **Hooks / queries / mutations** (`*/queries.ts`, `*/mutations.ts`, `useStravaAuth`, stores
  Zustand, `dev-accounts`…) : effets de bord (réseau, `AsyncStorage`). Le projet ne les teste pas en
  unitaire (aucun mock Supabase dans la base de tests existante) — les tester demanderait une
  infra de mock/integration, hors de cette passe.
- **`buildInviteLink`** (`lib/invite-link`) : simple wrapper sur `Linking.createURL` (runtime
  `expo-linking`) — c'est pourquoi la suite existante ne testait déjà que `parseInviteData`.

## Fichiers touchés

- **Créés (8)** : `features/{excuses,jokers,votes,groups}/__tests__/…`, `lib/__tests__/shadow.test.ts`
- **Étendus (5)** : `features/notifications/__tests__/format.test.ts`, `lib/__tests__/date.test.ts`,
  `features/groups/__tests__/schemas.test.ts`, `features/settings/__tests__/support.test.ts`,
  `features/auth/__tests__/account.test.ts`
- **Production** : aucun.
