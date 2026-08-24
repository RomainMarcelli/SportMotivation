# Sport Motiv — Design System (DA)

DA sombre et chaude (« ember/brown »). Extrait des maquettes `maquette/V3/*.html`.
Source de vérité code : `constants/colors.ts`, `constants/fonts.ts`, `tailwind.config.js`.
**App dark-first** — pas de variante claire dans la DA.

## 1. Couleurs (tokens `:root`, identiques sur les 18 fichiers)

| Token | Valeur | Usage |
|------|--------|-------|
| `ink` | `#15100C` | fond d'écran |
| `ink-2` | `#1B140E` | tab bar / dégradés de pied |
| `surface` | `#231A12` | cartes, inputs, boutons icône |
| `surface-2` | `#2D2218` | surface surélevée / actif |
| `line` | `rgba(255,238,221,.08)` | bordure fine / séparateur |
| `line-2` | `rgba(255,238,221,.13)` | bordure marquée |
| `coral` | `#FF6A45` | accent principal |
| `coral-soft` | `rgba(255,106,69,.15)` | tint coral |
| `amber` | `#FFB23E` | accent 2 / argent / warning |
| `amber-soft` | `rgba(255,178,62,.15)` | tint amber |
| `mint` | `#5FE0A8` | succès / validé |
| `mint-soft` | `rgba(95,224,168,.14)` | tint mint |
| `red` | `#F2554A` | danger / refusé / suppression |
| `red-soft` | `rgba(242,85,74,.14)` | tint rouge |
| `cream` | `#FBEEDD` | texte principal |
| `cream-dim` | `#B7A18B` | texte secondaire |

**Texte/icône sur aplat coloré :** sur coral/gradient → `#23120A` (`on-coral`) · sur mint → `#0C2C20` (`on-mint`) · sur amber → `#3A2406` (`on-amber`) · sur avatar coloré → `#1A1006` (`on-avatar`).

### Dégradés
- **brand** (CTA, marques, jauges) : `linear-gradient(135deg, #FF6A45 0%, #FF8A3D 48%, #FFB23E 100%)`
- **green** (valider, cercle « fait ») : `135deg, #3FD39B → #5FE0A8`
- **amber** (déblocage cagnotte, montant héro) : `135deg, #FFC65C → #FF9A42`

### Palette avatars (par index, cyclique ; texte `on-avatar`)
`#FF6A45, #FFB23E, #5FE0A8, #FF8A6B, #E9C268`

## 2. Typographie

- **Display** = Bricolage Grotesque (titres, chiffres/stats, libellés de boutons, wordmark).
- **Body** = Plus Jakarta Sans (paragraphes, champs, labels, captions, chips, tabs).
- Gestion **par graisse** (familles dédiées, pas de `fontWeight`) — voir `constants/fonts.ts`.

Rôles canoniques :
| Rôle | px / poids / tracking | Famille |
|------|----------------------|---------|
| Gros montant fête | 53–62 / 800 / -.03em | display |
| Titre page / H1 | 22–27 / 800 / -.02em | display |
| Titre nav | 18 / 800 / -.02em | display |
| Stat / chiffre | 20–24 / 800 / -.02em | display |
| **Libellé bouton primaire** | 16 / 800 / -.01em | display |
| Section head | 16 / 700 | display |
| Nom carte / tab | 15 / 700–800 | display |
| Corps / input | 14 / 400–500 / lh 1.4–1.6 | body |
| Chip / segment / row label | 13 / 600 | body |
| `.flabel` (label form) | 12 / 700 / **.05em UPPERCASE** | body |
| Eyebrow / pill statut | 11 / 700 / **.13em UPPERCASE** | body |
| Tab label | 11 / 600 | body |

Classes Tailwind : `font-display`, `font-display-bold`, `font-display-semibold`, `font-body`, `font-body-medium`, `font-body-semibold`, `font-body-bold`, `font-body-extrabold`. Tracking : `tracking-tighter` (-.02), `tracking-tight` (-.01), `tracking-label` (.05), `tracking-eyebrow` (.13).

## 3. Rayons (`borderRadius`)

