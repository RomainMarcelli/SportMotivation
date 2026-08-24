# Project Status — Sport Motivation App

> **Dernière mise à jour** : 2026-05-21
> **Phase en cours** : Phase 3 — Séances & preuves (code terminé, en cours de test sur émulateur)
> **Statut global** : 🟢 Phases 0 à 2.5 terminées, Phase 3 en validation. Nombreux ajouts UX (invitations, profil/paramètres, notifications, navigation, feedback animé).

## Vue d'ensemble

| Phase | Statut | Date début | Date fin | % réalisé |
|---|---|---|---|---|
| Phase 0 — Setup | ✅ Terminée | 2026-05-19 | 2026-05-19 | 100 % |
| Phase 1 — Auth & profil | ✅ Terminée | 2026-05-19 | 2026-05-19 | 100 % |
| Phase 2 — Groupes | 🟢 Code terminé | 2026-05-20 | — | 95 % |
| Phase 2.5 — Améliorations groupes | 🟢 Code terminé | 2026-05-20 | — | 95 % |
| Phase 3 — Séances & preuves | 🟢 Code terminé | 2026-05-20 | — | 90 % |
| Phase 4 — Votes / Excuses / Blâmes | ⚪ À faire | — | — | 0 % |
| Phase 5 — Cagnotte & clôture hebdo | ⚪ À faire | — | — | 0 % |
| Phase 6 — Notifications push | ⚪ À faire | — | — | 0 % |
| Phase 7 — Polish & tests | ⚪ À faire | — | — | 0 % |

**Légende** : ✅ Terminé · 🟢 Avancé · 🟡 En cours · ⚪ À faire · 🔴 Bloqué

## Partage / test externe (2026-05-22)

- Méthode retenue pour faire tester à distance (ami sur iPhone, sans compte Apple Dev) : **Expo Go + tunnel** (`npx expo start --tunnel`). Procédure dans `docs/guides/SHARING_EXPO_GO.md`.
- EAS Update **non configuré** (pas de `eas.json`/`expo-updates`/compte Expo lié) — à faire plus tard si on veut un partage « PC éteint ».
- Limites Expo Go connues : push notifications non testables (Phase 6, + non supporté par Expo Go), Strava/Google selon config ; caméra + géoloc OK sur vrai téléphone.

## Compte-rendu de la session du 2026-05-21

Correctifs du flux « rejoindre » (côté code) + 5 ajouts fonctionnels.

### Bug « impossible de charger le groupe » — côté code
- **Gestion d'erreur fine** : `features/groups/errors.ts` (`classifyGroupError`) distingue *fonction RPC manquante* / *accès refusé* / *réseau* / *inconnu*.
- **Logs debug** : `lib/log.ts` (`debugError`) logue code+message Supabase si `EXPO_PUBLIC_ENABLE_DEBUG_LOGS=true`. Branché sur toutes les RPC groupes + join.
- **Dashboard** : message classifié + détail technique en debug + bouton « Retour à l'accueil ».
- ⚠ La cause racine est SQL (fichiers `008` + `012` non appliqués) — **Romain s'en occupe** (voir `docs/guides/SQL_CHECKLIST.md`).

### Ajout 1 — Suivi des invitations (admin)
- Écran `app/group/[id]/invitations.tsx` : liste avec statut (en attente / acceptée / refusée), annulation d'une invitation en attente. RPC `get_group_invitations` / `cancel_invitation` (SQL 013). Accès depuis l'écran Inviter.

