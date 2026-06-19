# Rapport — Étape 4 : Création & adhésion (restyle DA)

Date : 2026-06-19 · Branche : `feature/refonte` · Statut : ✅
Sources : `maquette/V3/sport-motiv-creer-defi.html` + `sport-motiv-rejoindre.html`.
UI uniquement, **toute la logique/mutations réutilisée** (création, join par code, scan, invitation).

## 1. Reconnaissance (existant)
- Écrans `app/group/` : `create.tsx`, `join.tsx`, `scan.tsx`, `join-confirm.tsx`, `accept-invite.tsx`
  (+ `[id]/*`, `penalty-response` hors périmètre). Tous au **style template** (bg-white/dark, primary).
- Logique réutilisée **inchangée** :
  - `features/groups/mutations.ts` → `useCreateGroup` ; `schemas.ts` → `createGroupFormSchema`.
  - `features/groups/join.ts` → `useGroupPreview`, `useJoinGroup`, `mapJoinError`.
  - `features/groups/invitations.ts` → `useGroupPreviewById`, `useAcceptInvitation`, `useRefuseInvitation`.
  - `lib/group-code.ts` (`isValidInviteCode`/`normalizeInviteCode`), `lib/invite-link.ts` (`parseInviteData`).
  - `RulesRecap`, `rules-snapshot`, `ACTIVITY_OPTIONS`.

## 2. Composants DA (restylés / créés)
- **Restylés** : `Stepper` (carte pleine largeur `surface`, −/+ `surface-2`, valeur `display` + `suffix`
  inline et/ou `unit` dessous), `SegmentedControl` (piste `cream/0.06`, segment actif `surface-2`,
  icône optionnelle), `DateField` (déclencheur `surface`/`line`, picker `themeVariant=dark`),
  `RulesRecap` (récap DA à base de `RecapRow`).
- **Créés** : `components/ui/CheckCard.tsx` (case d'acceptation, cochée = coral-soft + anneau),
  `components/ui/Note.tsx` (encart amber/coral/mint pour notes de verrouillage),
  `components/ui/RecapRow.tsx` (`RecapRow` + `RecapCard`),
  `features/groups/GroupPreviewCard.tsx` (carte d'aperçu d'un défi, partagée join-confirm/accept-invite).
- **Header de stack** (`app/group/_layout.tsx`) restylé DA : fond `ink`, sans ombre, tint `cream`,
  titre `font-display`, retour minimal.

## 3. Écrans
- **Créer un défi** (`create.tsx`) : `AppBackground` + form DA (nom `TextField`, dates `DateField`,
  steppers pénalité/durée min/seuil/objectif, chips activités, segmented publication + **délai de
  vote**, **récap live**, `Note` verrouillage, `CheckCard`). CTA `GradientButton` **désactivé tant
  qu'invalide** (`mode:"onChange"` + `isValid`), erreur mutation en bandeau rouge inline. Schéma +
  mutation **inchangés**.
- **Rejoindre** (`join.tsx`) : intro DA (badge + titre), champ **code** large (numérique, 6 chiffres,
  `display`), CTA « Voir le défi » → `join-confirm`, bouton « Scanner un QR code » → `scan`.
- **Scan** (`scan.tsx`) : caméra `CameraView` + **cadre de visée coral** (coins), permission DA.
  **Web** : dégradation propre → encart « scan indisponible » + CTA renvoyant vers la saisie du code
  (pas de crash). Logique `parseInviteData` inchangée.
- **Confirmer** (`join-confirm.tsx`) : bandeau « Défi trouvé » (mint), `GroupPreviewCard`, `RulesRecap`,
  steppers objectif + pénalité perso, `Note` verrouillage, `CheckCard`, CTA « Rejoindre le défi ».
  États loading/erreur DA. Logique `useGroupPreview`/`useJoinGroup` inchangée.
- **Accepter une invitation** (`accept-invite.tsx`) : « Tu es invité à rejoindre » + `GroupPreviewCard`,
  `RulesRecap`, steppers, `CheckCard`, CTA Accepter (`GradientButton`) + Refuser (`Button ghost`).

## 4. Helper testé
- `lib/stepper.ts` (`stepValue` borné min/max) + `lib/__tests__/stepper.test.ts` (3 cas).
- `npx tsc --noEmit` ✅ · `jest` 116/116 ✅ (23 suites, +3).

## 5. Écarts / décisions
1. **`max_members`** (mentionné dans la consigne §2) **non ajouté** : absent du `createGroupFormSchema`
   et de `useCreateGroup` (la DB applique son défaut, 10). Ne pas inventer de backend → champ omis.
   À ajouter plus tard (schéma + mutation + colonne) si on veut le rendre configurable.
2. **Durée du défi** : conservée en **dates début/fin** (`DateField`) comme la logique existante, plutôt
   que les presets « 1/2/3/6 mois » de la maquette (qui calculeraient les dates) — pas de changement
   de logique.
3. **Saisie du code** : un seul champ large à 6 chiffres (réutilise `normalizeInviteCode`/
   `isValidInviteCode`) au lieu des 6 cases de la maquette — même résultat, logique inchangée.
4. **Ajout d'activité personnalisée** (maquette) non repris : `acceptedActivities` est borné à
   `ACTIVITY_OPTIONS` (ids stockés en base). Hors périmètre UI/logique existante.

## 6. Révision « Créer un défi » — collage à la maquette
Refonte de `create.tsx` au plus près de `sport-motiv-creer-defi.html`.
- **Typo** : tout en familles DA (`font-display`/`font-body`), tailles alignées maquette ; sous-titre
  « Tu en seras l'admin. ».
- **Nom** : `TextField` avec **icône `Trophy`** à gauche.
- **Durée du défi** (refonte) : **chips presets 1/2/3/6 mois** + **« Autre »** → stepper valeur +
  segmented unité **jours / mois / années**. Calcule `challengeEnd` depuis `challengeStart` (la
  mutation prend toujours start/end → **logique inchangée**, seules les dates sont alimentées par ce UI).
- **Date de début** : bloc `DateField` (picker dark) + bouton **« Aujourd'hui »** (défaut aujourd'hui).
- **Récap dates** : « Démarre {début} · se termine le {fin} » (live).
- **Objectif par défaut** : stepper (défaut **4**) + note « Chaque membre pourra ajuster le sien ».
- **Pénalité** : stepper général + note « modifiable par chaque membre ensuite » (per-membre existant).
- **Durée minimum** : stepper **autorise 0** → affiche **« Aucun minimum »** (nouveau `zeroLabel` du
  `Stepper`). Schéma : `minDurationMin.min(1)` → **`.min(0)`** (changement signalé, défaut 20).
