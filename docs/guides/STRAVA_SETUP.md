# Configuration Strava (Phase 3)

Permet aux membres de prouver une séance en sélectionnant une activité Strava récente.

L'échange du code OAuth contre un token nécessite le **client secret** Strava. Ce secret ne doit **jamais** être embarqué dans l'app : il vit dans une **Edge Function Supabase** (`strava-token`).

## 1. Créer une application Strava

1. Va sur https://www.strava.com/settings/api
2. Crée une application :
   - **Application Name** : `Sport Motiv`
   - **Category** : peu importe (ex : Training)
   - **Authorization Callback Domain** : `auth.expo.io` (pour Expo Go) — en build natif, ce sera ton scheme `sportmotiv`
3. Récupère le **Client ID** et le **Client Secret**.

## 2. Variables d'environnement

Dans `.env` (à la racine) :

```
EXPO_PUBLIC_STRAVA_CLIENT_ID=ton_client_id
```

> ⚠ Ne mets **PAS** le client secret dans `.env` (préfixe `EXPO_PUBLIC_` = exposé côté client). Le secret va uniquement dans l'Edge Function (étape 3).

## 3. Déployer l'Edge Function `strava-token`

Le code est déjà écrit : [`supabase/functions/strava-token/index.ts`](../../supabase/functions/strava-token/index.ts).

**Sans le CLI**, via le Dashboard Supabase :

1. Dashboard → **Edge Functions** → **Create a function** → nom : `strava-token`
2. Colle le contenu de `supabase/functions/strava-token/index.ts`
3. **Deploy**
4. Dashboard → Edge Functions → **Manage secrets** (ou Project Settings → Edge Functions → Secrets) et ajoute :
   - `STRAVA_CLIENT_ID` = ton client id
   - `STRAVA_CLIENT_SECRET` = ton client secret

## 4. Vérifier

- Si `EXPO_PUBLIC_STRAVA_CLIENT_ID` est absent, le bouton « Strava » n'apparaît pas (dégradation propre, comme Google).
- Une fois configuré : déclaration de séance → preuve **Strava** → connexion → choix d'une activité récente.

## Notes

- Scope demandé : `activity:read_all` (lecture des activités, y compris privées).
- Le token d'accès expire (~6 h) ; pour le MVP on récupère un token frais à chaque connexion. Le rafraîchissement (`action: "refresh"`) est déjà géré par l'Edge Function si on veut persister le `refresh_token` plus tard.