### Ajout 2 — Navigation groupe
- Header avec **flèche retour** sur les onglets Infos/Séances (Stack `[id]` avec `headerLeft` → accueil ; headers d'onglets masqués).

### Ajout 3 — Accès profil depuis l'accueil
- La zone avatar + nom + @pseudo de l'accueil est cliquable → onglet Profil.

### Ajout 4 — Notifications
- `app/notifications.tsx` : **swipe-to-delete** (gesture-handler), **« Tout effacer »** (confirmation animée), animations de sortie (Reanimated). Mutations `useDeleteNotification` / `useDeleteAllNotifications` (hard delete, SQL 014).

### Ajout 5 — Page Paramètres
- `app/settings.tsx` (accessible via une icône engrenage dans le Profil) : Compte, **Apparence (thème clair/sombre/auto fonctionnel et persistant)**, Notifications (placeholder), Confidentialité (suppression de compte), À propos (version), Déconnexion. Options non encore dispo marquées « Bientôt ».
- Thème : `lib/theme-store.ts` (Zustand + NativeWind `colorScheme` + AsyncStorage), restauré au démarrage.

### Nouveaux fichiers SQL
- `013_group_invitations_admin.sql`, `014_notifications_delete.sql`.

---

## Compte-rendu de la session du 2026-05-20 (jusqu'à 17:45)

Grosse session : Phase 3 codée, plus de nombreux ajouts/fix sur les phases 2/2.5.

### Phase 3 — Séances & preuves (code terminé)
- **Déclaration de séance** (`app/group/[id]/declare.tsx`) : activité (parmi celles du groupe), durée (≥ min groupe), date (≤ aujourd'hui), commentaire, + une preuve.
- **3 types de preuve** :
  - **Photo** : capture caméra (expo-image-picker) + géoloc best-effort (expo-location). Fallback galerie pour l'émulateur.
  - **Strava** : OAuth via Edge Function `strava-token` (garde le client_secret côté serveur), sélection d'une activité récente.
  - **Lien externe** : URL + capture d'écran + description (obligatoires).
- **Feed des séances** (`app/group/[id]/(tabs)/sessions.tsx`) : auteur, activité, durée, date, photo (URL signée bucket privé), badge de statut, type de preuve.
- **Backend** : RPC `declare_session` (validation règles), RLS sessions/preuves, bucket privé `session-proofs` (SQL 006).
- **Logique** `features/sessions/` (schemas Zod, mapping erreurs, statut, helpers Strava) + tests Jest.

### Profil & compte (nouveau)
- **Onglet Profil** (`app/(tabs)/profile.tsx`) : voir/modifier prénom, nom, pseudo, avatar (email en lecture seule), déconnexion.
- **Suppression de compte** = anonymisation (soft delete) via Edge Function `delete-account` (service_role) : profil anonymisé, sortie des groupes, compte auth banni. Les séances/pénalités restent (pour ne pas fausser les cagnottes).

### Groupe (améliorations)
- **Onglets dans le groupe** : barre du bas **Infos / Séances**. Écrans Inviter/Membres/Modifier/Déclarer empilés en Stack → **flèche retour** native.
- **Suppression du groupe par l'admin** : RPC `delete_group` (SQL 009) + "Zone de danger" dans l'écran Modifier.
- **Rejoindre plusieurs groupes** : confirmé déjà supporté (rien ne le bloque).

### UX globale
- **Zéro emoji** : tout passé en icônes Lucide (couronne admin, trésorier, avertissements…).
- **Système de feedback animé** (`components/feedback/FeedbackProvider.tsx`) : toasts (succès/erreur) + dialogues de confirmation animés (remplace les Alert natives). Branché sur les actions clés (join, profil, suppression, déclaration de séance…).

### Correctifs Supabase (RLS / fonctions) — série de débogage du flux "rejoindre"
Le parcours pour rejoindre un groupe a nécessité plusieurs correctifs SQL (le fichier 003 n'avait jamais été appliqué côté base) :
- `007` : recrée `join_group_by_code` + reload cache PostgREST.
- `008` : ajoute la colonne `group_members.penalty_amount` + valeurs d'enum (à exécuter SEUL).
- `010` : RLS `rule_acceptances` (autorise l'upsert d'acceptation des règles).
- `011` : RLS lecture groupe/adhésions par les membres.
- `012` : **RPC de lecture** `get_my_groups` / `get_group_dashboard` / `get_group_members` (SECURITY DEFINER) — l'app ne dépend plus de la RLS SELECT. **Requis.**

## ⚠ Actions requises côté Romain (Supabase)

1. **Exécuter les SQL manquants** dans l'ordre (cf. **`docs/guides/SQL_CHECKLIST.md`** avec requêtes de vérification) : `001`→`014`. Priorité absolue : **`008`** (colonne penalty_amount, à exécuter seul) et **`012`** (RPC de lecture des groupes). Nouveaux : `013` (invitations admin), `014` (suppression notifs).
2. **Déployer 2 Edge Functions** via le Dashboard (pas besoin du CLI) :
   - `strava-token` (+ secrets `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`) — guide `docs/guides/STRAVA_SETUP.md`.
   - `delete-account` (secrets fournis automatiquement) — guide `docs/guides/ACCOUNT_DELETION.md`.
3. **`.env`** : ajouter `EXPO_PUBLIC_STRAVA_CLIENT_ID=248429` puis redémarrer Expo.
4. **Tester** : rejoindre un groupe, onglets Infos/Séances, déclaration de séance, profil, suppressions.

## Vérifications techniques (au 17:45)

- `npx tsc --noEmit` : ✅ clean
- `npx jest` : ✅ 77 tests / 15 suites
- Tests non réalisables en local : caméra/géoloc réelles, QR scan (device réel requis), et tout ce qui dépend des SQL/Edge Functions côté Supabase (à valider par Romain).

## Métriques (indicatif)

- **Tables DB utilisées** : groups, group_members, rule_acceptances, sessions, session_proofs, notifications, group_invitations, member_penalty_changes, users, pots…
- **Edge Functions écrites** : 2 (`strava-token`, `delete-account`) — à déployer.
- **Fichiers SQL versionnés** : `supabase/sql/001` → `012`.
- **Tests** : 77 (logique pure : schemas, mapping erreurs, helpers Strava, dates, codes…).

## Blocages actuels

- En attente de l'exécution des SQL (surtout `008` + `012`) et du déploiement des Edge Functions par Romain pour valider le flux complet sur émulateur.

## Décisions récentes

Voir [DECISIONS.md](./DECISIONS.md) pour le journal complet.

## Comptes-rendus de phases

- [Phase 0 Report](./phases/PHASE_0_REPORT.md) — ✅ Terminée 2026-05-19
- [Phase 1 Report](./phases/PHASE_1_REPORT.md) — _non rédigé (validé en direct, à formaliser si besoin)_
- [Phase 2 Report](./phases/PHASE_2_REPORT.md) — 🟢 Code terminé 2026-05-20, test général à faire

## Stack technique (rappel)

- **Frontend** : React Native + Expo + TypeScript + NativeWind
- **Backend** : Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **State** : Zustand + TanStack Query
- **Navigation** : Expo Router
- **Notifications** : Expo Notifications
- **Package manager** : npm

## Comptes et services

| Service | État | Notes |
|---|---|---|
| Supabase | ✅ Projet créé, schéma DB en place (14 tables + RLS + 2 vues) | URL et clé anon à intégrer dans `.env` lors de la Phase 0 |
| Expo | ⚪ À créer | À faire avant les notifications push (Phase 6) et builds EAS |
| Google OAuth | ⚪ À configurer | Phase 1 |
| Strava OAuth | ⚪ À configurer | Phase 3 |

## Environnement de développement

| Outil | Version |
|---|---|
| OS | Windows 11 Enterprise |
| Node.js | v20.20.0 (LTS) |
| npm | 10.8.2 |
| Git | 2.51.0 |
| Android SDK | `C:\Users\FWLF0725\AppData\Local\Android\Sdk` |
| Émulateurs AVD | `Pixel_7`, `Small_Phone` |
| IDE | Visual Studio Code + Android Studio |

## Notes diverses

- Tous les commits sont réalisés manuellement par Romain (cf. [DECISIONS.md](./DECISIONS.md)).
- La doc projet (ce fichier, `DECISIONS.md`, `KNOWN_ISSUES.md`, `PHASE_X_REPORT.md`) doit être mise à jour à chaque fin de phase.
