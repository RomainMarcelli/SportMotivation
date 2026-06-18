# Sport Motiv — PROJECT

## Vision
App mobile de **motivation sportive entre amis**. On crée un défi de groupe sur une
durée, chacun déclare ses séances (preuve photo / Strava / lien), les membres
**votent** pour valider, les manquements génèrent **pénalités** et alimentent une
**cagnotte** commune, débloquée en fin de défi. Système de blâmes, excuses, semaine
lundi→dimanche. UI sombre, premium, sans emoji.

## Stack
- Expo ~54 + Expo Router v6 · React Native 0.81 · React 19
- NativeWind v4 + Tailwind CSS v3
- Supabase (auth + Postgres + RLS) — schéma déjà en place (~15 tables + vues)
- TanStack Query v5 · Zustand v5 · Zod v4 · react-hook-form
- lucide-react-native (icônes) · expo-linear-gradient · react-native-reanimated v4
- Polices : `@expo-google-fonts/bricolage-grotesque` (display) + `.../plus-jakarta-sans` (body)

## Règles transverses
- **iOS, Android ET Web (react-native-web)** : chaque écran doit s'afficher ET fonctionner sur les
  trois, et **rendre correctement dans un viewport navigateur de largeur mobile (~390 px)** (la revue
  se fait actuellement sur web). Gérer explicitement les différences de plateforme :
  - **Ombres / glow** : `elevation` (Android) est ignorée sur web → toujours passer par
    `lib/shadow.ts` → `glow()` qui rend `shadow*`+`elevation` en natif et `boxShadow` sur web. Ne
    jamais écrire de `shadow*` en dur (déprécié + invisible sur web).
  - **SafeArea** : insets = 0 sur web → ne pas dépendre d'un padding SafeArea pour l'espacement,
    prévoir un padding propre. Clipping natif : `overflow:'hidden'` + `borderRadius` sur le **même**
    conteneur ; ne pas poser une elevation sur fond transparent (artefact sombre Android).
  - **Gradients** : `expo-linear-gradient` ; jamais sous une layout-animation `entering` (cf. `Reveal`).
  - **Tactile vs souris/hover** : ne pas dépendre du `hover` ; cibles tap suffisantes (`hitSlop`).
  - **Scroll** : `onMomentumScrollEnd` ne se déclenche **pas** sur web → dériver l'état du scroll via
    `onScroll`. Les pages d'un ScrollView horizontal ne prennent pas la hauteur sur web → mesurer la
    zone (`onLayout`) et fixer la hauteur/largeur des slides.
  - **Web / SSR (Expo Router rend en Node)** : ne jamais toucher `window`/`document`/`localStorage`/
    `WebSocket` au niveau module sans garde (`typeof x === "undefined"` ou `Platform.OS`). Cf.
    `lib/supabase.ts` (transport `ws` Node + storage natif uniquement). Dark-first NativeWind nécessite
    `darkMode: "class"` (tailwind.config).
- Zéro emoji — uniquement icônes lucide.
- Dark-first chaud (`ink #15100C`), jamais de blanc pur.
- `rounded-card` (18) / `rounded-full` (chips, avatars).
- Animations d'entrée staggerées (Reanimated), `prefers-reduced-motion` respecté.
- SafeArea propre iOS/Android. TypeScript strict, pas de `any`. Composants atomiques.

## Conventions projet (mémoire)
- Libs natives : **`npx expo install`** (jamais `npm install`).
- **Romain fait les commits** lui-même (jamais automatique).
- Tests **Jest** systématiques (logique pure ~100 %, UI 60–70 %).
- SQL à exécuter → fichiers `supabase/sql/NNN_*.sql` (pas dans le chat).
- Work-log gitignoré : `work-log/PHASE-X.md`. Doc continue dans `docs/` et `.claude/`.

## Plan des étapes (14)
0. ✅ Design system
1. ✅ Auth — onboarding, sign-in, **inscription en un seul écran** (photo, prénom, pseudo, e-mail,
   mot de passe). L'ancienne étape « Setup profil » est **fusionnée ici** ; le groupe `(setup)` a été
   supprimé (le profil se complète à l'inscription, le `nom` reste réglable dans Profil).
2. *(libre — ancien « Setup profil », désormais fusionné dans l'Étape 1)*
3. Home (accueil : liste groupes + état vide, planning semaine, jokers)
4. Création & adhésion (group/create, join, join-confirm, scan, accept-invite)
5. Groupe dashboard (Infos/Séances, membres, classement, blâmes)
6. Déclarer une séance
7. Voter
8. Excuses
9. Cagnotte (trésorier)
10. Gestion des invitations (statuts, renvoyer/annuler)
11. Notifications
12. Fin de défi / Clôture
13. Profil & Paramètres (thème verrouillé sur Sombre)

> Suivi détaillé : `.claude/PROGRESS.md` (tableau de bord) + rapports par étape dans `.claude/reports/`.

> ⚠️ Le dépôt contient déjà une app fonctionnelle (branche `feature/refonte`). L'étape 0
> **rebrande** la couche DA (template Expo → DA Sport Motiv) sans casser les écrans existants.
