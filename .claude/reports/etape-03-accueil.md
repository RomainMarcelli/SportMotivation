# Rapport — Étape 3 : Accueil (home) restyle DA

Date : 2026-06-19 · Branche : `feature/refonte` · Statut : ✅
Source maquette : `maquette/V3/sport-motiv-accueil.html`. UI uniquement, iOS + Android + web.

## 1. Reconnaissance (existant)
- **Écran** : `app/(tabs)/index.tsx` (`HomeScreen`) — style template (bg-white/dark, bg-primary, neutres),
  `FlatList` des groupes + 2 `ActionCard` + bouton déconnexion.
- **Tab bar** : `app/(tabs)/_layout.tsx` — `Tabs` avec `Colors[colorScheme].tint`, onglets Accueil/Profil.
- **Données réutilisées** :
  - `useMyGroups()` (`features/groups/queries.ts`) → RPC `get_my_groups` : `membershipId`, `role`,
    `weeklyTarget`, `group` (name, dates, status, penalty_amount, max_members…). **Pas** de compteur
    de membres ni de cagnotte agrégée dans cette query.
  - `useProfile()` (avatar, prénom, nom) · `useUnreadCount()` (badge notifs).
- **Écarts backend constatés** (cf. §5) : pas de query `weekly_plans`, pas de table `jokers`.

## 2. Restyle DA — `app/(tabs)/index.tsx` (réécrit)
- `AppBackground` full-bleed + `ScreenContainer transparent` + `ScrollView`.
- **Header** : `BrandMark` (34) + wordmark « Sport**Motiv** » ; bouton notifs (surface + `Bell` +
  pastille coral si non-lu) ; `Avatar` (40, photo/inertials) → onglet Profil. Salutation
  « Salut {prénom} » (`font-display`) + sous-titre dérivé du nb de défis en cours.
- **Liste des défis** : une `GroupCard` par groupe (`components/home/GroupCard.tsx`), entrées
  `Reveal` staggerées. Carte = nom + couronne admin + `Badge` de statut (active→coral « En cours »,
  setup→amber « À venir », completed→mint, cancelled→neutral) + timing (J-XX via `daysUntil` si en
  cours, sinon plage de dates) + objectif hebdo + max membres + chevron. → `group/[id]`.
- **État vide** : `EmptyState` (icône `Flame` dans une tuile, titre, sous-titre) + `GradientButton`
  « Créer un défi » + bouton outline « J'ai un code — Rejoindre ». État `loading` distinct.
- **« Ma semaine »** : `components/home/WeekPlanner.tsx`, rattaché au **groupe actif** (1er groupe
  `status==='active'`, sinon 1er groupe). 7 jours **tappables** branchés sur `weekly_plans` :
  jour prévu = pastille dégradée + `Check` ; jour libre = **pastille pointillée amber** ;
  aujourd'hui = anneau coral. Compteur **live** (jours prévus / objectif) avec `CountUp`. Miroir
  d'état local + rollback si l'upsert échoue.
- **Jokers** : chip « 1 joker » ↔ « Joker utilisé » au toggle (voir §5, **placeholder local**).
- **Actions bas de liste** (si groupes) : `GradientButton` « Créer un défi » + bouton outline
  « Rejoindre un défi ». Bouton « Se déconnecter » retiré de l'accueil (déjà dans l'onglet Profil,
  conforme à la maquette à 2 onglets).

## 3. Tab bar (`app/(tabs)/_layout.tsx`)
Restylée DA : fond `ink2`, bordure haute `line`, onglet actif `coral` / inactif `cream-dim`,
libellés `font-body-semibold` 11px, icônes lucide `House`/`User` (22). `HapticTab` conservé.

## 4. Nouveaux modules & tests
- `lib/count-up.ts` (`clamp01`, `easeOutCubic`, `countAt`) + `components/ui/CountUp.tsx` (boucle
  `requestAnimationFrame`, reduced-motion → valeur finale immédiate).
