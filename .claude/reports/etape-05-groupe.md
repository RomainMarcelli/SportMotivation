# Rapport — Étape 5 : Détail du groupe (dashboard) restyle DA

Date : 2026-06-19 · Branche : `feature/refonte` · Statut : ✅
Source : `maquette/V3/sport-motiv-groupe.html`. UI uniquement, logique/queries réutilisées (+ reads minimaux).

## 1. Reconnaissance (existant)
- **Structure avant** : `app/group/[id]/(tabs)/` (bottom-tabs **Infos** = `index.tsx`, **Séances** =
  `sessions.tsx`) + `(tabs)/_layout.tsx`. Écran Infos = style template (bg-white, primary), feed Séances
  via `useGroupSessions`. `[id]/_layout.tsx` = Stack header template.
- **Queries dispo** : `useGroup` (RPC `get_group_dashboard`), `useGroupMembers` (RPC), `useGroupSessions`.
  Tables/vues présentes mais **sans query** : `pots` (cagnotte), `v_member_unsettled_blames` (blâmes),
  `v_member_weekly_status` (statut hebdo).

## 2. Refonte → un seul écran (= maquette)
La maquette est un **écran unique** avec bascule Infos/Séances (pas des bottom-tabs). J'ai donc :
- **Supprimé** `app/group/[id]/(tabs)/` (les 3 fichiers) ; créé **`app/group/[id]/index.tsx`** (dashboard).
- `[id]/_layout.tsx` : header de stack **DA** (ink, sans ombre, titre `display`) pour les sous-écrans ;
  `index` en `headerShown:false` (header custom dans l'écran).
- `declare.tsx` : fallback de navigation `…/sessions` → `/group/[id]` (route sessions supprimée).

### Contenu
- **Header custom** : retour + nom du groupe + « {n} membres · J-XX » (`daysUntil`) + bouton options
  (admin → édition). `AppBackground` + `TopFade`.
- **Hero** (`Card hero`) : badge statut (coral « En cours »), compte à rebours **J-XX** + fin,
  **cagnotte** (`CountUp`, `usePot`), **progression du groupe cette semaine** (`ProgressBar`,
  done/target calculés client-side), pile d'avatars + bouton **Inviter** (admin).
- **Bascule Infos/Séances** : `SegmentedControl`.
- **Infos** :
  - **Règles** : `RulesRecap`.
  - **Membres** : `Card` + lignes (Avatar, nom/« Toi », badge Admin, `ProgressBar` hebdo, `done/target`
    en mint si objectif atteint).
  - **Classement de la semaine** : `rankedMemberStats` (rang, avatar, nom, séances faites ; 1er en coral).
  - **Blâmes** : chips (membre · compteur), état **« hot » (rouge)** si proche du seuil
    (`blame_threshold`). Section masquée si aucun blâme.
- **Séances** : feed `useGroupSessions` scindé **« À valider »** (statut `pending_vote`, badge compteur)
  / **« Récentes »** ; ligne = Avatar auteur + « Nom · Activité » + « durée · date » + `Badge` de statut.
- **Footer** sticky : `GradientButton` « Déclarer une séance » → `declare` (Étape 6).

## 3. Nouveaux helpers / composants (+ tests)
- **`lib/group-stats.ts`** (pur, testé) : `validatedThisWeek`, `memberStats`, `rankedMemberStats`,
  `groupWeeklyProgress` — progression/classement hebdo **calculés côté client** depuis
  `useGroupSessions` + `useGroupMembers` (pas de dépendance RLS). + `lib/__tests__/group-stats.test.ts`.
- **`components/ui/ProgressBar.tsx`** (piste + remplissage dégradé brand).
- **`features/groups/queries.ts`** : `usePot` (lecture `pots.total_amount`) + `useUnsettledBlames`
  (vue `v_member_unsettled_blames`) — **best-effort** : dégradent à `null`/`[]` si la RLS refuse la
  lecture directe (l'écran reste fonctionnel, cagnotte « — » / section blâmes masquée).
- `npx tsc --noEmit` ✅ · `jest` **129/129** ✅ (26 suites, +5).

## 4. Écarts / décisions signalés
1. **Cagnotte & blâmes en lecture directe** : `pots` et `v_member_unsettled_blames` ne passent pas par
   une RPC SECURITY DEFINER (contrairement à `get_group_dashboard`). Si leur RLS n'autorise pas la
   lecture par les membres, la cagnotte affiche « — » et les blâmes sont masqués. **À confirmer** :
   exposer ces données via RPC `get_group_dashboard` (ajouter `pot_total`) si besoin — non fait ici
   (pas d'invention backend ; reads best-effort).
2. **Votes** : le détail/vote d'une séance = **Étape 7** (écran inexistant). Les lignes de séances
   sont **non interactives** ici (badge de statut seulement) ; pas de bouton « Voter » câblé.
3. **Progression « validée »** : « fait » = séance **validée** (statut `validated`). Cohérent avec
   `v_member_weekly_status.validated_sessions` (non utilisée : calcul client-side préféré, zéro RLS).
4. **Activités** : `getActivityLabel(nom)` renvoie le nom (cf. Étape 4, stockage en noms libres).

## 5. Révision — collage maquette (2e passe)
1. **Bascule Infos/Séances** : remplacement du `SegmentedControl` par **`components/groups/GroupTabs.tsx`**
   calqué sur la maquette (libellés `display`, séparateur bas `line`, badge compteur sur « Séances »)
   avec **soulignement dégradé qui glisse** sous l'onglet actif (Reanimated, position + largeur mesurées
   par `onLayout`, reduced-motion respecté).
2. **Membres = classement fusionné** : section séparée **« Classement de la semaine » supprimée** (plus de
   numéro de rang). La ligne membre = Avatar + nom + couronne/badge Admin + **barre d'avancée sous le nom**
   (remplie = faits/objectif) + **total « X séance(s) »** (mint si objectif atteint). Blâmes (chips) conservés.
3. **Ordre de la vue Infos** : **Membres en haut**, puis **Blâmes**, puis **Règles tout en bas**.

`npx tsc --noEmit` ✅ · `jest` 129/129 ✅.

## Commit proposé
`feat(group): dashboard détail à la DA (hero cagnotte, Infos/Séances, classement, blâmes)`
