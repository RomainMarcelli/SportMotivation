# Sport Motiv — Vue d'ensemble du projet

> Document de présentation complet. Self-contained : on peut comprendre le projet sans rien lire d'autre.
> Pour le détail vivant (phases, comptes-rendus, décisions, bugs connus, checklists), voir les autres documents listés en fin de fichier.

---

## 1. Le concept en une phrase

**Sport Motiv** est une app mobile où un groupe d'amis s'engage sur un défi sportif d'une durée définie ; chaque séance manquée alimente une **cagnotte commune** débloquée à la fin du défi pour une activité collective (restau, weekend, sortie).

## 2. Le principe métier (résumé)

- Un **admin** crée un groupe : durée du défi (ex. 3 mois), montant unitaire de la pénalité (ex. 5 €), activités acceptées, durée minimum d'une séance, fenêtre de publication.
- Chaque membre, à l'entrée, **verrouille** son **objectif hebdomadaire personnel** (ex. 4 séances/semaine) et accepte sa pénalité personnelle (par défaut celle du groupe, modifiable librement par le membre).
- Une **séance** est déclarée le jour même avec une preuve (photo in-app + géoloc, activité Strava ou lien externe + capture).
- Les autres membres **votent** la séance (oui/non, majorité simple). Une séance rejetée donne un **blâme** ; au-delà d'un seuil, blâme → pénalité.
- Chaque **dimanche 23h59 (Europe/Paris)**, le système ferme la semaine : objectif − séances validées = nombre de pénalités automatiquement ajoutées à la cagnotte du groupe.
- Les **excuses** (standard ou majeure) permettent d'annuler des séances en avance, avec ou sans vote du groupe.
- À la **fin du défi**, la cagnotte est débloquée.

Toutes ces règles sont **immuables une fois le défi commencé** (sauf certaines réglages admin), avec un horodatage des règles acceptées par chaque membre (`rule_acceptances`).

## 3. Stack technique

| Couche | Choix |
|---|---|
| Mobile | **Expo SDK 54** (React Native 0.81, React 19, TypeScript strict, New Architecture) |
| Navigation | **Expo Router 6** (file-based, typed routes) |
| Style | **NativeWind 4** (Tailwind pour RN) + icônes **Lucide** |
| State | **Zustand** (auth, thème) + **TanStack Query** (cache serveur) |
| Forms | **React Hook Form** + **Zod** |
| Backend | **Supabase** : PostgreSQL + Auth + Storage + Edge Functions (Deno) |
| Auth | Email/password, Google OAuth (optionnel), Strava OAuth (preuve séance) |
| Tests | **Jest** (jest-expo) + @testing-library/react-native |
| OS dev | Windows 11 (PowerShell), Android Studio (émulateur Pixel_7), VS Code |

> Règle stricte : les libs natives (`expo-*`, `@react-native-*`, `react-native-*`) s'installent **toujours** via `npx expo install`, jamais via `npm install` direct (sinon mismatch versions → crash Expo Go).

## 4. État d'avancement

| Phase | Périmètre | État |
|---|---|---|
| 0 — Setup | Env, projet Expo, Supabase, Hello World | ✅ Terminée |
| 1 — Auth & profil | Inscription, connexion, onboarding profil | ✅ Terminée |
| 2 — Groupes | Création, code/QR, rejoindre, membres, règles | 🟢 Code terminé |
| 2.5 — Améliorations groupes | Pénalité perso, invitations par pseudo, notifs in-app | 🟢 Code terminé |
| 3 — Séances & preuves | Déclaration séance, photo/Strava/lien, feed séances | 🟢 Code terminé |
| **Ajouts UX (mai 2026)** | Profil + suppression compte, navigation onglets, suppression groupe (admin), notifications (swipe + tout effacer), page Paramètres + thème, statut des invitations | 🟢 Code terminé |
| 4 — Votes / Excuses / Blâmes | Logique collective | ⚪ À faire |
| 5 — Cagnotte & clôture hebdo | Cycle complet | ⚪ À faire |
| 6 — Notifications push | Engagement | ⚪ À faire |
| 7 — Polish & tests | Beta privée | ⚪ À faire |

