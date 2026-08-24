# Rapport — Étape 6 : Déclarer une séance (restyle DA)

Date : 2026-06-19 · Branche : `feature/refonte` · Statut : ✅
Source : `maquette/V3/sport-motiv-declarer.html`. UI uniquement, **logique/mutations réutilisées**.

## 1. Reconnaissance (existant)
- Écran `app/group/[id]/declare.tsx` (style template) : RHF + `buildDeclareSessionSchema`
  (`features/sessions/schemas.ts`), mutation `useDeclareSession`, upload preuve (`expo-image-picker`
  + géoloc `expo-location`), preuve **photo / Strava / lien externe**, picker Strava
  (`components/sessions/StravaProofPicker.tsx`), helpers Strava (`features/sessions/strava.ts`).
- Activités lues depuis `group.accepted_activities` (noms libres, cf. Étape 4).

## 2. Restyle = maquette (logique inchangée)
- **Header** : header de stack DA (« Déclarer une séance ») + ligne contexte « ● {nom du groupe} ».
- **Activité** : chips `acceptedActivities` (icône `getSportIcon`) + hint « Activités autorisées par le
  groupe ». (logique de sélection inchangée)
- **Durée** : `Stepper` DA (min = `min_duration_min`, pas 5, unité « minutes ») + **presets**
  15/30/45/60 (filtrés ≥ minimum) + hint « Minimum X min pour ce groupe ».
- **Date** : `DateField` DA (picker dark, `maximumDate` = aujourd'hui).
- **Preuve** : `SegmentedControl` (icônes Photo/Strava/Lien) + panneau :
  - **Photo** : grand bouton capture pointillé DA (cercle caméra dégradé) ; après capture →
    **aperçu DA** (image + badge position + barre « Position enregistrée / Reprendre »). Logique
    `capturePhoto` + géoloc **inchangée**.
  - **Strava** : `StravaProofPicker` **restylé DA** (badge « Strava connecté », lignes sélectionnables
    avec pastille check). Logique connect/fetch inchangée.
  - **Lien** : champ URL + capture d'écran (mini) + description + hint obligatoire.
- **Commentaire** : `TextField` multiline.
- **Footer** sticky : `GradientButton` « Valider la séance » (**désactivé tant qu'invalide** :
  `mode:"onChange"` + `isValid`), note « Soumise au vote du groupe ». Erreur mutation en **bandeau
  rouge inline** (`mapSessionError`).

## 3. Cross-platform
- `capturePhoto` : natif → caméra (+ géoloc best-effort) ; **web** → sélection de fichier
  (`launchImageLibraryAsync`), pas de caméra/géoloc, **try/catch** (toast si échec, pas de crash).
  Libellés adaptés (« Ajouter une photo » / « Depuis tes fichiers » sur web). Strava/lien marchent partout.

## 4. Vérif
- Pas de nouveau helper pur (logique réutilisée) → suite inchangée.
- `npx tsc --noEmit` ✅ · `jest` 129/129 ✅ (26 suites).

## Décisions / notes
1. **CTA désactivé tant qu'invalide** : ajout de `mode:"onChange"` + `isValid` (le schéma exige déjà
   photo pour preuve photo, etc.). Comportement de soumission **inchangé** sinon.
2. Aperçu photo « réel » (vs SVG factice de la maquette) ; badge position seulement si géoloc dispo.
3. Strava pré-remplit l'activité via id→nom (`getActivityLabel`, best-effort, cf. Étape 4).

## Commit proposé
`feat(session): déclarer une séance à la DA (activité, durée+presets, preuve photo/strava/lien)`

---

# Révision — corrections + features (2026-06-19)

## 0. Footer (tab bar) persistant sur les écrans poussés
- Nouveau composant [BottomNav.tsx](../../components/ui/BottomNav.tsx) (calqué sur la tab bar `(tabs)` :
  Accueil/Groupes/Profil, couleurs `ink2`/`line`, safe-area + web).
