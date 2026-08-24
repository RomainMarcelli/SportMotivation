# Sport Motivation App

> Application mobile de motivation sportive entre amis, basée sur l'engagement collectif et une cagnotte commune.

![Status](https://img.shields.io/badge/status-en%20développement-orange)
![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-lightgrey)
![License](https://img.shields.io/badge/license-private-red)

---

## 📖 Concept

Sport Motivation App permet à des **groupes d'amis** de se motiver mutuellement à pratiquer une activité sportive régulière, en s'appuyant sur trois leviers psychologiques :

- 🤝 **L'engagement social** — on s'engage devant ses amis
- 💸 **La perte financière** — chaque séance manquée alimente une cagnotte
- 🎉 **La récompense collective** — la cagnotte finance une activité commune en fin de défi

### Comment ça marche ?

1. Un utilisateur **crée un groupe** et définit la durée du défi (ex: 30 mai → 30 août)
2. Chaque membre **rejoint le groupe** (code, lien ou QR code)
3. Chacun s'engage sur un **nombre de séances par semaine**
4. Tout au long du défi, chacun **déclare ses séances** (photo, Strava, lien externe)
5. Les autres membres **votent** pour valider les séances
6. Les séances manquées génèrent des **pénalités** versées à la cagnotte
7. En fin de défi, la cagnotte est **débloquée** pour une activité collective 🍽️

---

## 🛠️ Stack technique

### Application mobile
- **React Native** + **Expo** + **TypeScript**
- **Expo Router** (navigation file-based)
- **NativeWind** (Tailwind pour React Native)
- **Zustand** + **TanStack Query** (gestion d'état)
- **React Hook Form** + **Zod** (formulaires et validation)
- **Lucide React Native** (icônes)

### Backend
- **Supabase**
  - PostgreSQL (base de données)
  - Auth (email/password + Google OAuth)
  - Storage (photos, médias)
  - Realtime (mises à jour live)
  - Edge Functions (tâches planifiées)

### Intégrations
- **Strava API** (OAuth 2.0)
- **Expo Notifications** (notifications push)

---

## 📁 Structure du projet

```
sport-motivation-app/
├── .claude/                  # Skills Claude Code (conventions, règles métier)
│   ├── PROJECT_SKILL.md
│   ├── WORKFLOW_SKILL.md
│   └── SUPABASE_SKILL.md
├── app/                      # Routes Expo Router
├── components/               # Composants UI réutilisables
├── features/                 # Logique métier par domaine
│   ├── auth/
│   ├── groups/
│   ├── sessions/
│   ├── votes/
│   ├── excuses/
│   ├── pots/
│   └── notifications/
├── lib/                      # Utilities (supabase client, helpers)
├── hooks/                    # Hooks React custom
├── types/                    # Types TypeScript (générés depuis Supabase)
├── constants/                # Constantes (couleurs, configs)
├── assets/                   # Images, fonts
├── supabase/                 # Migrations SQL, Edge Functions
└── docs/                     # Documentation du projet
    ├── PROJECT_STATUS.md
    ├── SPECIFICATIONS_MVP.md
    ├── DECISIONS.md
    ├── KNOWN_ISSUES.md
    └── SETUP.md
```

---

## 🚀 Démarrage rapide

### Prérequis

| Outil | Version recommandée |
|---|---|
| Node.js | v20 LTS |
| npm | v10+ |
| Git | v2.40+ |
| Android Studio | dernière version (pour l'émulateur) |
| Compte Supabase | gratuit |
| Compte Expo | gratuit |

### Installation

```bash
# Cloner le projet
git clone <repository-url>
cd sport-motivation-app

# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env
# Puis remplir les variables (voir docs/SETUP.md)

# Lancer l'application
npx expo start
```

### Lancer sur Android (émulateur)

```bash
# Démarrer un émulateur depuis Android Studio (Device Manager)
# Puis :
npx expo start --android
```

### Lancer sur iOS (Mac uniquement)

```bash
npx expo start --ios
```

> 📘 Guide d'installation complet : [docs/SETUP.md](./docs/SETUP.md)

---

## 📋 Fonctionnalités du MVP (V1)

### ✅ Inclus dans la V1

- 🔐 Authentification (email/password + Google)
- 👥 Création et gestion de groupes (jusqu'à 10 membres)
- 📜 Acceptation des règles type CGU
- 📅 Configuration du défi (dates, pénalités, règles)
- 🏃 Déclaration de séances (photo in-app, Strava, lien externe)
- 🗳️ Système de vote pour valider/rejeter les séances
- ⚠️ Système de blâmes (anti-fraude)
- 🤒 Système d'excuses (standard et majeure)
- 💰 Cagnotte virtuelle avec suivi des paiements
- 🏆 Classement intra-groupe
- 🎫 Jokers mensuels
- 🔔 Notifications push

### 🚧 Reporté en V2+

- 💳 Paiements réels intégrés (Mangopay / Stripe Connect)
- 💬 Chat interne au groupe
- 📊 Intégrations Apple Health, Google Fit, Garmin
- 🔥 Streaks, badges et gamification avancée
- 🏅 Classements inter-groupes
- 🎯 Modes défi spécial avec cagnotte boostée
- 💵 Monétisation (commission, premium)

---

## 📐 Règles métier critiques

> ⚠️ **À lire avant toute modification du code**

1. **Verrouillage du nombre de séances** : une fois défini par un membre à son entrée dans le groupe, il est verrouillé pour TOUTE la durée du défi.

2. **Anti-fraude photo** : les photos de séance doivent être prises par la caméra in-app. JAMAIS d'upload depuis la galerie. Vérification timestamp + géolocalisation.

3. **Cycle hebdomadaire** : semaine du lundi 00h00 au dimanche 23h59 (fuseau Europe/Paris).

4. **Système de vote** :
   - L'auteur ne vote PAS sur sa propre séance
   - Absence de vote = positif par défaut
   - Égalité = validation (bénéfice du doute)

5. **Blâmes** : sanctionnent UNIQUEMENT les séances rejetées par vote (pas l'absence de vote).

6. **Excuses majeures** : remise à zéro de la semaine, réservée aux cas exceptionnels (hospitalisation, blessure grave).

> 📘 Spécifications complètes : [docs/SPECIFICATIONS_MVP.md](./docs/SPECIFICATIONS_MVP.md)

---

## 📅 Planning de développement

Le projet est découpé en **7 phases** :

| Phase | Description | Statut |
|---|---|---|
| Phase 0 | Setup environnement & projet | 🟡 En cours |
| Phase 1 | Authentification et profil | ⚪ À faire |
| Phase 2 | Création et gestion des groupes | ⚪ À faire |
| Phase 3 | Déclaration de séance et preuves | ⚪ À faire |
| Phase 4 | Vote, excuses, blâmes | ⚪ À faire |
| Phase 5 | Cagnotte et clôture hebdomadaire | ⚪ À faire |
| Phase 6 | Notifications push | ⚪ À faire |
| Phase 7 | Polish et tests | ⚪ À faire |

> 📊 État détaillé : [docs/PROJECT_STATUS.md](./docs/PROJECT_STATUS.md)

---

## 📚 Documentation

| Fichier | Description |
|---|---|
| [docs/SPECIFICATIONS_MVP.md](./docs/SPECIFICATIONS_MVP.md) | Spécifications fonctionnelles complètes |
| [docs/PROJECT_STATUS.md](./docs/PROJECT_STATUS.md) | État d'avancement détaillé |
| [docs/SETUP.md](./docs/SETUP.md) | Guide d'installation complet |
| [docs/DECISIONS.md](./docs/DECISIONS.md) | Journal des décisions techniques |
| [docs/KNOWN_ISSUES.md](./docs/KNOWN_ISSUES.md) | Bugs connus et limitations |

---

## 🗄️ Base de données

Le schéma de base de données est géré via Supabase. Il comprend **14 tables principales** :

- `users`, `groups`, `group_members`, `rule_acceptances`
- `sessions`, `session_proofs`, `votes`, `excuses`
- `penalties`, `blames`, `pots`, `pot_transactions`
- `weekly_plans`, `notifications`

Plus **2 vues** : `v_member_weekly_status`, `v_member_unsettled_blames`

La sécurité est assurée par **Row Level Security (RLS)** sur toutes les tables, avec deux fonctions helper :
- `is_group_member(group_id)`
- `is_group_admin(group_id)`

> 📘 Le script SQL complet est dans `supabase/migrations/`

---

## 🤝 Conventions de code

- **TypeScript strict** activé partout
- **Composants fonctionnels** uniquement
- **Nommage** :
  - Composants : `PascalCase`
  - Hooks : `camelCase` préfixé par `use`
  - Types : `PascalCase`
  - Fichiers de composants : `PascalCase.tsx`
- **ESLint** + **Prettier** configurés
- **Pas de `console.log`** en commit (utiliser `console.warn` ou un logger dédié)

---

## 🔒 Sécurité

- ⚠️ Les variables d'environnement (`.env`) ne sont **JAMAIS** commitées
- ⚠️ La `service_role key` de Supabase ne doit **JAMAIS** être exposée côté client
- ✅ Seules les variables préfixées par `EXPO_PUBLIC_` sont accessibles côté client
- ✅ RLS activée sur toutes les tables Supabase
- ✅ Photos de séance : caméra in-app uniquement (anti-fraude)

---

## 🧪 Tests

À venir en Phase 7.

---

## 📝 Versionnement

Le projet utilise [Semantic Versioning](https://semver.org/).

- **v0.x.x** : phase de développement du MVP
- **v1.0.0** : première version stable (fin de Phase 7)
- **v2.x.x** : intégrations Apple Health, Google Fit, chat interne
- **v3.x.x** : paiements réels intégrés
- **v4.x.x** : monétisation

---

## 📄 Licence

Projet privé. Tous droits réservés.

---

## 📞 Contact

Pour toute question concernant ce projet, contacte Romain.

---

*Dernière mise à jour : Mai 2026*