Vérifications techniques actuelles : `npx tsc --noEmit` ✅ clean, `npx jest` ✅ **83 tests / 16 suites**.

## 5. Architecture du repo

```
SportMotiv/
├── app/                        Routes Expo Router (file-based)
│   ├── (auth)/                 sign-in, sign-up, onboarding
│   ├── (setup)/                Complétion profil
│   ├── (tabs)/                 Accueil, Profil (onglets root)
│   ├── group/
│   │   ├── create, join, scan, join-confirm, accept-invite, penalty-response
│   │   └── [id]/               Stack (avec flèche retour)
│   │       ├── (tabs)/         Onglets Infos / Séances
│   │       ├── invite, invitations, members, edit, declare
│   ├── notifications.tsx
│   ├── settings.tsx
│   └── _layout.tsx             FeedbackProvider + thème + guards auth
├── components/
│   ├── ui/                     Button, TextField, Stepper, Chip, DateField, SegmentedControl
│   ├── feedback/               FeedbackProvider (toasts + dialogues animés)
│   ├── groups/                 RoleBadge
│   ├── sessions/               StravaProofPicker
│   └── auth/                   GoogleSignInButton
├── features/                   Logique métier par domaine
│   ├── auth/                   account, google, mutations, profile-mutations, profile-schemas, schemas
│   ├── groups/                 queries, mutations, join, invitations, penalty-mutations, errors, rules-snapshot, schemas, RulesRecap
│   ├── sessions/               schemas, queries, mutations, proof, status, strava
│   └── notifications/          queries, mutations
├── lib/                        supabase, auth-store, theme-store, query-client, log, date, group-code, invite-link, strava, onboarding-state
├── hooks/                      useProfile, use-color-scheme
├── constants/                  config, activities, roles, theme
├── types/                      database.types.ts (typage Supabase, partiellement maintenu à la main)
├── supabase/
│   ├── sql/                    Migrations SQL versionnées 001 → 014
│   └── functions/              Edge Functions Deno (strava-token, delete-account)
├── docs/                       Doc fonctionnelle, décisions, guides
├── work-log/                   Carnets par phase (gitignoré, détail technique)
└── .claude/                    Skills internes
```

## 6. Modèle de données

14 tables PostgreSQL avec RLS activée. Tables principales :

| Table | Rôle |
|---|---|
| `users` | Profil public (nom, pseudo, avatar, push token) |
| `groups` | Défis (nom, dates, pénalité, activités, règles) |
| `group_members` | Adhésions (rôle admin/treasurer/member, objectif hebdo verrouillé, pénalité perso) |
| `rule_acceptances` | Snapshot des règles acceptées par membre |
| `group_invitations` | Invitations par pseudo (pending/accepted/refused) |
| `member_penalty_changes` | Propositions admin → membre de changement de pénalité |
| `sessions` | Séances déclarées (activité, durée, statut pending_vote/validated/rejected/expired, week_start) |
| `session_proofs` | Preuves (photo/strava/external_link) + métadonnées (géoloc, captured_at, strava_data) |
| `votes` | Votes sur séances et excuses (Phase 4) |
| `excuses` | Excuses standard/majeure (Phase 4) |
| `penalties` | Pénalités dues (séance manquée / blâme) |
| `blames` | Historique des blâmes (Phase 4) |
| `pots` | Cagnottes par groupe |
| `pot_transactions` | Mouvements de la cagnotte |
| `notifications` | Notifications in-app (group_invitation, penalty_change_request, …) |

Plus 2 vues (statistiques de séances par membre/semaine).

## 7. Sécurité & accès aux données

