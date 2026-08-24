# Rapport — Étape 0 : Setup Design System

Date : 2026-06-17 · Branche : `feature/refonte` · Statut : ✅ Terminé

## Ce qui a été fait

- [x] Lu les 17 maquettes `maquette/V3/*.html` → DA complète extraite dans `.claude/DA.md`
      (tokens identiques sur tous les fichiers ; tokens supplémentaires repérés : `red`/`red-soft`,
      dégradés `green` et `amber`).
- [x] Audité l'existant : `tailwind.config.js` (template bleu), `global.css`, `_layout.tsx`
      (splash blanc + spinner bleu), `constants/theme.ts` (défaut Expo), pas de `colors.ts`,
      pas de polices custom, `components/ui` au style template.
- [x] Installé polices + dégradé : `npx expo install expo-linear-gradient @expo-google-fonts/bricolage-grotesque @expo-google-fonts/plus-jakarta-sans`.
- [x] `constants/colors.ts` — tokens, dégradés (brand/green/amber), palette avatars, teintes d'ombre.
- [x] `constants/fonts.ts` — map `useFonts` (5 graisses × 2 familles) + familles nommées par graisse.
- [x] `app/_layout.tsx` — `useFonts` + `SplashScreen.preventAutoHideAsync/hideAsync`, splash en `ink`,
      thème navigation sombre (`NavDarkTheme`), `contentStyle` fond `ink`.
- [x] `tailwind.config.js` — couleurs DA, `fontFamily`, `borderRadius`, `letterSpacing`
      (palette `primary` bleu conservée et marquée *legacy*).
- [x] Composants `components/ui/` : `GradientButton` (sheen Reanimated + reduced-motion),
      `Button` (restylé + variant `danger`, API conservée), `Card`, `Avatar`, `Badge`, `Chip` (restylé).
- [x] Dark-first forcé (`theme-store` défaut `dark`).
- [x] Vérifs : `npx tsc --noEmit` ✅ · `jest` 83/83 ✅.

## Packages installés
```
expo-linear-gradient@15.0.8
@expo-google-fonts/bricolage-grotesque
@expo-google-fonts/plus-jakarta-sans
```

## Décisions / écarts validés
1. **Chip vs Badge** — `Chip` reste une puce **sélectionnable** (utilisée dans 17 écrans) ; `Badge`
   (nouveau) couvre les tags de statut à variants.
2. **API `Button` inchangée** (rétro-compat) + ajout `danger`. Hauteur portée à 56px (spec CTA DA).
3. **`primary` (bleu) gardé en *legacy*** dans Tailwind — à retirer une fois les écrans migrés.
4. **Dark-first** = défaut `dark` (option clair/système encore possible à ce stade).

## Limites / non fait
- Pas de vérif visuelle device/simulateur.
- Polices chargées au runtime (`useFonts`) ; config plugin (build) à envisager plus tard.
- Patterns avancés (tab bar, ring, swipe-deck…) documentés dans `DA.md`, à produire aux étapes suivantes.
