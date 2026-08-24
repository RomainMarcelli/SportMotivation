# Étape 8 octies — Carrousel de défis, anneau segmenté, refonte des notifications

`npx tsc --noEmit` ✅ · `jest` **315/315** ✅ (41 suites, **+27 tests**). Aucun commit,
aucune commande git.

---

## ⚠️ SQL à exécuter

| Fichier | Rôle |
|---|---|
| [034_member_joined_notifications.sql](../../supabase/sql/034_member_joined_notifications.sql) | Notification « X a rejoint le groupe » à tous les membres |

Après 030 → 033.

---

## 1. 🎠 Plusieurs défis sur l'accueil

Nouveau [GroupCarousel.tsx](../../components/home/GroupCarousel.tsx) : les cartes de défi
défilent **horizontalement**, une par écran, avec aimantation (`snapToInterval`) — pas de
demi-carte qui dépasse. Sous le carrousel, des **points animés** (largeur + couleur) et le nom
du défi courant : « *Défi de l'été · 2/3* ».

Le carrousel ne change pas que la carte : **tout l'accueil suit** (bouton Déclarer, Ma semaine,
Dernières séances, Historique). À l'ouverture, on se place sur le défi **actif**, pas
forcément le premier de la liste.

> Détail assumé : seules les séances du défi **visible** sont chargées. Les cartes voisines
> montrent leur objectif avec une progression à zéro (`placeholderStats`) plutôt que d'afficher
> le chiffre du voisin. Elles se remplissent au swipe.

**Un seul défi → ni carrousel ni points**, la carte est rendue telle quelle.

## 2. 🎯 Anneau **segmenté** (comme la maquette)

L'anneau était une jauge continue. Il est maintenant **découpé en autant de parts que
l'objectif compte de séances** : 4 séances → 4 arcs séparés, chacun se remplissant d'un coup.
On lit sa semaine sans compter.

La géométrie vit dans [ring.ts](../../features/home/ring.ts), pure et testée (arcs SVG,
0° = midi, écart entre parts). Deux garde-fous que la maquette n'avait pas :

- **objectif à 0** → cercle nu, pas de division par zéro ;
- **objectif > 12** → plafonné, et l'écart entre parts se resserre automatiquement (12 parts ×
  20° d'écart auraient mangé 240° de l'anneau).

Chaque part validée apparaît **en cascade** (320 ms + 160 ms par part), comme le mockup.

## 3. ▶️ Les animations rejouent à chaque visite

> « si on switch de page l'animation doit réapparaître »

Les onglets restent **montés** : une animation câblée sur le montage ne se jouait donc qu'une
fois par session. Nouveau hook [useFocusReplay.ts](../../hooks/useFocusReplay.ts) : un compteur
qui s'incrémente à chaque arrivée sur l'écran, passé en `key` aux composants animés.

Et oui — appliqué **partout où il y a des chiffres**, comme tu le suggérais :

| Écran | Ce qui rejoue |
|---|---|
| Profil | les 4 cartes de stats |
| Accueil | l'anneau segmenté, la cagnotte, le compteur « jours prévus » |
| Accueil | les **barres d'historique**, qui poussent maintenant depuis le bas en cascade |

Tout respecte `prefers-reduced-motion` (valeur finale immédiate).

## 4. 🐛 Règles du défi : c'étaient celles du GROUPE, pas les tiennes

La pénalité est réglable **par membre** (`group_members.penalty_amount`, Phase 2.5), mais le
récapitulatif affichait `groups.penalty_amount` — le défaut du groupe. Si tu avais choisi 8 €,
tu voyais autre chose.

- **Pénalité** → la tienne (`me.penaltyAmount ?? group.penalty_amount`), formatée proprement
  (« 7,50 € » et non « 7.5 € »).
- **Objectif hebdo** → nouvelle ligne, il n'apparaissait **nulle part** dans les règles.
- **Activités** → la liste complète au lieu de « 4 activités ». Savoir que le sport qu'on
  pratique est accepté, c'est le but de cette ligne.

## 5. 🐛 « Mes groupes » du profil pas à jour après une adhésion

Chaque écran déclarait ses invalidations dans son coin, et le profil (ajouté récemment) avait
été oublié. Nouveau [cache.ts](../../features/groups/cache.ts) avec **une seule** fonction
`invalidateMembership()` utilisée par les 4 chemins (créer, rejoindre par code, accepter une
invitation, quitter). Le prochain écran qui lira ces données n'aura rien à câbler.

## 6. Tailles de police de l'accueil

Comparaison ligne à ligne avec la maquette — quatre écarts réels, corrigés :

| Élément | Avant | Maquette |
|---|---|---|
| Nom du défi | 21 px | **24 px** |
| Compte à rebours | 17 px cream | **20 px ambre** |
| « Objectif : 4 séances » | 13,5 px body | **16 px display** |
| Cagnotte | 22 px | **30 px** |

