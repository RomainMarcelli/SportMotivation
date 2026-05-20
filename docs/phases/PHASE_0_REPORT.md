# Phase 0 — Setup environnement & projet

> **Statut** : ✅ Terminée
> **Date** : 2026-05-19 (début et fin sur la même journée)
> **Branche Git** : `main`

## Objectifs initiaux

- Vérifier les prérequis Windows (Node, npm, Git, Android SDK, émulateur)
- Initialiser le projet Expo avec TypeScript + Expo Router
- Configurer NativeWind, Prettier
- Créer la structure de dossiers du projet
- Configurer le client Supabase
- Mettre en place la documentation persistante (`docs/`)
- Valider avec un Hello World sur l'émulateur Android

## Ce qui a été fait

### Environnement validé

| Outil | Version |
|---|---|
| Node.js | v20.20.0 (LTS) |
| npm | 10.8.2 |
| Git | 2.51.0 |
| Android SDK | `C:\Users\FWLF0725\AppData\Local\Android\Sdk` |
| adb | 1.0.41 |
| Émulateurs AVD | `Pixel_7`, `Small_Phone` |

### Projet Expo initialisé

- **SDK** : Expo 54.0.33
- **React Native** : 0.81.5
- **React** : 19.1.0
- **TypeScript** : 5.9.2 (mode strict activé)
- **Expo Router** : 6.0.23 (file-based routing)
- **Template** : `default` (inclut tabs layout + Expo Router + thèmes)

### Dépendances ajoutées

**Runtime** :
- `nativewind@^4.2.4` — Tailwind pour React Native
- `@supabase/supabase-js@^2.106.0` — client Supabase
- `@react-native-async-storage/async-storage@^3.0.3` — persistance session
- `react-native-url-polyfill@^3.0.0` — polyfill nécessaire pour Supabase RN
- `lucide-react-native@^1.16.0` — icônes

**Dev** :
- `tailwindcss@^3.4.17`
- `prettier@^3.8.3`
- `prettier-plugin-tailwindcss@^0.8.0`

### Structure de dossiers créée

```
app/                        # Expo Router (tabs/, _layout.tsx, modal.tsx)
assets/                     # Images Expo par défaut
components/                 # Components UI (themed-text, parallax-scroll, etc.)
constants/                  # config.ts (env vars typées)
docs/                       # Documentation projet
features/                   # auth, groups, sessions, votes, excuses, pots, notifications (vides)
hooks/                      # use-color-scheme + hooks Expo
lib/                        # supabase.ts (client)
scripts/                    # reset-project.js (Expo)
supabase/                   # migrations/, functions/ (vides)
types/                      # database.types.ts à générer plus tard
```

### Fichiers de configuration créés

| Fichier | Rôle |
|---|---|
| `tailwind.config.js` | Scan : `app/`, `components/`, `features/`. Preset NativeWind. Couleur `primary` custom. |
| `global.css` | Directives `@tailwind base/components/utilities` |
| `babel.config.js` | Preset `babel-preset-expo` avec `jsxImportSource: "nativewind"` + `nativewind/babel` |
| `metro.config.js` | `withNativeWind(config, { input: "./global.css" })` |
| `nativewind-env.d.ts` | Types NativeWind |
| `.prettierrc.json` | Config Prettier + plugin Tailwind (tri auto des classes) |
| `.prettierignore` | Ignore node_modules, .expo, builds |

### Sécurité Git

- `.env` ajouté au `.gitignore` (avec variantes `.env.local`, `.env.*.local`, etc.)
- `git check-ignore .env` confirmé → `.env` n'est PAS tracké
- Builds Android/iOS ignorés (`/ios`, `/android`, `*.apk`, `*.aab`, `*.ipa`)
- Branche par défaut renommée `master` → `main`

### Fichiers projet créés

| Fichier | Description |
|---|---|
| `lib/supabase.ts` | Client Supabase avec `AsyncStorage` pour persistance, lecture des env vars `EXPO_PUBLIC_*`, warning si URL/key manquent |
| `constants/config.ts` | Constantes typées : `APP_ENV`, `DEFAULT_TIMEZONE`, `ENABLE_DEBUG_LOGS`, `SUPABASE_PROJECT_ID`, `IS_DEV` |
| `app/_layout.tsx` | Import `global.css` ajouté en première ligne pour activer NativeWind |
| `app/(tabs)/index.tsx` | Hello World — écran de diagnostic avec NativeWind + icône Lucide + état env |

### Documentation projet créée

| Fichier | Rôle |
|---|---|
| `docs/PROJECT_STATUS.md` | Tableau de bord global (phases, métriques, comptes) |
| `docs/DECISIONS.md` | Journal des décisions (stack, npm vs pnpm, cagnotte virtuelle, blâmes V1.1, etc.) |
| `docs/KNOWN_ISSUES.md` | Bugs connus (template prêt) |
| `docs/SETUP.md` | Guide install pour un nouveau dev |
| `docs/SPECIFICATIONS_MVP.md` | Spec V1.1 complète (extraite du `.docx`) |
| `docs/PHASE_0_REPORT.md` | Ce document |

## Difficultés rencontrées et solutions

### 1. Mot de passe Supabase fuité dans `.env`
- **Problème** : le `.env` initial contenait `PASSWORD_SUPABASE = xYoeDw7weOj6iui7` en clair, transmis dans le chat.
- **Solution** : reset immédiat du mot de passe sur Supabase Dashboard + suppression de la ligne du `.env`. Le mot de passe DB n'a de toute façon rien à faire dans `.env` (le client app utilise uniquement `URL` + `ANON_KEY`).
- **Suivi** : voir [DECISIONS.md](./DECISIONS.md) — pas de password DB dans `.env`.

