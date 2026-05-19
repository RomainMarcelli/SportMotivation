# Setup — Guide d'installation du projet

> Guide pour qu'un nouveau développeur (ou toi-même 3 mois plus tard) puisse cloner le repo et faire tourner l'app sur son poste.

## Prérequis

| Outil | Version recommandée | Lien |
|---|---|---|
| Node.js | LTS (≥ 20.x) | https://nodejs.org |
| npm | ≥ 10.x (livré avec Node) | — |
| Git | ≥ 2.40 | https://git-scm.com |
| Android Studio | Récent | https://developer.android.com/studio |
| Android SDK | API 34+ (configuré via Android Studio) | — |
| Émulateur AVD | Au moins un appareil (ex : Pixel_7) | Via Device Manager d'Android Studio |
| Xcode (Mac uniquement, pour iOS) | Récent | App Store |

**Sur Windows**, vérifier que `ANDROID_HOME` est défini (ex : `C:\Users\<user>\AppData\Local\Android\Sdk`).

## Étapes d'installation

### 1. Cloner le repo

```bash
git clone <url-du-repo> sport-motiv-app
cd sport-motiv-app
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d'environnement

Copier `.env.example` en `.env` et remplir les valeurs :

```bash
cp .env.example .env
```

Variables attendues :
- `EXPO_PUBLIC_SUPABASE_URL` : URL de ton projet Supabase (de la forme `https://xxx.supabase.co`)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` : clé `anon` publique (jamais la `service_role` !)

⚠ Le préfixe `EXPO_PUBLIC_` est obligatoire pour que la variable soit accessible côté client Expo.

### 4. (Optionnel) Regénérer les types TypeScript depuis Supabase

Si le schéma DB a évolué :

```bash
npx supabase gen types typescript --project-id <project-id> > types/database.types.ts
```

### 5. Lancer l'application en dev

```bash
npx expo start
```

Une fois Metro Bundler lancé :
- Appuyer sur `a` pour ouvrir sur émulateur Android
- Appuyer sur `i` pour ouvrir sur simulateur iOS (Mac uniquement)
- Scanner le QR code avec **Expo Go** sur un téléphone physique

## Comptes et services

Le projet nécessite ces comptes (gratuits pour la beta) :

- **Supabase** : projet créé avec le schéma DB (voir `docs/SPECIFICATIONS_MVP.md` section 4.2 pour les tables)
- **Expo** : compte sur https://expo.dev (nécessaire pour les builds EAS et notifications push)
- **Google Cloud Console** : OAuth Client ID pour la connexion Google (Phase 1)
- **Strava Developers** : OAuth app pour l'intégration Strava (Phase 3)

## Structure du projet

```
app/                  # Routes Expo Router (file-based)
components/           # Composants UI réutilisables
features/             # Logique métier par domaine
  ├── auth/
  ├── groups/
  ├── sessions/
  ├── votes/
  ├── excuses/
  ├── pots/
  └── notifications/
lib/                  # Utilities (supabase client, helpers, date utils)
hooks/                # Hooks React custom
types/                # Types TypeScript globaux (database.types.ts généré)
constants/            # Constantes (couleurs, espaces, configs)
assets/               # Images, fonts, icônes
docs/                 # Documentation du projet
supabase/             # Migrations et Edge Functions
.claude/              # Skills Claude Code (PROJECT, WORKFLOW, SUPABASE)
```

## Documentation à lire avant de coder

1. [docs/PROJECT_STATUS.md](./PROJECT_STATUS.md) — où on en est
2. [docs/SPECIFICATIONS_MVP.md](./SPECIFICATIONS_MVP.md) — la spec fonctionnelle complète
3. [docs/DECISIONS.md](./DECISIONS.md) — pourquoi on a fait les choix qu'on a faits
4. [docs/KNOWN_ISSUES.md](./KNOWN_ISSUES.md) — bugs connus
5. Le dernier `docs/PHASE_X_REPORT.md` en date — état détaillé de la dernière phase

Pour Claude Code (et tout assistant IA) : lire en premier les 3 skills dans `.claude/` :
- `PROJECT_SKILL.md`
- `WORKFLOW_SKILL.md`
- `SUPABASE_SKILL.md`

## Commandes utiles

```bash
# Lancer l'app
npx expo start

# Lancer sur Android directement
npx expo start --android

# Régénérer les types TS depuis Supabase
npx supabase gen types typescript --project-id <id> > types/database.types.ts

# Linter
npm run lint

# Format
npm run format

# Build production (cloud, nécessite compte Expo)
npx eas build --platform android
npx eas build --platform ios
```

## Troubleshooting Windows

- **`adb` introuvable** : ajouter `%ANDROID_HOME%\platform-tools` au PATH.
- **Émulateur ne démarre pas** : ouvrir Android Studio > Device Manager > play sur le device.
- **Metro bloque sur "Loading..."** : redémarrer avec `npx expo start --clear`.
- **Erreur "JDK not found"** lors d'un build natif local : installer JDK 17 et l'ajouter au PATH (pas nécessaire pour le dev avec Expo Go).
