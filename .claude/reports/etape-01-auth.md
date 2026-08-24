# Rapport — Étape 1 : Écrans Auth (onboarding, sign-in, sign-up)

Date : 2026-06-17 · Branche : `feature/refonte` · Statut : 🔄 Livré + correctifs onboarding, en attente de validation visuelle

## Périmètre
UI uniquement. Logique d'auth (`features/auth/*`, schemas, mutations, `google.ts`) **réutilisée
telle quelle**. Groupe `(setup)` **non touché**.

## Ce qui a été fait

### Composants réutilisables (nouveaux / restylés)
- [x] `components/ui/ScreenContainer.tsx` — **nouveau**. SafeArea + `bg-ink` + padding standard 18.
- [x] `components/ui/TextField.tsx` — **restylé DA** (était au style template clair). Label uppercase,
      icône lucide à gauche, états focus/erreur, œil afficher/masquer auto (`secureTextEntry`),
      `forwardRef` + passthrough `onBlur` (RHF). **API rétro-compatible** (utilisé dans 9 écrans).

### Écrans
- [x] `app/(auth)/onboarding.tsx` — réécrit : `ScrollView` horizontal `pagingEnabled` (pas de dépendance),
      3 slides (Bougez à plusieurs / Chaque séance compte / La récompense, ensemble), dots animés
      (Reanimated, interpolés sur le scroll), brand mark + « Passer » (caché au dernier slide → sign-up),
      CTA adaptatif « Suivant » → « C'est parti » (→ sign-up), lien bas « Se connecter » (→ sign-in).
- [x] `app/(auth)/sign-in.tsx` — restylé DA : badge logo dégradé, titre « Content de te revoir »,
      `TextField` e-mail (icône) + mot de passe (icône + œil), « Mot de passe oublié ? » (Alert « Bientôt »),
      `GradientButton` branché sur `useSignIn` (loading/erreurs), divider « ou » + `GoogleSignInButton`,
      lien bas « S'inscrire ». Entrées staggerées `FadeInDown` + `useReducedMotion`.
- [x] `app/(auth)/sign-up.tsx` — restylé DA : badge + titre « Crée ton compte », champs e-mail / mot de
      passe / confirmation (icônes + œil), `GradientButton` → `useSignUp`, Google, note CGU, lien bas
      « Se connecter ». Stagger + reduced-motion.
- [x] `app/(auth)/index.tsx` — spinner passé en `bg-ink` + `coral`. `_layout.tsx` inchangé (déjà OK).

### Tests
- [x] `components/ui/__tests__/TextField.test.tsx` — label/erreur, bascule œil, absence d'œil hors password.
- [x] `components/ui/__tests__/ScreenContainer.test.tsx` — rendu des enfants (via `SafeAreaProvider`).
- [x] `npx tsc --noEmit` ✅ · `jest` **87/87** ✅ (18 suites, +4 nouveaux tests).

## Décisions / écarts à valider
1. **sign-up = e-mail + mot de passe + confirmation** uniquement. La maquette `inscription` montre aussi
   photo / prénom / pseudo, mais ces champs relèvent du groupe `(setup)` (profil post-inscription) — non
   touché ici, et le `signUpSchema` existant ne les contient pas (consigne : ne pas toucher aux schemas).
   → Les champs profil seront faits à l'étape `(setup)`. OK ?
2. **`GoogleSignInButton` réutilisé tel quel** (variant `secondary` → rendu DA auto). Pas de bouton Google
   « crème » dédié comme sur la maquette, pour ne pas réécrire la logique Google. À affiner si besoin.
3. **Pas de prop `size` sur `Button`** (mentionnée dans le vocabulaire DA mais non implémentée en étape 0).
   Aucun écran auth n'en avait besoin (CTA = `GradientButton`). À ajouter si une étape suivante le requiert.