- Monté **une seule fois** dans [app/group/_layout.tsx](../../app/group/_layout.tsx) sous la pile :
  `<View flex-1><Stack/></View><BottomNav active="groups"/>`. → tab bar visible sur **tous** les écrans
  groupe (créer, rejoindre, scanner, confirmer, invitation, dashboard, **déclarer**, éditer…), web + natif.
  Les footers sticky des écrans (`bottom:0`) se posent juste au-dessus.
- **Différé** : `notifications`/`settings` sont encore en template clair (Étapes 11/13) ; y coller une barre
  sombre jurerait. Footer ajouté lors de leur restyle. Les onglets eux-mêmes gardent la tab bar native.

## 1. Bas de l'écran (CTA qui chevauchait)
CTA « Valider » en **footer sticky** (fond `ink` + bordure haute), `paddingBottom` du scroll = 116 → plus
de chevauchement avec la zone photo ni la barre système (la safe-area basse est portée par la `BottomNav`).

## 2. Activité « Autre » + avertissement
- Chip **« Autre »** (icône `Plus`) → champ texte libre, icône auto via `getSportIcon`.
- L'activité hors liste n'est **plus bloquée** par le schéma (`buildDeclareSessionSchema` : refine retiré).
  À la validation, si l'activité ∉ `accepted_activities` → **modale d'avertissement** (`ActivityWarningModal`,
  bottom-sheet DA) : **Continuer quand même** (publie) · **Changer d'activité** (ferme) · **Prévenir l'admin**
  (toast placeholder, `// TODO Étape 11 (notifications)`).
- **Backend** : la RPC `declare_session` levait `ACTIVITY_NOT_ALLOWED`. Migration
  [017_declare_session_custom_activity.sql](../../supabase/sql/017_declare_session_custom_activity.sql) :
  verrou retiré (le **vote du groupe** reste le filtre), garde-fou `ACTIVITY_REQUIRED` ajouté. **À exécuter.**

## 3. Durée — minimum du groupe
Hint sous la durée : « Minimum X min pour ce groupe », ou **« Aucun minimum »** si `min_duration_min === 0`.
Stepper borné à `min` (presets filtrés ≥ min).

