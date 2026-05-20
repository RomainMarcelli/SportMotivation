# Project Status — Sport Motivation App

> **Dernière mise à jour** : 2026-05-20
> **Phase en cours** : Phase 3 — Séances & preuves (code terminé, test général à faire)
> **Statut global** : 🟢 Phases 0 à 2.5 terminées, Phase 3 en validation

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

## En cours

### Tâche actuelle
- **Phase 0** : test du Hello World sur l'émulateur Pixel_7 avant validation et premier commit.

### Fait pendant la Phase 0
- ✅ Vérification environnement Windows (Node 20, npm 10, Git 2.51, Android SDK + AVD Pixel_7)
- ✅ Initialisation du projet Expo (SDK 54, React Native 0.81, React 19, TypeScript strict)
- ✅ Expo Router 6 (file-based routing) inclus dans le template
- ✅ NativeWind 4.2 configuré (tailwind.config.js, babel, metro, global.css, nativewind-env.d.ts)
- ✅ Prettier + prettier-plugin-tailwindcss installés
- ✅ Client Supabase configuré dans `lib/supabase.ts` (variables d'env lues depuis `.env`)
- ✅ Structure de dossiers : `features/`, `lib/`, `hooks/`, `types/`, `constants/`, `supabase/`
- ✅ Personnalisation `package.json` (name: `sport-motiv-app`) et `app.json` (name: `Sport Motiv`, slug: `sport-motiv-app`, scheme: `sportmotiv`)
- ✅ `.gitignore` enrichi : `.env` exclu, `.apk/.aab/.ipa` exclus, logs et builds exclus
- ✅ Branche Git renommée `master` → `main`
- ✅ Hello World écran avec NativeWind + icône Lucide + diagnostic env

### Reste à faire (Phase 0)
1. **À toi** : démarrer l'émulateur Pixel_7 + lancer `npm start` puis appuyer sur `a`
2. **À toi** : vérifier que le Hello World s'affiche bien (couleurs, icône Dumbbell, badge "Phase 0 ✅")
3. **À toi** : valider la phase
4. **À toi** : premier commit `[Phase 0] Setup environnement & projet` (que je préparerai pour toi)
5. (Optionnel) Renseigner `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` dans `.env`
6. (Optionnel) Générer les types TS Supabase : `npx supabase gen types typescript --project-id <id> > types/database.types.ts`

## Métriques

- **Lignes de code (sans node_modules)** : ~120 (Hello World + config + client Supabase)
- **Composants créés** : 0 (le Hello World inline ne compte pas)
- **Écrans implémentés** : 1 / ~25 prévus (`app/(tabs)/index.tsx` — Hello World)
- **Tables DB utilisées** : 0 / 14
- **Edge Functions déployées** : 0 / 3 prévues
- **Dépendances installées** : 30 runtime + 7 dev

## Blocages actuels

Aucun blocage.

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