- **RLS activée sur toutes les tables** sensibles.
- **Helpers SECURITY DEFINER** : `is_group_member(group_id)` et `is_group_admin(group_id)` — évitent la récursion RLS.
- **RPC de lecture** SECURITY DEFINER (depuis le bug de visibilité de mai 2026) : `get_my_groups`, `get_group_dashboard`, `get_group_members` — l'app lit les groupes via ces fonctions plutôt que par SELECT direct, ce qui supprime toute dépendance à des policies SELECT fragiles.
- **RPC d'action** SECURITY DEFINER avec contrôle d'appartenance/rôle : `join_group_by_code`, `declare_session`, `delete_group`, `invite_user_to_group`, `accept_invitation`, `cancel_invitation`, `propose_penalty_change`, `respond_penalty_change`, `search_users_by_username`.
- **Edge Functions** (côté serveur, jamais exposées au client) :
  - `strava-token` : échange/refresh OAuth Strava (garde le `client_secret`).
  - `delete-account` : suppression de compte par **anonymisation** (soft delete) + ban auth — utilise `service_role`.
- **Buckets Storage** :
  - `avatars` (public) — chemin `{userId}/avatar.{ext}`.
  - `session-proofs` (privé) — chemin `{userId}/{sessionId}.{ext}` ; URL signée 1h pour lecture.
- **Secrets côté client** : uniquement la **clé anon** Supabase (`EXPO_PUBLIC_*`). La `service_role` ne quitte jamais les Edge Functions.

## 8. Flux clés

### Auth & onboarding
1. `(auth)/sign-up` ou `sign-in` → session Supabase, store Zustand `auth-store`.
2. Si profil incomplet → `(setup)/` (prénom, nom, pseudo, avatar).
3. Sinon → `(tabs)/` (Accueil + Profil).
Les routes sont protégées par 3 `Stack.Protected` dans `app/_layout.tsx`.

### Rejoindre un groupe
1. `group/join` (saisie code) ou `group/scan` (QR).
2. `useGroupPreview(code)` (RPC `get_group_preview_by_code`) → écran `join-confirm` avec règles, objectif perso, pénalité perso, case d'acceptation.
3. `useJoinGroup` → RPC `join_group_by_code(p_code, p_weekly_target, p_penalty_amount)` puis upsert `rule_acceptances` → `toast` succès + navigation vers `/group/[id]`.
4. Le dashboard charge via `useGroup` (RPC `get_group_dashboard`).
5. Côté UX : erreurs classifiées par `features/groups/errors.ts` (RPC manquante / accès refusé / réseau).

### Déclarer une séance
1. `app/group/[id]/declare.tsx` : type d'activité (parmi celles du groupe), durée (≥ min), date (≤ aujourd'hui), commentaire + une preuve au choix :
   - **Photo** in-app (caméra via expo-image-picker, géoloc via expo-location, fallback galerie sur émulateur).
   - **Strava** : OAuth via Edge Function `strava-token` → liste d'activités récentes → sélection.
   - **Lien externe** : URL + capture obligatoire + description.
2. `useDeclareSession` → RPC `declare_session` (validation règles côté serveur) → upload preuve dans le bucket `session-proofs` → insert `session_proofs`.
3. Toast succès + retour vers le feed des séances.

### Cycle hebdo (Phase 5, à venir)
- Job dimanche 23h59 (cron Supabase) : pour chaque membre, comparer séances validées vs objectif, créer les `penalties` et alimenter le `pot`.

## 9. UX & design

- **FeedbackProvider** (`components/feedback/`) : toasts animés (succès / erreur / info) et dialogues de confirmation animés (Animated API) — remplace les `Alert` natives, identique Android/iOS.
- **Navigation groupe** : Stack `[id]` avec **flèche retour** vers l'accueil ; sous-onglets **Infos / Séances** ; écrans détail (Inviter, Membres, Modifier, Déclarer) empilés avec back natif.
- **Zéro emoji dans l'UI** — uniquement des icônes Lucide.
- **Thème clair/sombre/auto** : `lib/theme-store.ts` (Zustand + NativeWind `colorScheme` + AsyncStorage), restauré au démarrage.
- **DA cible** : « Fun & Communauté » — crème chaud + corail + ambre (à formaliser).

## 10. Workflow projet