- `features/plans/plan.ts` (`WEEKDAY_LABELS`, `todayWeekdayIndex`, `togglePlannedDay`,
  `normalizePlannedDays`) + `features/plans/queries.ts` (`useWeeklyPlan`, `useToggleWeeklyPlanDay`).
- `lib/date.ts` : ajout `daysUntil`.
- Tests : `lib/__tests__/count-up.test.ts`, `features/plans/__tests__/plan.test.ts`, +3 cas
  `daysUntil` dans `lib/__tests__/date.test.ts`.
- **`npx tsc --noEmit` ✅ · `jest` 107/107 ✅** (21 suites, +12 vs étape 2).

## 5. Écarts backend signalés (rien inventé)
1. **`weekly_plans`** : la table existe (`planned_days` Json, `week_start`, par user/groupe) mais
   **aucun** module ne la lisait. J'ai créé `features/plans/` : accès **minimal** (lecture +
   bascule d'un jour via upsert `onConflict group_id,user_id,week_start`) **sur le schéma existant,
   sans inventer de colonne**. L'upsert exige un **index unique** `(group_id, user_id, week_start)` :
   fourni de façon idempotente dans **`supabase/sql/015_weekly_plans_unique.sql`** (à exécuter).
2. **Jokers** : **aucune table `jokers`**. Le vrai système = `excuses` (`groups.max_excuses`,
   enum `excuse_type/status`) → **Étape 8**. Le chip joker est donc un **placeholder local non
   persistant** (`useState`, marqué `// TODO Étape 8`). Aucun backend inventé.
3. **« Ma semaine » mono-groupe** : la maquette vise un défi unique ; l'app gère N groupes. Décision :
   afficher « Ma semaine » pour le **groupe actif** (1er `active`, sinon 1er). À rediscuter si on veut
   un planning par groupe.

## Décisions / à valider
1. `planned_days` interprété comme **« jours prévus »** (le plan tappable), pas « séances faites » :
   c'est la seule donnée de `weekly_plans`. Compteur = jours prévus / objectif. OK ?
2. Joker = placeholder local jusqu'à l'Étape 8 (Excuses). OK ?
3. Déconnexion retirée de l'accueil (reste dans Profil). OK ?
4. Exécuter `supabase/sql/015_weekly_plans_unique.sql` (index unique requis par l'upsert).

## 6. Finitions (revue web — 2e passe)
1. **État vide centré (web)** : `grow` sur le `contentContainerClassName` du `ScrollView` +
   wrapper `flex-1 justify-center` autour de `EmptyState` → le contenu prend la hauteur du viewport
   et se centre verticalement (web + mobile). La liste peuplée reste en haut (scroll normal).
2. **Fond derrière le header** : halo coral d'`AppBackground` adouci — cœur décalé hors-champ
   (`cx 10% / cy -8%`, `r 95%`), pics abaissés (0.18 → 0.12) et ramp plus dense (9 stops). Derrière
   le header le dégradé est quasi plat → plus de bord dur ni de banding « en carrés » (limite 8 bits
   des dégradés SVG navigateur). Changement subtil, validé pour les écrans auth qui le partagent.
3. **État vide enrichi** : tuile flamme agrandie (96px, `Flame` 42) + **halo chaud** (2 cercles
   coral concentriques très peu opaques = halo sans dépendance de flou, cross-platform) + `glow()`
   web. Titre/sous-titre + 2 CTA inchangés. Sobriété DA conservée.
4. **Joker masqué** : chip retiré de l'UI (code conservé en commentaire dans `WeekPlanner`,
   `// TODO Étape 8`). Reviendra branché sur le système d'excuses à l'Étape 8.

`npx tsc --noEmit` ✅ · `jest` 107/107 ✅.

## 7. Header + tab bar (revue web — 3e passe) + onglet Groupes
1. **Rectangle sombre derrière le header** : c'était le **bord du halo** `AppBackground` (zone warm
   haut-gauche / ink à droite, lu comme un rectangle). Ajout de `components/ui/TopFade.tsx` — fondu
   **plein largeur** `ink → transparent` (comme la statusbar de la maquette), posé au-dessus
   d'`AppBackground` sous le contenu : la zone du header est aplatie sur de l'`ink` plein → header
   parfaitement fondu, aucun bord/rectangle ni banding (web + mobile).