4. **« Mot de passe oublié ? »** = `Alert` « Bientôt » (pas d'écran de reset prévu à ce stade).

## Limites / non fait
- Pas de vérif visuelle device/simulateur (sheen, polices, dégradés à valider à l'œil).
- Illustrations onboarding = icônes lucide dans un cercle dégradé (pas les SVG des maquettes au pixel,
  conformément à la consigne).

## Correctifs onboarding (2e passe — alignement maquette + bug Android)

Source de vérité relue : `maquette/V3/sport-motiv-onboarding.html`.

### 1. CTA cassé sur Android (BLOQUANT) — corrigé **au niveau du `GradientButton`**
Cause racine : une `elevation` Android posée sur un conteneur à **fond transparent** dessine un
artefact sombre arrondi, et le **sheen**/`LinearGradient` n'était pas clippé → débordement.
Changements sur `components/ui/GradientButton.tsx` :
- Le Pressable extérieur porte désormais un **fond plein `coral`** + l'ombre (`shadow*` iOS /
  `elevation` Android), **sans** `overflow:hidden` (sinon l'ombre iOS serait coupée).
- Le dégradé **et** le sheen sont déplacés dans une **vue interne** `StyleSheet.absoluteFill` +
  `borderRadius:18` + `overflow:'hidden'` → tout est clippé proprement sur les deux OS.
- Nouveau prop optionnel `iconRight` (icône lucide dans une pastille sombre) pour la flèche → ;
  `icon` (gauche) inchangé.
- **Impact sign-in / sign-up : aucun changement d'API ni de rendu** — ils utilisent
  `<GradientButton>…</GradientButton>` (sans icône) et bénéficient du même fix de clipping.
  Vérifié : `tsc` + `jest` verts, rendu identique.
- Le CTA était déjà un footer hors-ScrollView ; il est désormais regroupé avec les dots dans un
  bloc `.controls` fixe, identique sur les 3 slides, label adaptatif « Suivant » → « C'est parti » + flèche.

### 2. Fond chaud + 2 halos — ajoutés
`OnboardingBackground` (react-native-svg) : fond `ink` + 2 `RadialGradient` (coral haut-gauche ~.20,
amber bas-droite ~.17 → transparent). Pas de blur natif RN → le radial approxime le halo flou.

### 3. Stage — recréé
Carte 252 px, `rounded-hero`, `bg-surface` + bordure `line-2`, `overflow:'hidden'`, halo radial
interne (`StageGlow`). L'illustration vit **dedans** (plus de badge flottant).

### 4. Vraies illustrations — portées vers react-native-svg
`components/auth/OnboardingIllustrations.tsx` : les 3 SVG de la maquette traduits 1:1 (viewBox 280×210,
paths repris tels quels, primitives `Svg/Defs/LinearGradient/RadialGradient/ClipPath/Rect/Circle/Ellipse/Path/G/Text`).
- Slide 1 : flamme + 3 avatars · Slide 2 : bocal cagnotte + pièces (clip) + pièce qui tombe ·
  Slide 3 : 2 coupes qui trinquent + confettis. Corrige la slide 2 (était une flamme).

Dots : largeur + couleur animées sur la position de scroll (`interpolate` + `interpolateColor`,
`surface-2` → `coral`). `prefers-reduced-motion` respecté (entrées topbar/footer gated).

> Aucune dépendance ajoutée (`react-native-svg` déjà présent). Reste à valider **visuellement sur
> device iOS + Android** (sheen, halos, illustrations).

## Correctifs onboarding (3e passe) — CTA invisible + halos bandés

### Bug 1 — CTA invisible sur Android : confirmé, c'était bien le `entering`
(a) **Oui** : la cause était le footer (et le topbar) enveloppés dans une **layout-animation
`entering={FadeInDown}`**. Sur Android, ces layout-animations Reanimated cassent le rendu des
`expo-linear-gradient` imbriqués (couches dégradé non peintes) → le `GradientButton` disparaissait
alors que les enfants non-dégradé (dots, lien) restaient visibles. Le `GradientButton` lui-même
était sain (inutile de le restructurer — option 4 non nécessaire).

Correctif **propre et réutilisable** : nouveau composant `components/ui/Reveal.tsx` qui fait
l'entrée (fade + translateY) via `useSharedValue` + `withTiming` dans un `useEffect`, appliqué par
`useAnimatedStyle` — **pas** une layout-animation, donc pas le bug de snapshot. On peut y envelopper
un dégradé sans risque. Respecte `prefers-reduced-motion` (état final immédiat).
- `onboarding.tsx` : topbar (contient la marque dégradée) + footer (contient le CTA) passent de
  `Animated.View entering={…}` à `<Reveal>`.

### (b) Impact sign-in / sign-up
Mêmes blocs `FadeInDown` staggerés enveloppaient le `GradientButton` → **même bug latent**. Remplacé
toutes les `Animated.View entering={enter(n)}` par `<Reveal delay={n}>` (mêmes délais 0/80/140/200,
+260 sur sign-up). Plus aucun `expo-linear-gradient` sous une layout-animation. CTA « Se connecter »
/ « Créer mon compte » s'affichent désormais sur Android. Aucune autre logique modifiée.

### Bug 2 — Halos « bandés » : falloff multi-stops
`OnboardingBackground` + `StageGlow` : les `RadialGradient` passent de 2 stops à un **falloff
multi-stops** (7 stops coral/amber, 6 pour le stage) avec **rayon élargi** (r 100–105 %, stage 90 %)
et halos plus subtils → transition étalée, plus de banding. Sans dépendance. Si le banding persiste
sur **device réel**, fallback prévu = 2 PNG de glow flou en `<Image>` (non nécessaire a priori).

> `tsc` ✅ · `jest` 87/87 ✅. Reste : validation visuelle device iOS + Android.

## Correctifs & polish (5e passe)

### 1. CTA invisible sur l'onboarding seulement → c'était `iconRight`
La seule différence d'usage avec sign-in (où le CTA s'affiche) était `iconRight={ArrowRight}`, qui
rendait la flèche dans une **pastille** (`View` 25×25, `borderRadius:999`, fond `rgba(0,0,0,.16)`)
imbriquée dans la rangée de contenu, par-dessus le dégradé clippé → sur Android ce nœud cassait la
peinture du bouton. **Cause = le rendu de la pastille `iconRight`**, pas le footer ni `Reveal`.
Correctif : suppression de la pastille, la flèche est rendue **directement** (`<IconRight size={18} />`)
à droite du libellé. Plus simple, plus de nœud par-dessus le dégradé. `icon` (gauche) inchangé.

### 2. Fond chaud partagé → `components/ui/AppBackground.tsx`
Le fond `ink` + 2 halos multi-stops (le rendu lissé de l'onboarding) est extrait en composant
réutilisable et branché dans **`app/(auth)/_layout.tsx`** (rendu une fois derrière un `Stack` à
`contentStyle.backgroundColor:'transparent'`). Les écrans d'auth passent leur conteneur en
**transparent** pour le laisser voir : `ScreenContainer` gagne un prop `transparent`, onboarding
n'a plus son propre fond. Résultat : sign-in, sign-up **et** onboarding ont le même fond chaud
(et tout futur écran d'auth aussi).

### 3. Marque unique → `components/ui/BrandMark.tsx`
Badge dégradé `brand` + icône **Flame**, taille paramétrable + glow. Remplace l'haltère (Dumbbell)
de sign-in/sign-up et l'inline de l'onboarding. Utilisé partout : topbar onboarding (`size 30`),
hero sign-in / sign-up (`size 74`, = maquette).

### 4. Alignement sign-in / sign-up sur les maquettes
Relu `connexion.html` + `inscription.html`. Ajusté : padding horizontal **24**, logo **74** (r 22),
titre 27, sous-titre **13.5** (copys maquette : « Reprends le défi avec tes potes. » / « Rejoins tes
amis et lance ton premier défi. »), gap **18** entre blocs, libellés `flabel` (déjà via TextField),
divider « ou » sur trait `--line`, lien bas 13px. CTA = `GradientButton` (dégradé + glow + sheen).
Bouton Google = `GoogleSignInButton` partagé (style outlined surface = maquette connexion) — conservé
tel quel pour ne pas dupliquer la logique Google.

> Aucune dépendance ajoutée. `tsc` ✅ · `jest` 87/87 ✅. `Reveal` conservé (aucun `expo-linear-gradient`
> sous une layout-animation `entering`). Reste : validation visuelle device iOS + Android.

## Correctifs onboarding (6e passe) — revue WEB (react-native-web, viewport mobile ~390 px)

1. **Topbar mal placé sur web** — la rangée ne faisait pas toute la largeur → `justify-between`
   ne s'étalait pas (« Passer » repassait sous le logo). Ajout de `w-full` sur la rangée topbar
   (et le footer). Logo haut-gauche / « Passer » haut-droite sur une ligne.
2. **Contenu non centré verticalement sur web** — les pages d'un ScrollView horizontal ne prennent
   pas la hauteur du conteneur sur web. La zone carrousel est désormais **mesurée** (`onLayout` →
   `{width,height}`) et chaque slide reçoit cette `width`/`height` fixe → `justify-center` centre
   bien (web + mobile). La largeur de page mesurée pilote aussi le paging et les dots.
3. **« Suivant » ne marchait qu'une fois sur web** — `onMomentumScrollEnd` ne se déclenche pas sur
   web, donc `index` restait à 0. L'index est maintenant dérivé de `onScroll` (compatible web) :
   le handler animé met à jour `scrollX` ET, via `runOnJS(setIndex)` quand la page arrondie change,
   l'index React. « Suivant » avance sur tous les slides puis devient « C'est parti » au dernier.
4. **Animation slide 2 « Chaque séance compte »** — `CagnotteAnimation` (overlay RN, le plus fiable
   cross-platform) : une pièce `€` **tombe dans le bocal** en boucle douce (translateY + fondu à
   l'entrée, pause entre deux), et un **total cagnotte qui s'incrémente** (`+5 €` par pièce, pastille
   amber). La pièce statique du SVG est masquée (`hideTopCoin`) pour éviter le doublon. Déclenchée
   quand le slide est actif (`active = i === index`). `prefers-reduced-motion` → pièce figée + total
   statique.
5. **Bouton invisible Android** — déjà corrigé en 5e passe (suppression de la pastille `iconRight`,
   flèche rendue directement). Inchangé.

Règle plateformes mise à jour dans `PROJECT.md` (iOS + Android + **Web**, viewport mobile, ombres via
`glow()`, SafeArea insets=0 sur web, `onScroll` vs `onMomentumScrollEnd`, hauteur des slides mesurée,
tactile vs hover, gardes SSR).

> `tsc` ✅ · `jest` 87/87 ✅. À valider visuellement : web (viewport mobile) + Android + iOS.

## Finitions onboarding (7e passe) — revue web (DevTools device mode)

1. **Bande transparente en haut** — `AppBackground` rendu **full-bleed** au niveau racine de
   `app/(auth)/_layout.tsx` : conteneur racine en `style={{flex:1, backgroundColor: ink}}` (filet de
   sécurité) + `AppBackground` en `absoluteFill` **derrière** le `Stack`, **jamais** borné par une
   SafeAreaView → le fond passe sous la status bar / notch (plus aucune zone transparente). Le
   contenu (topbar) garde son padding SafeArea.
2. **Carrousel non navigable à la souris (web)** — remplacé le `ScrollView` horizontal par un **track
   `Animated.View` + `Gesture.Pan`** (react-native-gesture-handler, qui marche **souris web ET
   tactile natif**) : drag → translateX clampé, snap par page au relâché (seuil 18 % ou vélocité),
   `runOnJS(setIndex)`. `GestureHandlerRootView` ajouté à la racine (`app/_layout.tsx`). **Dots
   cliquables** (clic = `goTo`). L'index et les dots restent dérivés de la position (`tx`).
3. **Footer aéré** — padding bas explicite (`pb-6`, indépendant de la SafeArea = 0 sur web) + plus
   d'espace dots→CTA (`mb-5`) et **CTA→lien** (`pt-5`).
4. **« Passer » redessiné** — petite **pastille** `surface-2` + bordure `line`, coins ronds, texte
   `cream-dim` ; bien calée en **haut à droite** (topbar `w-full`), masquée au dernier slide.

> `tsc` ✅ · `jest` 87/87 ✅. À valider visuellement : web (device mode) + Android + iOS.

## Correctifs onboarding (8e passe) — regroupés (revue web device mode)

1. **Bande transparente status bar** — fond `ink` posé au **vrai root** : `app/_layout.tsx` ajoute un
   `View` `absoluteFill` ink **hors** de toute SafeAreaView, derrière le `Stack` (+ root
   `GestureHandlerRootView` déjà ink). Filet web : `global.css` met `html,body,#root` en `#15100c` et
   `app.json` `expo.backgroundColor: "#15100C"`. Plus aucune zone transparente (haut/bas).
2. **« Passer » en pleine largeur / 2 lignes** — cause racine : NativeWind n'interop pas de façon
   fiable le `className` d'un `Animated.View` (Reanimated) **sur web** → la rangée tombait en colonne.
   Corrigé **dans `Reveal`** : le `className` (layout) est désormais porté par une `View` interne
   classique ; l'`Animated.View` ne fait que l'entrée. La topbar redevient une seule rangée
   `flex-row justify-between` (logo gauche / pastille « Passer » droite). Bénéficie à tous les écrans.
3. **Drag souris figé après la 1re slide** — le `Gesture.Pan` était recréé à chaque rendu (ré-attache
   + base figée). Mémoïsé (`useMemo`, deps = shared values stables), `start = tx.value` posé sur
   `onBegin`, snap par page + `runOnJS(setIndex)` au relâché. Le drag marche sur toutes les slides,
   les deux sens ; dots cliquables + « Suivant » OK.
4. **Footer trop bas** — padding bas augmenté (`pb-8`) en plus de la SafeArea bottom (home indicator),
   espace dots→CTA (`mb-5`) et CTA→lien (`pt-5`) conservés.
5. **Glow dur sous le CTA (web)** — `glow()` gagne un paramètre `spread` ; le CTA passe à
   `offsetY 16 / radius 32 / spread -16 / opacity .5` → ombre diffuse et contenue comme la maquette
   (`0 16px 32px -16px`), plus de bande dure. Natif : `shadow*` adouci (radius 32). 

> `tsc` ✅ · `jest` 87/87 ✅. Relancer web avec cache vidé (`-c`) après ces changements de config.

## Sign-up (9e passe) — force du mot de passe + champs non-copiables

**Périmètre : sign-up uniquement. Sign-in inchangé.**

### 1. Indicateur de sécurité
- `lib/password.ts` → `getPasswordChecks(pwd)` : un booléen par critère (8 caractères, majuscule,
  chiffre, spécial) + `satisfied` (0–4) + `level` + `label` (Faible/Moyen/Bon/Fort). **Source unique**
  réutilisée par l'UI ET le schéma.
- `components/auth/PasswordStrength.tsx` : barre 4 segments (`rounded-full`, 5px), couleur progressive
  1=`red`, 2-3=`amber`, 4=`mint` + label coloré ; checklist 2 colonnes, chaque ligne = pastille
  (cercle vide `cream-dim` → `Check` lucide sur `mint`) + texte (`cream-dim`→`cream`), **transition
  douce** (Reanimated `interpolateColor`, gated reduced-motion). Visible dès focus ou contenu.
- `signUpSchema` : le mot de passe doit désormais passer `isPasswordStrong` (mêmes règles). La mutation
  n'est pas cassée, juste plus exigeante. Tests `schemas.test.ts` mis à jour (mot de passe fort + cas
  faible rejeté).
- **CTA désactivé tant que le formulaire n'est pas valide** (`useForm({ mode: "onChange" })` +
  `disabled={!isValid}`) — j'ai choisi cette option (plus claire que l'erreur au submit) ; la checklist
  montre précisément ce qui manque, donc l'erreur Zod du champ mot de passe n'est pas affichée en
  doublon (PasswordStrength fait le feedback). Erreurs e-mail/confirmation toujours affichées.

### 2. Champs non-copiables (ressaisie forcée)
- `TextField` gagne `noCopy` / `noPaste` (rétro-compatibles) : `contextMenuHidden` en natif + handlers
  DOM `onCopy`/`onCut` (noCopy) / `onPaste` (noPaste) `preventDefault` sur web (transmis par
  react-native-web). N'impacte pas l'autofill (les gestionnaires écrivent la valeur sans event paste).
- Mot de passe → `noCopy` ; Confirmation → `noPaste`. Sign-in non touché.

### Tests
- `lib/__tests__/password.test.ts` : chaque critère + chaque niveau (0→4) + `isPasswordStrong`.
- `tsc` ✅ · `jest` 93/93 ✅ (19 suites).

> Note web : si une version de react-native-web ne transmettait pas `onCopy/onPaste`, le
> `contextMenuHidden` couvre le natif et le blocage clavier reste à vérifier sur device. À confirmer
> visuellement.

## Sign-in (10e passe) — feedback erreur de connexion + animation

Avant : un échec `useSignIn` ne déclenchait qu'une `Alert` (peu visible). UI uniquement, logique
d'erreur réutilisée (`signIn.isError` / `signIn.reset`).
1. **Message DA** : à `signIn.isError`, une rangée `bg-red-soft` + bordure `red/30` + `AlertCircle`
   (`red`) + texte `red` « E-mail ou mot de passe incorrect. » apparaît au-dessus du CTA. Message
   **générique** (ne dit pas quel champ). Apparition douce via `Reveal`. **Disparaît dès qu'un champ
   est re-modifié** (`onChangeText` → `signIn.reset()`).
2. **Shake du CTA** : à chaque échec, translateX amorti (`withSequence` -8→8→-6→6→0, ~250 ms) sur un
   `Animated.View` enveloppant le `GradientButton` (style animé, pas une layout-animation → gradient
   OK). `prefers-reduced-motion` → pas de shake (message seul). Haptique `notificationAsync(Error)` en
   natif (expo-haptics déjà présent), ignorée sur web.
   Le flash de bordure du champ (optionnel) n'a pas été ajouté (message + shake suffisent).
- L'`Alert` n'est plus utilisée que pour « Mot de passe oublié ». `tsc` ✅ · `jest` 93/93 ✅.

## Inscription en UN écran (11e passe) — fusion sign-up + profil, suppression de `(setup)`

Objectif : une seule page d'inscription (photo, prénom, pseudo, e-mail, mot de passe, confirmation),
plus d'étape `(setup)`. UI + schéma/flow, logique Supabase réutilisée.

### Schéma (`features/auth/schemas.ts`)
`signUpSchema` fusionné : **prénom** (1–50, trim), **pseudo** (3–30, regex `a-zA-Z0-9_.-`), e-mail,
mot de passe (`isPasswordStrong`), confirmation. **Pas de champ `nom`** (absent de la maquette).

### Choix `lastName` → **optionnel, conservé**
`last_name` est utilisé ailleurs (initiales avatar `(tabs)/index` & `profile`, noms membres/séances,
`group/*`, requêtes `sessions/queries`). Donc **non retiré** : il n'est juste pas collecté à
l'inscription. Il reste dans `completeProfileSchema` (édition du profil dans l'onglet Profil) et
`useUpdateProfile.lastName` est devenu **optionnel** (écrit seulement si fourni). `isProfileComplete`
laissé tel quel mais **n'est plus utilisé pour le routage**.