> **Réponse à ta question** : le reste était déjà conforme (salutation 23 px, titres de section
> 16 px, CTA 16 px). La maquette s'affiche dans un cadre de **384 px** ; sur iOS et Android
> l'app occupe exactement cette largeur, donc **le rendu sera identique**. Sur le web, si ta
> fenêtre est plus large que ~400 px, tout paraît petit parce que la mise en page s'étale —
> réduis la fenêtre à ~390 px pour comparer à la maquette.

## 7. 🔔 Notification quand quelqu'un rejoint

`notify_member_joined()`, symétrique de `notify_member_left` (SQL 033). Les **deux** chemins
d'entrée sont couverts : code d'invitation / QR (`join_group_by_code`) et invitation nominative
(`accept_invitation`, via un petit wrapper pour ne pas recopier une fonction qui a déjà évolué
plusieurs fois).

> « *Léa vient de rejoindre « Défi de l'été ». Vous êtes maintenant 5 membres.* »

## 8. 🎨 Page Notifications à la maquette

- **Entête maison** : retour, titre, et compteur « **3 non lues** » en corail (impossible avec
  le header natif) + bouton « tout effacer ».
- **Sections par jour** : *Aujourd'hui* / *Hier* / *Plus tôt*. Les sections vides sont omises.
- **Temps relatif** : « à l'instant », « il y a 30 min », « il y a 2 h », « hier », « dimanche »,
  « 12.06 » — la maquette n'affiche jamais d'heure absolue.
- **Boutons d'action inline** : « Voir l'invitation », « Répondre », « Voter » sur les
  notifications qui appellent une action.
- **Non lue** = bordure plus marquée + pastille corail en haut à droite (plus de fond teinté :
  sur une liste entière, il devenait criard).
- Entrée en cascade (`Reveal`), swipe pour supprimer conservé.
- Deux nouvelles icônes : `UserPlus` (arrivée) et `LogOut` (départ).

---

## Tests ajoutés (+27)

| Fichier | Couvre |
|---|---|
| [ring.test.ts](../../features/home/__tests__/ring.test.ts) | 0° en haut, chemin d'arc, grand arc > 180°, **une part par séance**, dépassement d'objectif, objectif 0 / négatif, plafond à 12 parts, écart resserré, objectif décimal |
| [format.test.ts](../../features/notifications/__tests__/format.test.ts) | `relativeTime` (instant / min / h / hier / jour / date / invalide), `groupByDay` (répartition, sections vides omises, date illisible rangée plutôt que perdue, ordre conservé), `unreadLabel` |
| home-stats | `placeholderStats` (objectif conservé, progression à zéro) |

> Un test a attrapé une **erreur de ma part** : j'avais écrit « 13:59 → à l'instant » alors que
> c'est exactement 1 minute. Le code était juste, le test faux — corrigé.

## Fichiers touchés

- **Accueil** : `app/(tabs)/index.tsx`, `components/home/{GroupCarousel,ChallengeHero,WeeklyHistory,WeekPlanner}.tsx`,
  `features/home/{ring,home-stats}.ts`
- **Animations** : `hooks/useFocusReplay.ts`, `app/(tabs)/profile.tsx`
- **Règles** : `features/groups/RulesRecap.tsx`, `app/group/[id]/index.tsx`
- **Cache** : `features/groups/cache.ts` + `{join,leave,mutations,invitations}.ts`
- **Notifications** : `app/notifications.tsx`, `features/notifications/format.ts`, `app/_layout.tsx`
- **SQL / types** : `supabase/sql/034_member_joined_notifications.sql`, `types/database.types.ts`

## Test rapide

1. Exécuter **034**, puis `npx expo start --web --clear` (fenêtre à ~390 px de large).
2. Avec **2 groupes** : swipe sur la carte d'accueil → les points suivent, et Ma semaine /
   Dernières séances / Historique **changent aussi**.
3. Objectif 4 séances, 2 validées → l'anneau doit montrer **4 parts, 2 remplies**.
4. Aller sur Profil, revenir, y retourner → les stats **se rejouent** à chaque fois.
5. Groupe → Infos → Règles : ta pénalité et ton objectif hebdo doivent correspondre à ce que
   tu as choisi.
6. Avec un 2ᵉ compte : rejoins un groupe → le 1er compte reçoit « **X vient de rejoindre** »,
   et le groupe apparaît **aussitôt** dans Profil → Mes groupes.

## Restant

- `app/settings.tsx` est le dernier écran pré-DA.
- Cagnotte et « versés en pénalités » afficheront **0** tant que l'**Étape 9** n'est pas faite.
- ⚠ Avant la prod : `DROP FUNCTION IF EXISTS public.dev_reset_excuse_joker(UUID);`
