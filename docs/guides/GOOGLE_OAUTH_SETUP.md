# Setup Google OAuth

> Guide pour activer la connexion Google dans Sport Motiv App.
>
> ⚠ **Tu peux ignorer ce setup pour l'instant** et utiliser uniquement la connexion email/password. Le bouton "Continuer avec Google" reste caché tant que les variables d'env Google ne sont pas remplies.

## Vue d'ensemble

Google OAuth via Supabase nécessite 3 configurations distinctes :

1. **Google Cloud Console** — créer des OAuth Client IDs (iOS, Android, Web)
2. **Supabase Dashboard** — activer le provider Google
3. **Fichier `.env` local** — renseigner les Client IDs

## Étape 1 — Google Cloud Console

### Créer un projet Google Cloud (si pas déjà fait)

1. Va sur https://console.cloud.google.com/
2. Crée un nouveau projet : "Sport Motiv App"
3. Active l'API **"Google+ API"** (Library → search "Google+ API" → Enable)

### Configurer l'écran de consentement OAuth

1. **APIs & Services → OAuth consent screen**
2. User Type : **External** (pour permettre n'importe quel compte Google)
3. App information :
   - App name : `Sport Motiv`
   - User support email : ton email
4. **Scopes** : ajouter `email`, `profile`, `openid`
5. **Test users** : ajouter ton email + ceux des testeurs (Benjamin, etc.)
6. Save

### Créer les OAuth 2.0 Client IDs

**APIs & Services → Credentials → "+ CREATE CREDENTIALS" → OAuth client ID**

#### Client ID Web (obligatoire — utilisé par Supabase)

- Application type : **Web application**
- Name : `Sport Motiv — Web`
- **Authorized redirect URIs** : ajouter
  ```
  https://<ton-supabase-project-id>.supabase.co/auth/v1/callback
  ```
  (remplace `<ton-supabase-project-id>` par ton vrai project ID)
- Create
- **Note** le **Client ID** et le **Client Secret** affichés

#### Client ID Android

- Application type : **Android**
- Name : `Sport Motiv — Android`
- **Package name** : `com.sportmotiv.app` (à définir, voir `app.json`)
- **SHA-1 certificate fingerprint** :
  - En dev avec Expo Go : `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` (le SHA-1 public d'Expo Go)
  - En prod avec EAS Build : récupéré via `eas credentials`
- Create
- Note le **Client ID** (pas de secret pour Android)

#### Client ID iOS

- Application type : **iOS**
- Name : `Sport Motiv — iOS`
- **Bundle ID** : `com.sportmotiv.app` (cohérent avec Android)
- Create
- Note le **Client ID**

## Étape 2 — Supabase Dashboard

1. **Supabase Dashboard** → ton projet → **Authentication** → **Providers**
2. Trouve **Google** → toggle on
3. Renseigne :
   - **Client ID (for OAuth)** : le Client ID **Web** créé ci-dessus
   - **Client Secret (for OAuth)** : le Client Secret du Client Web
4. **Authorized Client IDs** (optionnel mais recommandé) : colle les 3 Client IDs (Web, iOS, Android) séparés par des virgules
5. Save

## Étape 3 — Variables d'environnement locales

Dans `.env` (à la racine) :

```
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=xxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=xxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=xxx.apps.googleusercontent.com
```

⚠ Pas besoin de `Client Secret` côté app — il reste côté Supabase uniquement.

## Étape 4 — Tester

1. Redémarre Metro avec cache vidé : `npx expo start -c`
2. Sur l'écran sign-in / sign-up, le bouton **"Continuer avec Google"** doit maintenant apparaître
3. Clique dessus → flow Google s'ouvre → choisis ton compte → retour dans l'app, connecté

## Limitations à connaître

### Expo Go vs Development Build

- En **Expo Go**, le flow Google passe par un proxy Expo qui peut avoir des limitations
- Pour une expérience optimale et pour la prod : **development build** via EAS Build :
  ```bash
  npx eas build --profile development --platform android
  ```

### Bundle ID / Package name

- Le `Bundle ID` (iOS) et `Package name` (Android) renseignés dans Google Cloud Console doivent matcher ceux d'`app.json` (`ios.bundleIdentifier` et `android.package`).
- Actuellement non définis dans `app.json` — à compléter avant le premier build natif.

## Troubleshooting

| Erreur | Cause probable |
|---|---|
| `redirect_uri_mismatch` | URL de redirection Supabase pas ajoutée dans le Client Web |
| `idpiframe_initialization_failed` | Test user non ajouté dans l'écran de consentement |
| App crashe au retour | Bundle ID / Package name pas cohérents avec ceux d'`app.json` |
| Bouton Google n'apparaît pas | Variables `EXPO_PUBLIC_GOOGLE_CLIENT_ID_*` vides dans `.env` |
| `Unable to exchange code for token` | Client Secret incorrect dans Supabase Dashboard |