### Flow (un seul submit)
1. `useSignUp` enrichi : `signUp(email, password, { options: { data: { first_name, username } } })`
   → métadonnées capturées indépendamment de la session (**compatible confirmation ON** plus tard).
2. Session active (confirmation OFF aujourd'hui) → `useUpdateProfile` écrit prénom/pseudo + **upload
   photo** (logique d'upload existante réutilisée).
3. Redirection : **aucune navigation manuelle** — le root layout bascule sur `(tabs)` dès que la
   session est active. (Confirmation ON → pas de session → `router.replace("/sign-in")`.)
- **Photo** : `pickImage` (expo-image-picker) repris de l'ex-`(setup)` ; aperçu rond `Avatar` 88px +
  badge coral.
- **Erreurs inline DA** (plus d'`Alert`) : bannière `bg-red-soft` + `AlertCircle` ; **e-mail déjà
  utilisé** → erreur sur le champ e-mail ; **pseudo déjà pris** (code `23505` / message trigger
  « Database error saving new user ») → erreur sur le champ pseudo. Échec partiel (compte créé mais
  profil/photo KO) : l'utilisateur est connecté → routé vers l'accueil (non bloqué), pseudo/nom
  réglables ensuite dans Profil.
- Conserve `PasswordStrength`, `noCopy` (mdp) / `noPaste` (confirmation), CTA désactivé tant
  qu'invalide, DA (`AppBackground`, `BrandMark`, `ScreenContainer`, `Reveal`, `Avatar`), `ScrollView`
  + clavier sur les 3 plateformes.

### Suppression `(setup)`
- Dossier `app/(setup)/` **supprimé** (le profil se fait à l'inscription ; le `nom` et la photo
  restent éditables dans l'onglet Profil → pas de route morte). Gating racine simplifié :
  `app/_layout.tsx` → `(auth)` si non connecté, sinon `(tabs)` (plus de branche `(setup)` ni de
  `isProfileComplete`).
- Choix : **supprimé plutôt que dormant** — la confirmation ON est déjà couverte par les métadonnées
  signUp (le trigger crée le profil), donc `(setup)` n'a plus d'utilité.

### Tests
`schemas.test.ts` mis à jour (prénom requis, pseudo invalide, mot de passe fort, 72 car., mismatch).
`tsc` ✅ · `jest` 95/95 ✅.

## Questions
1. Fusion inscription (un écran) + suppression `(setup)` : OK ?
2. `lastName` optionnel/conservé (réglé dans Profil) : OK ?
3. Commit : je te laisse faire. Message proposé :
   `feat(auth): inscription en un écran (profil + photo) + suppression de (setup)`
