# Étape 15 — Navigation, vote, Strava, invitations et pénalités

`npx tsc --noEmit` ✅ · `jest` **389/389** ✅ (48 suites, **+5 tests**). Aucun commit,
aucune commande git.

---

## ⚠️ SQL à exécuter

| Fichier | Rôle |
|---|---|
| [037_group_fixes.sql](../../supabase/sql/037_group_fixes.sql) | Effectif des défis, suppression annoncée, pénalité de l'admin, publication sélective |

Après 036.

---

## Les trois bugs

### 1. 🐛 « Accueil » renvoyait sur les Groupes — c'était ma faute

La redirection « un seul défi → ouvre-le » que j'avais posée dans l'onglet Groupes se
déclenchait aussi quand **« Accueil » dépilait la navigation** : l'onglet reprenait le focus une
fraction de seconde, rouvrait le défi, et l'accueil devenait inatteignable.

La décision est remontée dans la **barre du bas** : quand il n'y a qu'un défi, le bouton
« Groupes » pointe directement dessus. Plus aucune redirection dans l'écran, donc plus rien qui
se déclenche à contretemps.

### 2. 🐛 La séance votée restait à l'écran

Le vote partait depuis le **rappel de fin d'animation** (`withTiming(..., callback)`). Quand ce
rappel n'arrive pas — c'est le cas sur le web si l'onglet perd le focus ou qu'un re-rendu tombe
pendant les 220 ms — le vote était déjà envoyé mais la carte restait : d'où le second clic.

Le vote part maintenant **immédiatement**, au clic comme au relâchement du glissement.
L'animation n'est plus qu'un décor. La correction vaut aussi pour le refus.

### 3. 🐛 Strava : authentification interminable sur le web

Deux causes, toutes deux propres au web :

- l'app utilisait `/oauth/mobile/authorize`, **réservé aux applications natives** : ouvert dans
  un onglet, il tente de rebondir vers l'app Strava installée et reste sur une page blanche →
  point d'entrée classique sur le web ;
- l'URI de retour valait `sportmotiv://strava`, un schéma **qu'un navigateur ne sait pas
  ouvrir** : la fenêtre ne revenait jamais → URL du site sur le web.

Ajouté aussi : un **délai maximum de 15 s** sur l'appel à l'Edge Function (non déployée ou
secrets manquants = attente infinie sans un mot), et un message explicite si la fenêtre est
fermée ou bloquée par le navigateur.

> Deux choses à vérifier de ton côté : dans les réglages de ton application Strava, le
> **« Authorization Callback Domain »** doit contenir `localhost` (dev web) et ton domaine ; et
> l'Edge Function `strava-token` doit être déployée avec `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET`.

## Défis et membres

- **Effectif sur les cartes** : elles affichaient « max 12 », la capacité — pas qui est dedans.
  `get_my_groups` renvoie maintenant `member_count` (une jointure, plutôt qu'une requête par
  carte). Affiché « 4 membres · max 12 ».
- **Suppression d'un défi** : les membres n'étaient prévenus de rien. `delete_group` écrit
  maintenant les notifications **avant** le `DELETE` — après, on ne saurait plus qui prévenir.
- **Logo « Rejoins un défi »** : le badge était un carré corail posé en `absolute` **par-dessus**
  l'icône ; sur le web elle disparaissait derrière. On réutilise la marque de l'app, avec
  l'icône « rejoindre » — `BrandMark` accepte désormais une icône.

## 💶 Pénalités des membres

Refonte complète à la DA ([MemberPenaltyList.tsx](../../components/groups/MemberPenaltyList.tsx)) :
avatar, rôle, montant actuel en clair, et le sélecteur qui n'apparaît que si on touche à quelque
chose.

Surtout, le **nœud du problème** : l'admin s'auto-proposait un changement — notification à
lui-même, et attente d'un accord qu'il n'avait qu'à se donner. Deux régimes désormais :

| | Action |
|---|---|
| **Ma propre ligne** (admin) | « Fixer à 8 € » — appliqué directement (`set_my_penalty`) |
| **Les autres** | « Proposer 8 € à Léa » → notification, elle accepte ou refuse |

