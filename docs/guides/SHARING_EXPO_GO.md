# Partager l'app à distance via Expo Go

Procédure pour faire tester l'app à quelqu'un qui n'est **pas sur le même réseau**, sans build natif ni compte Apple Developer.

## Méthode retenue : tunnel (`expo start --tunnel`)

La plus simple pour le testeur : il installe Expo Go, ouvre un lien, c'est tout (pas de compte Expo).
Contrainte : **ton PC doit rester allumé** avec la commande lancée pendant tout le test.

### Étapes (PowerShell, depuis la racine du projet)

```powershell
npx expo start --tunnel
```

- 1ʳᵉ fois : accepte l'installation de `@expo/ngrok` (`Y`).
- Un QR code + une URL `exp://xxxxx.exp.direct` s'affichent. **Laisse la fenêtre ouverte.**
- Envoie l'URL `exp://…` au testeur (par message). Sur iPhone, taper le lien ouvre Expo Go directement (plus fiable que scanner le QR).

### Variables d'environnement

Les clés `EXPO_PUBLIC_*` du fichier `.env` sont **embarquées au démarrage** du serveur → le testeur tape sur la vraie base Supabase. Rien de plus à faire.

## Ce qui marche dans Expo Go (sur un vrai téléphone)

| Fonctionnalité | État |
|---|---|
| UI, navigation, thème, base de données | ✅ |
| Compte / connexion Supabase (email + mot de passe) | ✅ |
| Groupes, invitations, séances, notifications in-app | ✅ |
| Caméra (photo séance, scan QR) | ✅ (permission générique « Expo Go ») |
| Géolocalisation | ✅ |
| Strava | ⚠️ seulement si Edge Function `strava-token` déployée + `EXPO_PUBLIC_STRAVA_CLIENT_ID` défini |
| Notifications push | ❌ pas implémentées (Phase 6) + non supportées par Expo Go |
| Connexion Google | ❌ sauf si les `EXPO_PUBLIC_GOOGLE_CLIENT_ID_*` sont configurés |

## Message type pour le testeur

Voir la section « Message clé-en-main » — installer Expo Go (App Store : https://apps.apple.com/app/expo-go/id982107779), ouvrir le lien `exp://…`, créer un compte dans l'app, explorer. Retours par capture d'écran.

## Alternative future : `eas update` (PC éteint)

Quand on voudra que le test continue **PC éteint**, on configurera EAS Update :
- Créer un compte Expo (gratuit), `npm i -g eas-cli`, `eas login`.
- `npx expo install expo-updates`.
- `eas init` (lie le projet → `projectId`), puis `eas update:configure`.
- Ajouter un profil dans `eas.json`, publier : `eas update --branch preview --message "..."`.
- ⚠️ Pour ouvrir un update de **projet privé** dans Expo Go, le testeur doit généralement être connecté à Expo Go avec un compte **ayant accès au projet** (l'ajouter comme membre). Moins « zéro friction » que le tunnel.

Statut actuel : EAS **non configuré** (pas de `eas.json`, pas de `expo-updates`, pas de compte lié). À faire le jour où on en a besoin.
