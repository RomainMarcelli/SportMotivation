# Phase 2 — Création et gestion des groupes

> **Statut** : ✅ Code terminé — test général visuel à faire par Romain
> **Période** : 2026-05-20
> **Tests** : 54 unitaires passants (10 suites)

## Objectifs initiaux

- Création de groupe (nom, description, dates, pénalité, règles)
- Génération du code 6 chiffres + lien d'invitation + QR code
- Rejoindre un groupe (code, QR, lien)
- Récapitulatif des règles + acceptation (case à cocher)
- Définition du nombre de séances hebdo avec verrouillage
- Dashboard du groupe
- Gestion des membres (vue admin)

## Ce qui a été fait

### Infra de tests (mise en place en début de Phase 2)
- `jest-expo` + `@testing-library/react-native` + `@testing-library/jest-native`
- `jest.config.js`, `jest-setup.ts` (mocks AsyncStorage + client Supabase)
- Scripts `npm test`, `test:watch`, `test:coverage`
- Tests rétroactifs Phase 1 : schemas auth, profil, onboarding-state, isProfileComplete

### 2.B — Création de groupe
- Formulaire complet [`app/group/create.tsx`](../../app/group/create.tsx) : infos, dates (date picker), pénalité, activités (chips), durée min, délais publication/vote, seuil blâmes, objectif hebdo perso (verrouillé), acceptation des règles
- Composants UI : `Chip`, `Stepper`, `SegmentedControl`, `DateField`
- `useCreateGroup` : INSERT group + admin member (verrouillé) + rule_acceptance
- `useMyGroups`, `useGroup`, `useGroupMembers`
- Home connectée (liste des groupes + actions)

### 2.C — Rejoindre par code
- RPC SQL `get_group_preview_by_code` + `join_group_by_code` (SECURITY DEFINER, validation code/statut/capacité/doublon/réintégration)
- `useGroupPreview`, `useJoinGroup`, `mapJoinError` (RPC typées manuellement, pas de régénération de types nécessaire)
- Écrans [`join.tsx`](../../app/group/join.tsx) (saisie code) + [`join-confirm.tsx`](../../app/group/join-confirm.tsx) (récap règles + objectif + acceptation)
- Composant `RulesRecap` réutilisable

### 2.C-bis — QR code + liens
- Scan QR via `expo-camera` : [`app/group/scan.tsx`](../../app/group/scan.tsx)
- `lib/invite-link.ts` : `buildInviteLink` (deep link) + `parseInviteData` (extraction code depuis code brut / lien / chemin)
- Permission caméra configurée dans `app.json`

### 2.D — Écran d'invitation
- [`app/group/[id]/invite.tsx`](../../app/group/[id]/invite.tsx) : code en grand + QR code (react-native-qrcode-svg) + bouton Partager (Share natif)

### 2.E — Dashboard + gestion des membres
- Dashboard [`app/group/[id]/index.tsx`](../../app/group/[id]/index.tsx) : infos, règles, membres, boutons Inviter/Membres, awareness admin
- Gestion membres [`app/group/[id]/members.tsx`](../../app/group/[id]/members.tsx) : admin peut nommer admin/trésorier, repasser membre, exclure (soft delete)
- `useUpdateMemberRole`, `useRemoveMember` (RLS : admin du groupe)
- Helper `constants/roles.ts` (`roleLabel`, `roleBadge`)

### Correctif important
- **Crash Google OAuth** : `Google.useAuthRequest` lève une exception sur Android même sans client IDs. Résolu en isolant l'appel dans `<GoogleSignInButton />`, rendu seulement si `isGoogleConfigured`.

## Difficultés rencontrées et solutions

| Problème | Solution |
|---|---|
| `pots` RLS bloque la création de groupe | Trigger `create_pot_for_group` passé en SECURITY DEFINER (`supabase/sql/001`) |
| Lecture groupe bloquée pour non-membre (jonction) | RPC SECURITY DEFINER (`supabase/sql/002`) |
| Impossible de régénérer les types (CLI rame, Dashboard introuvable) | RPC typées manuellement avec cast `as never` |
| Crash Google sur Android | `<GoogleSignInButton />` rendu conditionnel |
| Routes typées Expo Router inconnues en tsc | cast `as never` (régénérées par Metro) |

## Fichiers créés (principaux)

- Config tests : `jest.config.js`, `jest-setup.ts`
- `lib/` : `date.ts`, `group-code.ts`, `invite-link.ts`
- `constants/` : `activities.ts`, `roles.ts`
- `features/groups/` : `schemas.ts`, `mutations.ts`, `queries.ts`, `join.ts`, `member-mutations.ts`, `rules-snapshot.ts`, `RulesRecap.tsx`
- `features/auth/` : `google.ts` (refactor)
- `components/ui/` : `Chip.tsx`, `Stepper.tsx`, `SegmentedControl.tsx`, `DateField.tsx`
- `components/auth/` : `GoogleSignInButton.tsx`
- `app/group/` : `_layout.tsx`, `create.tsx`, `join.tsx`, `scan.tsx`, `join-confirm.tsx`, `[id]/index.tsx`, `[id]/invite.tsx`, `[id]/members.tsx`
- `supabase/sql/` : `001_fix_pot_trigger_security_definer.sql`, `002_join_group_rpcs.sql`
- Tests : 10 suites (auth schemas, profil, onboarding, useProfile, group-code, group schemas, join, date, invite-link, roles)

## Métriques

- **Tests unitaires** : 54 passants (10 suites)
- **Écrans ajoutés** : 7 (create, join, scan, join-confirm, dashboard, invite, members)
- **Tables DB consommées** : groups, group_members, rule_acceptances, pots (via trigger), users
- **RPC créées** : 2

## Scénario de test (à dérouler par Romain)

Voir le test plan détaillé dans le chat. En résumé :
1. Créer un groupe → vérifier code 6 chiffres, cagnotte, admin
2. Inviter → QR + code + partage
3. 2e compte : rejoindre par code → récap règles + objectif verrouillé
4. Rejoindre par scan QR
5. Admin : gérer les membres (rôles, exclusion)

## Points de vigilance pour la suite

1. **QR scan & caméra** : nécessitent un test sur device réel (l'émulateur simule mal la caméra). Sur émulateur, utiliser la saisie de code.
2. **Deep links** : le lien d'invitation route vers `join-confirm` mais seulement si l'utilisateur est déjà loggé (route sous garde auth). À améliorer en Phase 7 (gérer le lien post-login).
3. **Régénération des types** : les 2 RPC sont typées à la main. À régénérer proprement quand possible (toutes les RPC apparaîtront automatiquement). Cast `as never` à nettoyer ensuite.
4. **Statut du groupe** : reste à `setup`. La transition `setup → active` (lancement du défi) n'est pas encore gérée — à traiter en Phase 5 (cycle hebdo).
5. **Tests de composants** : pour l'instant on teste la logique pure. Les tests de rendu (RNTL) viendront si besoin.

## Prochaine phase

**Phase 3 — Déclaration de séance et preuves** : écran "J'ai fait ma séance", capture photo in-app (caméra + géoloc + timestamp), intégration Strava OAuth, lien externe, feed des séances.