Et une proposition en attente affiche « **8 € proposé · en attente de sa réponse** » au lieu de
laisser reproposer indéfiniment.

## 📨 Inviter au groupe, allégé

Le QR code + le code + le lien occupaient tout le bas de la page. Ils passent derrière un bouton
« Code, QR code et lien », et la **recherche par pseudo** prend la première place — c'est le
geste courant entre gens qui ont déjà l'app.

Nouveau [InviteByHandle.tsx](../../components/groups/InviteByHandle.tsx) : champ `@`, résultats
avec avatar, bouton « Inviter » qui devient « **Invité** » — y compris au rechargement, puisqu'on
lit les invitations déjà en attente.

Côté destinataire, la notification d'invitation affiche « **Tu as rejoint le défi** » (ou
« Invitation refusée ») une fois traitée, au lieu d'un bouton qui ouvrirait un écran vide.

## ✅ « Où compte cette séance »

Le bloc devient un vrai sélecteur ([SessionScopePicker.tsx](../../components/sessions/SessionScopePicker.tsx)) :
entête teintée avec le compteur « 2 / 3 », **cases à cocher** (tout coché par défaut), objectif
hebdo de chaque défi, et le rappel que chaque défi vote de son côté.

Le défi d'où l'on déclare est **verrouillé** (pastille « ce défi ») : c'est là que la séance est
créée avant d'être recopiée. `publish_session_to_my_groups` accepte maintenant une liste de
défis, `NULL` valant toujours « tous ».

## 🔔 Notifications depuis le profil

Cloche dans l'entête du profil, avec la **pastille du nombre de non-lues** — elles n'étaient
joignables que depuis l'accueil.

---

## Tests ajoutés (+5)

| Fichier | Couvre |
|---|---|
| [invitation.test.ts](../../features/notifications/__tests__/invitation.test.ts) | invitation acceptée / refusée / en attente, statuts absents, mauvais type de notification, payload incomplet |

## Fichiers touchés

- **SQL / types** : `supabase/sql/037_group_fixes.sql`, `types/database.types.ts`
- **Navigation** : `components/ui/BottomNav.tsx`, `app/(tabs)/groups.tsx`
- **Vote** : `app/group/[id]/vote.tsx`
- **Strava** : `lib/strava.ts`
- **Groupes** : `components/home/GroupCard.tsx`, `components/groups/{MemberPenaltyList,InviteByHandle}.tsx`,
  `app/group/[id]/{index,edit}.tsx`, `features/groups/{queries,penalty-mutations,invitations,cache}.ts`
- **Séances** : `components/sessions/SessionScopePicker.tsx`, `app/group/[id]/declare.tsx`,
  `features/sessions/mutations.ts`
- **Divers** : `components/ui/BrandMark.tsx`, `app/group/join.tsx`, `app/(tabs)/profile.tsx`,
  `app/notifications.tsx`, `features/notifications/format.ts`

## Test rapide

1. Exécuter **037**, puis `npx expo start --web --clear`.
2. Avec **un seul défi** : « Groupes » ouvre le défi, et « Accueil » ramène bien à l'accueil.
3. Voter une séance : la carte disparaît **au premier clic**.
4. Modifier le groupe → Pénalités : ta ligne dit « Fixer à X € », celle des autres « Proposer ».
5. Groupe → Infos → Inviter : chercher un pseudo, inviter, le bouton passe à « Invité ».
6. Déclarer une séance avec 2 défis : décocher l'un des deux, vérifier qu'elle n'y apparaît pas.

## Restant

- **Système d'amis** (ajouter quelqu'un en ami) — demandé, à planifier.
- **Thème clair** : palette à valider.
- Cagnotte, Fin de défi, Clôture : **Étape 9**.
- Notifications de résultat de séance (`session_validated` / `session_rejected`) : avec l'Étape 9.
- ⚠ Avant la prod : `DROP FUNCTION IF EXISTS public.dev_reset_excuse_joker(UUID);` et textes légaux.