## 4. Date — réparée + restreinte à la semaine en cours
- **Bug web réparé** : `@react-native-community/datetimepicker` ne rend rien sur web → [DateField.tsx](../../components/ui/DateField.tsx)
  superpose un `<input type="date">` transparent sur web (natif inchangé). Variante **`card`** façon maquette
  (icône + libellé relatif « Aujourd'hui »/« Hier »/jour). **Corrige aussi `create.tsx`** (même picker).
- **Restriction** : `minimumDate` = lundi de la semaine, `maximumDate` = aujourd'hui (`declarableDateRange`).
  Schéma : `isDeclarableDate` (lundi→dimanche, jamais le futur). Se recalcule au changement de semaine.

## 5. Preuve — méthodes + anti-fraude dates
- **Photo (caméra)** : `launchCameraAsync` → capture live attachée directement, géoloc best-effort. Pas de
  contrôle de date (preuve « live »). Web → dégrade en sélecteur de fichier.
- **Galerie** : `launchImageLibraryAsync({ exif: true })` → date EXIF (`parseExifDate`) comparée au jour
  déclaré (`checkProofDate`). **Refus** si jour différent (photo d'il y a 1 mois) ; **web/EXIF absent** → toast
  clair, photo acceptée (date non vérifiable). Re-vérifié au submit via `photoTakenAt` (schéma).
- **Strava** : `stravaActivityDate` comparée au jour déclaré à la sélection **et** au submit
  (`stravaActivityDate` dans le schéma) → impossible de rattacher une activité d'un autre jour.
- **Lien** : URL inchangée.

## 6. Animations d'entrée
`Reveal` (fade + translateY staggeré, reduced-motion respecté) sur chaque bloc (activité 40ms → commentaire
300ms).

## Helpers & tests
- [features/sessions/dates.ts](../../features/sessions/dates.ts) : `declarableDateRange`, `isDeclarableDate`,
  `isSameLocalDay`, `checkProofDate`, `parseExifDate`, `endOfDay` (purs). + `stravaActivityDate` dans `strava.ts`.
- Tests : `__tests__/dates.test.ts` (semaine lundi→aujourd'hui, EXIF, comparaison), `strava.test.ts` (+date),
  `schemas.test.ts` (activité libre, date hors semaine, dates photo/Strava). `tsc` ✅ · **jest 152/152** ✅.

## ⚠️ À exécuter par Romain
- SQL : [017_declare_session_custom_activity.sql](../../supabase/sql/017_declare_session_custom_activity.sql).
- (Rappel Étape 5/6) `015_weekly_plans_unique.sql`, `016_groups_min_duration_zero.sql` si pas déjà fait.
- `npx expo start -c` (cache) pour `+html.tsx` et le nouveau `DateField` web.

## Décisions signalées
1. **Caméra via `launchCameraAsync`** (ouvre la caméra native, photo attachée) plutôt qu'une surface
   `expo-camera` custom : même résultat, EXIF dispo, bien plus léger. Dis-moi si tu veux une vraie `CameraView`
   plein écran intégrée.
2. **Activité hors liste acceptée côté serveur** (migration 017) : nécessaire pour « Continuer quand même ».
   Le contrôle métier devient le **vote du groupe**.
3. **Footer** : approche « barre custom montée dans le layout » (vs restructurer tout le routing dans `(tabs)`)
   — non-invasif, web+natif identiques. `notifications`/`settings` différés (encore en template).

---

# Corrections #2 (2026-06-20) — footer global + fixes web

## 1. UN SEUL footer global, navigation qui marche partout
- La `BottomNav` n'est plus montée par écran : elle est **globale**, montée **une seule fois** dans
  [app/_layout.tsx](../../app/_layout.tsx) sous toute la pile (`<View flex-1><Stack/></View><BottomNav/>`),
  affichée dès que l'utilisateur est connecté. Même design partout (onglets ET écrans poussés).
- **Tab bar native masquée** ([app/(tabs)/_layout.tsx](../../app/(tabs)/_layout.tsx) : `tabBarStyle:{display:"none"}`)
  → plus de double barre. Le navigateur `Tabs` ne sert plus qu'aux routes.
- `app/group/_layout.tsx` : `BottomNav` retirée (redondante avec la globale).
- **Navigation corrigée** ([BottomNav.tsx](../../components/ui/BottomNav.tsx)) : `go()` fait
  `router.dismissAll()` (si une pile est ouverte) **puis** `router.navigate(href)` → Accueil / Groupes /
  Profil ramènent à leur onglet **depuis n'importe où** (dashboard, déclarer…). Onglet actif déduit du
  `usePathname` (groupe → Groupes, réglages → Profil).

## 2. Date sur web — réparée pour de vrai
[DateField.tsx](../../components/ui/DateField.tsx) : au clic sur la carte (web), on appelle
`inputRef.showPicker()` sur un `<input type="date">` caché (repli `focus()/click()`). Le calendrier du
navigateur s'ouvre. Bornes `min`/`max` (lundi → aujourd'hui) conservées, natif inchangé.

## 3. Activité « Autre » — validation réparée
La saisie custom pilote directement la valeur du formulaire (`value`/`onChange` du `Controller`, plus
d'état `customActivity` dupliqué qui désynchronisait) → `activity_type` = texte saisi, schéma Zod valide,
**bouton « Valider » actif** + warning hors-liste au submit.

## 4. Onglet Photo — caméra + bouton fichier
- Grande zone (icône caméra) = **prendre une photo en direct** ; sous-texte trompeur « Depuis tes
  fichiers » retiré → « Appuie pour ouvrir l'appareil photo ».
- « Choisir un fichier / la galerie » = désormais un **bouton DA** (bordure `line-2`, fond `surface`),
  ouvre fichiers/galerie avec la vérif de date EXIF déjà en place. Les deux coexistent.

## 5. Ménage
Texte d'erreur redondant « Choisis une activité » supprimé sous le titre ACTIVITÉ.

## Vérif
`npx tsc --noEmit` ✅ · `jest` **152/152** ✅. À tester sur **web** : footer + 3 onglets depuis partout,
date qui s'ouvre, « Autre » qui valide, photo caméra + bouton fichier.
