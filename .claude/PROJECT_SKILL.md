# Sport Motivation App - Project Skill

## Description
Ce skill regroupe toutes les conventions, règles métier et bonnes pratiques du projet **Sport Motivation App**. À consulter avant toute modification du code, ajout de feature ou prise de décision technique.

## Quand utiliser ce skill
À chaque session de développement sur ce projet. Toujours commencer par lire ce fichier pour se remettre en contexte.

## Concept du projet

Application mobile React Native + Expo permettant à des groupes d'amis de se motiver mutuellement à faire du sport. Chaque membre s'engage sur un nombre de séances par semaine. Toute séance manquée alimente une cagnotte commune utilisée pour une activité collective en fin de défi (restaurant, sortie...).

## Stack technique (NE PAS DÉVIER)

| Composant | Technologie |
|---|---|
| App mobile | React Native + Expo + TypeScript |
| UI | NativeWind (Tailwind pour RN) |
| Navigation | Expo Router (file-based) |
| State management | Zustand + TanStack Query |
| Formulaires | React Hook Form + Zod |
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Notifications push | Expo Notifications |
| Stockage médias | Supabase Storage |
| Tâches planifiées | Supabase Edge Functions (cron) |
| Strava | OAuth 2.0 + API Strava v3 |
| Icônes | lucide-react-native |

## Structure du projet

```
app/                  # Routes Expo Router (file-based)
components/           # Composants réutilisables (Button, Card, etc.)
features/             # Logique métier par domaine
  ├── auth/           # Authentification, profil
  ├── groups/         # Création/gestion de groupes
  ├── sessions/       # Déclaration et preuves de séances
  ├── votes/          # Système de vote
  ├── excuses/        # Excuses standard et majeures
  ├── pots/           # Cagnotte et transactions
  └── notifications/  # Notifications push
lib/                  # Utilities (supabase client, helpers, date utils)
hooks/                # Hooks React custom (useUser, useGroup, etc.)
types/                # Types TypeScript globaux (générés depuis Supabase)
constants/            # Constantes (couleurs, espaces, configs)
assets/               # Images, fonts
docs/                 # Documentation et comptes-rendus de phases
supabase/             # Migrations, Edge Functions
```

## Conventions de code

- **TypeScript strict** activé partout. Pas de `any` sans commentaire justifiant.
- **Composants fonctionnels** uniquement, hooks pour le state.
- **Nommage** :
  - Composants : PascalCase (`SessionCard`, `VoteButton`)
  - Hooks : camelCase commençant par `use` (`useGroupMembers`)
  - Types : PascalCase (`Group`, `SessionStatus`)
  - Fichiers de composants : PascalCase.tsx (`SessionCard.tsx`)
- **Imports** : grouper par origine (React → libs externes → @/ → relatifs)
- **Pas de `console.log` en commit** : utiliser `console.warn` pour les warnings ou un logger dédié.

## Règles métier critiques (NE JAMAIS OUBLIER)

1. **Verrouillage du nombre de séances** : une fois défini par un membre à son entrée dans le groupe, il est verrouillé pour TOUTE la durée du défi. Vérification stricte côté DB et UI.

2. **Anti-fraude photo** : la photo DOIT être prise par la caméra in-app. JAMAIS d'upload depuis la galerie. Vérifier la présence de metadata timestamp + géoloc.

3. **Cycle hebdomadaire** : semaine = lundi 00h00 → dimanche 23h59. Utiliser le fuseau horaire du membre (par défaut Europe/Paris), JAMAIS UTC.

4. **Vote** :
   - L'auteur d'une séance ne vote PAS sur sa propre séance
   - Absence de vote = positif par défaut
   - Égalité = validation (bénéfice du doute)

5. **Blâmes** : sanctionnent UNIQUEMENT les séances rejetées par vote. PAS l'absence de vote. C'est une décision de design importante.

6. **RLS Supabase** : activée sur toutes les tables. Si une donnée ne remonte pas, vérifier d'abord la RLS. Tester avec plusieurs comptes utilisateurs.

7. **Sécurité Supabase** : JAMAIS exposer la `service_role key` côté client. UNIQUEMENT l'`anon key` dans l'app.

8. **Excuses** :
   - Standard : réduction de 1 séance pour la semaine, vote majoritaire
   - Majeure : remise à zéro de la semaine, vote majoritaire, réservée aux cas exceptionnels (hospitalisation, blessure grave)

## Hors périmètre V1 (NE PAS implémenter maintenant)

- Paiements réels intégrés (cagnotte = virtuelle uniquement)
- Chat interne
- Intégrations Apple Health, Google Fit, Garmin, Nike
- Streaks, badges, gamification avancée
- Classements inter-groupes
- Monétisation

## Documentation du projet

Tous les documents importants sont dans `docs/` :
- `PROJECT_STATUS.md` : état d'avancement, mis à jour à chaque fin de phase
- `PHASE_X_REPORT.md` : compte-rendu de chaque phase terminée
- `DECISIONS.md` : journal des décisions techniques importantes
- `KNOWN_ISSUES.md` : bugs connus et points de vigilance
- `SETUP.md` : guide d'installation pour un nouveau dev

**Toujours mettre à jour ces fichiers à chaque fin de phase.**

## Référence externe

- Spec fonctionnelle complète : `docs/SPECIFICATIONS_MVP.md`
- Schéma de base de données : `docs/DATABASE_SCHEMA.md` + `supabase/migrations/`
