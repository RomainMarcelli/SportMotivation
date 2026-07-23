# Étape 8 sexies — Corrections avatars : inscription, cohérence des couleurs, anneau, animations

`npx tsc --noEmit` ✅ · `jest` **259/259** ✅ (37 suites, **+4 tests de non-régression**).
Aucun commit, aucune commande git.

---

## ⚠️ Un SQL de plus

| Fichier | Rôle |
|---|---|
| [032_avatars_bucket.sql](../../supabase/sql/032_avatars_bucket.sql) | Crée le bucket `avatars` **et ses policies** (idempotent) |

Toujours après 030 et 031.

---

## 1. 🐛 La cause commune : l'écran d'inscription était **tué en pleine écriture**

C'est le même bug qui produisait tes symptômes **n°1** (couleur + icône perdues) et
**n°4** (photo perdue) — et il explique aussi pourquoi « Modifier le profil » semblait, lui,
avoir la bonne information.

### Ce qui se passait

```
signUp()  →  Supabase crée le compte
          →  onAuthStateChange  →  isAuthenticated = true
          →  <Stack.Protected guard={!isAuthenticated}>  DÉMONTE (auth)
          →  ⛔ l'écran d'inscription meurt ICI
          →  ... pendant que updateProfile() écrivait encore l'avatar
```

Deux conséquences :

- l'écriture partait **dans le vide** si quoi que ce soit échouait (bucket absent, RPC
  manquante, réseau) ;
- et surtout, le `catch` posait le message d'erreur sur un **composant déjà démonté** → tu
  n'as jamais rien vu. Exactement le même angle mort qu'aux deux itérations précédentes,
  mais un cran plus haut : cette fois c'était le **routage** qui masquait l'erreur.

### Le correctif

Nouveau drapeau `finishingSignUp` dans [auth-store.ts](../../lib/auth-store.ts). La racine ne
quitte `(auth)` que lorsque le profil est **écrit**, plus dès que la session existe :

```ts
const isAuthenticated = hasSession && !finishingSignUp;
```

Et si l'écriture échoue quand même, **on ne t'envoie plus dans l'app avec un profil vide** :
le bouton devient « **Réessayer d'enregistrer mon profil** », avec l'erreur réelle affichée
et une sortie de secours « Continuer sans avatar ».

### Pourquoi « Modifier le profil » paraissait correct
Il ne l'était pas. Les deux écrans lisent la même ligne — mais quand `avatar_color` est
`NULL`, chacun calculait une **couleur de repli différente**. D'où l'impression que l'un
« savait » et pas l'autre. C'est le point 3 ci-dessous.

## 2. 🐛 Photo d'inscription : le bucket n'existait peut-être pas

`docs/guides/STORAGE_POLICIES.md` demandait de créer le bucket `avatars` **à la main** dans le
Dashboard. S'il manquait, l'upload échouait — et l'erreur partait avec l'écran démonté (point 1).

[032](../../supabase/sql/032_avatars_bucket.sql) le crée avec ses 4 policies, comme on l'avait
déjà fait pour `excuse-justifications`. Il ajoute au passage la policy **UPDATE** qui manquait :
le client uploade avec `upsert: true`, donc **remplacer** sa photo faisait un UPDATE — la
première photo passait, les suivantes non.

## 3. 🐛 « Jaune dans le profil, vert dans le groupe »

Quand le joueur n'avait pas choisi de couleur, chaque écran semait le repli à sa façon :
le profil avec le **nom**, les listes avec la **position dans la liste** (`index={i}`), d'où une
couleur différente à chaque endroit — et qui changeait en plus quand la liste était triée.

Le prop `index` a été **supprimé** et remplacé par `seed`, qui reçoit partout **l'id de
l'utilisateur** :

```tsx
<Avatar uri={…} color={…} icon={…} seed={m.user.id} />
```

> Un test de non-régression vérifie explicitement qu'un même id donne la même couleur qu'on
> l'observe depuis le profil, le groupe ou l'écran de vote.

**Bonus** : à l'inscription, la couleur de départ est maintenant **tirée au sort une fois**
dans la palette (et enregistrée). Sans ça, tous les comptes créés sans ouvrir le sélecteur
auraient été corail.