inputs **14** (`rounded-input`) · chips **13** (`rounded-chip`) · cartes **18** (`rounded-card`) · cartes héro / vote **22–26** (`rounded-hero` = 24) · sheets / écran **36** (`rounded-sheet`) · pills & avatars **plein** (`rounded-full`).

## 4. Ombres / glow

CTA principal : `shadowColor #FF8A3D`, offset y 14, radius ~20, opacity .5 (RN `elevation 8`). Les glows colorés = couleur d'accent, grand rayon, faible opacité. Anneau de sélection coral = bordure `rgba(255,106,69,.4)` (l'inset shadow CSS est approximé par une bordure en RN).

## 5. Espacement

Padding horizontal écran **18**. Gap listes **16**. Padding carte **14** (héro **18**). Chips `9×13`. Pills `5×10`. Inputs `13–15 × 14` (+44 à gauche si icône). Hauteur CTA **56** (58 sur declarer). Bas de page **96** quand tab bar présente. Steps utilisés : 6, 8, 10, 12, 14, 16, 18, 20, 22, 26.

## 6. Composants (réf. `components/ui/`)

- **ScreenContainer** — base de tous les écrans : `SafeAreaView` + `bg-ink` + padding horizontal 18 (`padded`, `edges` configurables).
- **TextField** — input DA : label uppercase optionnel, icône lucide à gauche, états focus (bordure `coral` + `surface-2`) / erreur (bordure `red` + message), œil afficher/masquer auto sur `secureTextEntry`. `forwardRef` + passthrough `onBlur` (compatible react-hook-form).
- **GradientButton** — CTA dégradé brand + **sheen** animé (Reanimated, `useReducedMotion`) + glow coral + icône lucide optionnelle. Hauteur 56, radius 18, texte `on-coral` display 16/800.
- **Button** — `primary` (délègue à GradientButton) · `secondary` (surface + `line-2`) · `ghost` (transparent, `cream-dim`) · `danger` (`red-soft` / texte `red`). API conservée (`variant`, `loading`, `disabled`, `children`).
- **Card** — `surface` + bordure `line`, `rounded-card`, padding 14. Variante `hero` : `rounded-hero`, bordure `line-2`, padding 18.
- **Avatar** — image (expo-image) ou initiales sur fond `avatarPalette[index]`. Tailles `sm` 30 / `md` 40 / `lg` 60.
- **Badge** — tag statut **non interactif**, variants `default` / `coral` / `amber` / `mint` / `red`, pill plein.
- **Chip** / **ChipGroup** — puce **sélectionnable** (toggle). Sélectionnée : `coral-soft` + texte coral + anneau coral.

Autres patterns à porter (non encore codés, voir maquettes) : tab bar sticky (Accueil/Profil), status bar, nav bar, inputs (`TextField` existant), segmented control, switches, progress bar/ring, podium, swipe-deck (voter), swipe-to-delete (notifications), capture photo.

## 7. Animations (Reanimated)

Easing maison : `cubic-bezier(.2,.7,.2,1)`. Overshoot fête : `(.2,.8,.2,1.2)`.
- **Entrée staggerée** : `FadeInDown`, ~16px, 600ms, délai par pas 60–80ms.
- **Sheen** CTA : balayage ~3.4s en boucle (implémenté dans GradientButton).
- **Count-up** : ease-out cubique, 1000–1400ms.
- **Ring** progress : stroke-dashoffset, 700ms, stagger par segment.
- **Confetti** (clôture) : 22 pièces `["#FF6A45","#FFB23E","#5FE0A8","#FBEEDD"]`.
- **Swipe voter** : rotation `dx/22`, seuil 120px, fly-out `±120%`.
- **Reduced motion** : tout gélé via `useReducedMotion()` / `AccessibilityInfo`.

## 8. Écrans (V3 → app)

onboarding · connexion (sign-in) · inscription (sign-up) · accueil (tabs/home) · profil (tabs) · parametres (settings) · creer-defi (group/create) · rejoindre (group/join) · groupe (group/[id]) · declarer (group/declare) · excuse · voter (group/vote) · cagnotte (group/pot) · invitations · cloture (group/close) · fin-defi (group/end) · notifications.