### 2. `create-expo-app` dans un dossier non vide
- **Problème** : le dossier racine contenait déjà `.claude/`, `docs/`, `.env`, `.env.example` avant l'init.
- **Solution** : init dans un sous-dossier `_init/` puis migration de tous les fichiers vers la racine. Le `.claude/settings.json` ajouté par Expo a été mergé avec nos 3 SKILL.md existants.

### 3. Conflit de package.json sur installs npm parallèles
- **Problème** : deux `npm install` lancés en parallèle (un pour runtime, un pour dev) → le second a écrasé le `package.json` du premier, perdant `tailwindcss`, `prettier`, `prettier-plugin-tailwindcss`.
- **Solution** : relance séquentielle du dev install. À retenir : **ne JAMAIS lancer plusieurs `npm install` en parallèle dans un même projet**.
- **Documenté** : voir [KNOWN_ISSUES.md](./KNOWN_ISSUES.md).

### 4. Spec en `.docx` non lisible nativement par Claude Code
- **Problème** : la spec V1.1 fournie en `.docx`, non lisible par les outils standard de Claude.
- **Solution** : script Python (`extract_docx.py`, supprimé après usage) utilisant la stdlib (`zipfile` + `xml.etree`) pour extraire le texte et le convertir en Markdown. Pandoc non installé, on évite donc la dépendance externe.

## Fichiers créés/modifiés (liste exhaustive)

### Créés
- `.gitignore` (par Expo, enrichi par nous)
- `.prettierrc.json`, `.prettierignore`
- `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `global.css`, `nativewind-env.d.ts`
- `lib/supabase.ts`, `constants/config.ts`
- `docs/PROJECT_STATUS.md`, `docs/DECISIONS.md`, `docs/KNOWN_ISSUES.md`, `docs/SETUP.md`, `docs/SPECIFICATIONS_MVP.md`, `docs/PHASE_0_REPORT.md`
- 10 fichiers `.gitkeep` dans `features/*`, `types/`, `supabase/migrations/`, `supabase/functions/`

### Modifiés
- `package.json` (name, version, deps)
- `app.json` (name, slug, scheme)
- `app/_layout.tsx` (import `global.css`)
- `app/(tabs)/index.tsx` (Hello World custom)

### Non modifiés (laissés tels quels par Expo)
- `app/(tabs)/_layout.tsx`, `app/(tabs)/explore.tsx`, `app/modal.tsx`
- `components/*` (themed-text, parallax-scroll, hello-wave, etc.)
- `hooks/use-color-scheme*`, `hooks/use-theme-color.ts`
- `eslint.config.js`, `tsconfig.json` (déjà strict)
- `AGENTS.md`, `CLAUDE.md`, `README.md`

## Métriques

- **Lignes de code projet (hors node_modules, hors Expo template)** : ~150
- **Dépendances** : 30 runtime + 7 dev
- **Écrans** : 1 / ~25 prévus (Hello World)
- **Tables DB consommées par l'app** : 0 / 14 (client configuré mais pas encore utilisé)

## Scénario de test (réalisé ✅)

1. `npm start` → Metro démarre sans erreur
2. Appuyer sur `a` → l'app s'installe sur Pixel_7
3. L'écran « Sport Motiv » s'affiche avec :
   - Cercle bleu + icône haltère
   - Titre + sous-titre « Hello World — Phase 0 ✅ »
   - Encart « État de l'environnement » : `development`, `Europe/Paris`, `configuré`
4. `npx tsc --noEmit` ne renvoie aucune erreur
5. `git check-ignore .env` confirme l'exclusion

## Points de vigilance pour la suite

1. **NativeWind v4 + RN 0.81 + React 19** : combinaison stable mais récente. Si on rencontre des bugs UI (classes non appliquées), tester d'abord `npm start -- --clear`.
2. **Types Supabase non encore générés** : tant que `types/database.types.ts` n'existe pas, le client n'a pas l'autocomplétion des tables. À faire dès qu'on commence à requêter (Phase 1).
3. **Réinitialisation possible du template** : Expo fournit `npm run reset-project` qui déplace `app/` vers `app-example/`. Ne PAS l'utiliser avant de bien comprendre ce qu'on veut garder.
4. **`AGENTS.md` et `CLAUDE.md`** générés par Expo : conservés tels quels (renvoient juste vers la doc Expo SDK 54). Les vrais skills sont dans `.claude/`.
5. **Vulnérabilités npm** : 4 moderate au moment de l'install, classiques dans l'écosystème RN, non bloquantes. À surveiller mais pas à corriger en priorité (`npm audit fix --force` risque de casser des versions).
6. **Compte Expo pas encore créé** : à faire avant la Phase 6 (notifications push) et avant tout build EAS.

## Prochaine phase

**Phase 1 — Authentification et profil**

Objectifs :
- Écrans d'onboarding (3 slides max)
- Écran inscription email/mot de passe
- Écran connexion email/mot de passe + Google OAuth
- Création de profil (prénom, nom, photo)
- Persistance de la session (auto-login)
- Écran d'accueil post-connexion (choix : créer un groupe / rejoindre)

Dépendances à ajouter en Phase 1 :
- `zustand` (state management)
- `@tanstack/react-query` (cache des requêtes)
- `react-hook-form` + `zod` (formulaires)
- `expo-image-picker` (photo de profil)
- Lib Google OAuth (à déterminer : `expo-auth-session` + Google ou `@react-native-google-signin/google-signin`)