- **Publication / Délai de vote / Seuil de blâmes** : inchangés (segmented + steppers).
- CTA désactivé tant qu'invalide (conservé).

### Activités — texte libre (§10)
- **Stockage** : `groups.accepted_activities` est **`Json` (jsonb), tableau libre** → aucun changement
  DB nécessaire. **Décision** : la valeur canonique passe des **ids** (`running`…) aux **noms de sport**
  (`Course`…). Cohérence assurée sur **tous** les writers/readers :
  - `create.tsx` + `edit.tsx` → nouveau composant **`components/groups/ActivityPicker.tsx`** (chips
    par défaut **Course/Musculation/Vélo/Rando/Natation** + **ajout texte libre** ; icône auto).
  - `declare.tsx` → chips rendues depuis `group.accepted_activities` (noms) + `getSportIcon`, stocke le
    **nom** comme `activity_type` ; pré-remplissage Strava traduit l'id→nom (`getActivityLabel`, best-effort).
  - `sessions.tsx` / dashboard → `getActivityLabel(nom)` renvoie le nom (fallback) → **OK sans changement**.
- **`lib/sports.ts` (nouveau)** : `normalizeSport` (sans accents/casse) + `getSportIcon` (Course→Footprints,
  Muscu→Dumbbell, Vélo→Bike, Rando→Mountain, Natation→Waves, Yoga→PersonStanding, Danse→Music,
  Ski→Snowflake, Combat→Swords, Cardio→Heart…) + **fallback générique `Activity`** pour les inconnus.
- ⚠ **Données existantes** : d'éventuels groupes déjà créés avec des **ids** (`running`) afficheront ces
  ids comme libellés (pas de migration de données ici). Nouveaux groupes = noms. Pas de SQL requis
  (jsonb libre). Si on veut normaliser l'historique → script `supabase/sql/NNN_*.sql` dédié (non fourni,
  aucune donnée de prod connue).
- **`lib/duration.ts` (nouveau)** : `addDuration`/presets/units pour le calcul durée→date de fin.

### Tests ajoutés
`lib/__tests__/sports.test.ts`, `lib/__tests__/duration.test.ts` (+ `stepper.test.ts` étape 4).
`npx tsc --noEmit` ✅ · `jest` **124/124** ✅ (25 suites).

### Écart restant
- **`max_members`** toujours non exposé (cf. §5.1) — inchangé.

### Correctif DB — « Aucun minimum » (0)
Erreur à la création : `groups_min_duration_min_check` (la base interdisait `min_duration_min = 0`).
Comme l'UI autorise désormais 0 (« Aucun minimum »), patch fourni **`supabase/sql/016_groups_min_duration_zero.sql`**
(relâche la borne basse à 0, garde ≤ 600) — **à exécuter dans Supabase**. En attendant, l'erreur est
mappée en message lisible dans `create.tsx`. (Choisir une durée ≥ 5 min fonctionne sans le patch.)

## Commit proposé
`feat(group): création & adhésion à la DA (steppers, recap, preview, scan web-safe)`
`feat(group): créer-défi collé maquette (durée presets, sports texte libre + icônes auto)`
