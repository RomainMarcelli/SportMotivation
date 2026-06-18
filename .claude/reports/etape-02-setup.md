# Rapport — Étape 2 : Setup profil (post-inscription)

Date : 2026-06-18 · Branche : `feature/refonte` · Statut : 🔄 Livré, en attente de validation visuelle

## 1. Reconnaissance (existant)
- **Écran** : un seul, `app/(setup)/index.tsx` (`CompleteProfileScreen`). `_layout.tsx` = `Stack` nu.
- **Champs** : `firstName` (Prénom), `lastName` (Nom), `username` (Pseudo) + **photo optionnelle**.
- **Logique réutilisée telle quelle** (non modifiée) :
  - `features/auth/profile-schemas.ts` → `completeProfileSchema` (prénom/nom 1–50 ; pseudo 3–30,
    regex `a-zA-Z0-9_.-`).
  - `features/auth/profile-mutations.ts` → `useUpdateProfile` (upload avatar base64 → bucket `avatars`
    `{userId}/avatar.ext`, puis update `users`).
  - `features/auth/mutations.ts` → `useSignOut`. Picker : `expo-image-picker` (déjà présent).
- **État avant** : style template (bg-white/dark, `bg-primary-500`, bordures neutres).

## 2. Restyle DA (UI uniquement)
- `app/(setup)/_layout.tsx` : conteneur racine `ink` + `AppBackground` full-bleed + `Stack` à
  `contentStyle` transparent (même pattern que `(auth)`).
- `app/(setup)/index.tsx` réécrit à la DA :
  - Hero `BrandMark` (size 56) + titre `font-display` + sous-titre `cream-dim`.
  - **Photo** : aperçu rond 96px via `Avatar` (image pické) ou placeholder pointillé `border-line-2` +
    `Camera` ; badge coral (Plus / Camera) en bas-droite ; label « Photo de profil · optionnel » →
    « Changer la photo ». Logique `pickImage` **inchangée**.
  - Champs Prénom / Nom / Pseudo via `TextField` (icônes `User` / `User` / `AtSign`), `gap 18`,
    padding 24.
  - CTA `GradientButton` « Continuer » (loading sur `useUpdateProfile`, erreurs en `Alert`),
    **désactivé tant que le formulaire n'est pas valide** (`mode: "onChange"` + `disabled={!isValid}`,
    cohérent avec sign-up). « Me déconnecter » en `Button` ghost.
  - Entrées staggerées via `Reveal` (pas de layout-animation sous un gradient). Transparent → laisse
    voir `AppBackground`. iOS + Android + web (viewport mobile).
- `components/ui/Avatar.tsx` : `size` accepte désormais un **nombre** (diamètre px) en plus de
  `sm/md/lg` — nécessaire pour l'aperçu 96px. Rétro-compatible.

## 3. Tests & vérif
- Pas de nouveau helper/logique testable (restyle UI + logique réutilisée). `Avatar` (taille
  numérique) couvert par `tsc`. Suite inchangée.
- `npx tsc --noEmit` ✅ · `jest` 93/93 ✅.

## Décisions / à valider
1. **3 champs conservés** : prénom / **nom** / pseudo (le schéma a `lastName`). La consigne mentionnait
   « prénom, pseudo, photo » ; j'ai gardé le nom car `completeProfileSchema` l'exige (non modifié). OK ?
2. CTA désactivé jusqu'à validité (comme sign-up) — OK ?
3. Picker non modifié (`MediaTypeOptions` est déprécié dans les versions récentes d'expo-image-picker
   mais fonctionnel ; à moderniser plus tard si besoin, hors périmètre UI).

## Questions
1. Validation visuelle (web mobile + Android + iOS) OK ?
2. Commit : je te laisse faire. Message proposé :
   `feat(setup): écran profil post-inscription à la DA (BrandMark, Avatar, TextField, GradientButton)`