2. **Header trop collé** : `SafeAreaProvider` ajouté au root (`app/_layout.tsx`) → insets fiables
   (web inclus). Padding haut du contenu `pt-1 → pt-5`, espace logo↔greeting `mt-3.5 → mt-5`. Écrans
   d'onglets en `edges={["top"]}` (la tab bar gère le bas → pas de double inset).
3. **Tab bar** : libellés **affichés** (`tabBarShowLabel`), hauteur suffisante
   (`58 + insets.bottom`, web 68) + `paddingBottom` = home indicator, `paddingTop` 8, label
   `font-body-semibold` 11. Actif `coral` / inactif `cream-dim`. Plus rien n'est coupé.
4. **Onglet Groupes** (demande Romain) : nouveau `app/(tabs)/groups.tsx` + onglet `Users` entre
   Accueil et Profil. Sans groupe → même écran Créer/Rejoindre (composant partagé
   `components/home/EmptyGroups.tsx`, extrait de l'accueil) ; avec groupes → liste `GroupCard` +
   actions Créer/Rejoindre (le détail par groupe viendra aux étapes suivantes).

`npx tsc --noEmit` ✅ · `jest` 107/107 ✅.

## 8. Revue web (4e passe — screenshots)
1. **Bande/« rectangle » transparent au-dessus du header** : cause = pas de `viewport-fit=cover`
   sur web → le navigateur réserve la zone notch en **transparent** (au-dessus de notre viewport ;
   le `TopFade` peignait déjà de l'`ink` plein côté app). Ajout de **`app/+html.tsx`** (document web
   Expo Router) : `viewport-fit=cover` + `html/body/#root` en `ink` full-bleed + `ScrollViewStyleReset`.
   Le contenu s'étend désormais sous la notch (real device : status bar par-dessus l'`ink`).
2. **Tab bar trop basse (libellés rognés)** : `paddingBottom`/hauteur remontés
   (`60 + max(insets.bottom, web 22 / natif 14)`) → libellés dégagés même quand la frame de
   l'émulateur web rogne le bas. Actif `coral` / inactif `cream-dim`.
3. **Onglet Groupes** : ajout du **même header que l'accueil** (`components/home/AppHeader.tsx`,
   extrait et partagé : marque + cloche + avatar) + **contenu centré** (état vide centré
   verticalement). L'accueil utilise aussi `AppHeader` (DRY).

`npx tsc --noEmit` ✅ · `jest` 107/107 ✅.

## 9. Restructuration onglets (Accueil / Groupes)
Répartition du contenu entre les deux onglets de la tab bar.
- **Accueil** (`app/(tabs)/index.tsx`) recentré : header + salutation + **« Ma semaine »** du groupe
  actif. **Liste des défis et actions Créer/Rejoindre retirées** (déplacées dans Groupes). Si **aucun
  défi** → invite légère `NoChallengeInvite` (Card « Tu n'as pas encore de défi » + CTA Créer/Rejoindre)
  à la place de « Ma semaine ».
- **Onglet Groupes** (`app/(tabs)/groups.tsx`) **adaptatif** via `groupsView(useMyGroups)` :
  - **0** → état vide `EmptyGroups` (flamme + CTA), centré ;
  - **1** → `Redirect` (replace) direct vers `group/[id]` (pas de pile empilée) ;
  - **2+** → liste `GroupCard` (`Reveal`) + actions Créer/Rejoindre.
- Nouveau helper pur **`features/groups/selectors.ts`** (`pickActiveGroup`, `groupsView`) + test
  `features/groups/__tests__/selectors.test.ts` (6 cas).
- ⚠ Le détail `group/[id]` reste au **style template** → DA à l'**Étape 5** (ici : structure/navigation
  seulement).

`npx tsc --noEmit` ✅ · `jest` 113/113 ✅ (22 suites).

## Commit proposé
`feat(home): accueil à la DA (défis, état vide, Ma semaine/weekly_plans, tab bar)`