- **Commits manuels** : Romain commit lui-même, jamais en automatique côté assistant.
- **Tests** : pragmatique — 100 % sur la logique pure (schemas Zod, mapping erreurs, helpers, dates), 60-70 % sur l'UI ; pas de couverture bloquante. Mock global de Supabase + AsyncStorage dans `jest-setup.ts`.
- **SQL versionné** : tout SQL à exécuter est écrit dans `supabase/sql/NNN_*.sql`, jamais collé dans le chat. Index dans `supabase/sql/README.md` et checklist détaillée dans `docs/guides/SQL_CHECKLIST.md`.
- **Work-log** par phase : `work-log/PHASE-X.md` (gitignoré) avec détails techniques, décisions, bugs rencontrés.
- **Doc de fond** dans `docs/` : PROJECT_STATUS, DECISIONS, KNOWN_ISSUES, SPECIFICATIONS_MVP, SETUP + sous-dossiers `phases/`, `guides/`, `archives/`.

## 11. Développer & partager

### Lancer en local
```powershell
npm start
# ou
npx expo start
# puis touche "a" (Android) après avoir lancé l'émulateur Pixel_7
```

### Faire tester à un ami à distance
Voir `docs/guides/SHARING_EXPO_GO.md`. Méthode retenue : Expo Go + tunnel (`npx expo start --tunnel`). Pré-requis : pas de VPN d'entreprise, pas de variable `EXPO_OFFLINE=true`.

### SQL Supabase
Voir `docs/guides/SQL_CHECKLIST.md` — exécute les fichiers `001` → `014` dans l'ordre (certains sont des correctifs idempotents ; `008` et `012` sont critiques).

### Edge Functions à déployer
- `strava-token` (cf. `docs/guides/STRAVA_SETUP.md`).
- `delete-account` (cf. `docs/guides/ACCOUNT_DELETION.md`).

## 12. Roadmap (phases restantes)

- **Phase 4** : votes (oui/non sur séances), excuses (standard/majeure), blâmes (séance rejetée → compteur → pénalité au seuil).
- **Phase 5** : clôture hebdo automatique (dimanche 23h59 Europe/Paris) → pénalités → alimentation cagnotte ; classement intra-groupe.
- **Phase 6** : notifications push (Expo Notifications) — rappel séance, vote en attente, récap dominical, clôture.
- **Phase 7** : polish, EAS Build, beta privée, CGU/privacy, monitoring.

Idées en réserve (post-MVP) : jokers mensuels, mode équipes, exports de données, intégrations supplémentaires.

## 13. Documents liés

- [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) — état vivant des phases + actions requises (à jour 2026-05-22).
- [`SPECIFICATIONS_MVP.md`](./SPECIFICATIONS_MVP.md) — specs métier complètes (V1.1).
- [`DECISIONS.md`](./DECISIONS.md) — journal des décisions techniques.
- [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md) — bugs, dette et limitations acceptées.
- [`SETUP.md`](./SETUP.md) — setup environnement.
- Guides : [`SQL_CHECKLIST.md`](./guides/SQL_CHECKLIST.md), [`SHARING_EXPO_GO.md`](./guides/SHARING_EXPO_GO.md), [`STRAVA_SETUP.md`](./guides/STRAVA_SETUP.md), [`ACCOUNT_DELETION.md`](./guides/ACCOUNT_DELETION.md), [`STORAGE_POLICIES.md`](./guides/STORAGE_POLICIES.md), [`GOOGLE_OAUTH_SETUP.md`](./guides/GOOGLE_OAUTH_SETUP.md).
- Phases : [`phases/PHASE_0_REPORT.md`](./phases/PHASE_0_REPORT.md), [`phases/PHASE_2_REPORT.md`](./phases/PHASE_2_REPORT.md).

---

> Pour reprendre rapidement le contexte dans une nouvelle conversation, **envoyer ce fichier** suffit dans 95 % des cas. Si on a besoin de plus de détail technique récent, ajouter `PROJECT_STATUS.md`.