## 4. 🐛 L'anneau qui jure

L'entête du profil cerclait la bulle du dégradé de marque (corail→ambre) : joli sur une photo,
laid autour d'un aplat rouge. L'anneau reprend désormais **la couleur de l'avatar**
(`avatarRingColor`) — cadre discret sur une photo, invisible sur un aplat.

## 5. Ordre des onglets du sélecteur

**Photo · Couleur · Icône · Fun** — la photo d'abord, c'est ce que la plupart des gens
cherchent en ouvrant « mon avatar ». À la réouverture, le sélecteur se place sur l'onglet
correspondant à l'avatar courant.

## 6. Compteurs animés

Les 4 stats du profil s'incrémentent de 0 à leur valeur, comme dans la maquette, via le
composant `CountUp` existant (ease-out cubic, décalage de 90 ms entre les cartes, et valeur
immédiate si `prefers-reduced-motion` est actif). Les pénalités sont arrondies à l'euro : un
compteur animé sur des centimes est illisible.

---

## 💡 Suggestions (non faites, à valider)

1. **Anneau « série en cours »** — cercler l'avatar du profil d'une jauge ambre quand la série
   dépasse N semaines. Ça donne un sens à l'anneau plutôt qu'une simple décoration.
2. **Avatar dans la tuile de groupe** — les cartes de « Mes groupes » affichent une lettre ;
   une pile de 3 avatars de membres serait plus vivante et cohérente avec l'écran Groupes.
3. **Recadrage de la photo** — `allowsEditing` donne un carré basique. `expo-image-manipulator`
   permettrait de compresser côté client (les photos de téléphone font 3-5 Mo).
4. **Initiales sur 1 lettre pour les pseudos** — « ROMZ » → « RO » aujourd'hui ; un « R » seul
   serait plus lisible en 30 px.
5. **`settings.tsx`** reste le dernier écran pré-DA (fond blanc), sa maquette existe.

---

## Tests ajoutés (+4)

| Test | Verrouille |
|---|---|
| « donne la MÊME couleur quel que soit l'écran » | la régression jaune/vert |
| « la couleur choisie prime toujours sur le repli » | le choix du joueur ne peut pas être écrasé |
| `avatarRingColor` reprend la couleur de la bulle | l'anneau qui jure |
| `avatarRingColor` suit le repli | cohérence quand rien n'est choisi |

## Fichiers touchés

- **Inscription** : `lib/auth-store.ts`, `app/_layout.tsx`, `app/(auth)/sign-up.tsx`
- **Avatar** : `components/ui/Avatar.tsx` (`index` → `seed`), `features/auth/avatar.ts`
  (`avatarRingColor`), `components/profile/AvatarPicker.tsx` (ordre des onglets)
- **Profil** : `app/(tabs)/profile.tsx` (anneau + `CountUp`), `app/profile-edit.tsx`
- **Propagation `seed`** : `app/group/[id]/{index,vote,excuse,members,invitations,invite}.tsx`,
  `components/groups/AdminTransferSheet.tsx`, `components/home/AppHeader.tsx`
- **SQL** : `supabase/sql/032_avatars_bucket.sql`

## Test rapide

1. Exécuter **032** (après 030 et 031), puis `npx expo start --web --clear`.
2. **Créer un compte** avec une couleur + une icône → l'app ne doit basculer sur l'accueil
   **qu'une fois le profil écrit**, et le Profil doit montrer exactement ce que tu as choisi.
3. Recommencer avec une **photo** → elle doit apparaître dans le Profil ET dans l'entête d'accueil.
4. Rejoindre un groupe : **la couleur de ta bulle doit être identique** dans le profil, la pile
   de membres, le classement et l'écran de vote.
5. Ouvrir le Profil → les 4 nombres doivent **s'incrémenter**.
6. Pour tester le chemin d'erreur : renomme temporairement le bucket `avatars` dans Supabase,
   crée un compte avec photo → tu dois rester sur l'inscription avec un vrai message et un
   bouton **Réessayer**.
