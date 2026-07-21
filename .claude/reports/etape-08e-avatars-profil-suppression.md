# Étape 8 quinquies — Avatars personnalisables, refonte du Profil, suppression réelle du compte

`npx tsc --noEmit` ✅ · `jest` **255/255** ✅ (37 suites, **+52 tests**). Aucun commit, aucune
commande git.

---

## ⚠️ SQL à exécuter — dans cet ordre

| Fichier | Rôle |
|---|---|
| [030_avatar_customization.sql](../../supabase/sql/030_avatar_customization.sql) | Colonnes `avatar_color` / `avatar_icon`, `upsert_my_profile` **v2**, RPC de lecture enrichies, stats du profil |
| [031_delete_account.sql](../../supabase/sql/031_delete_account.sql) | Suppression **réelle** du compte + recalcul des scrutins |

> **030 remplace la signature de `upsert_my_profile`** (4 → 8 paramètres) : tant qu'il n'est pas
> passé, l'app affiche désormais un message explicite au lieu d'échouer en silence.
> **031 modifie aussi `leave_group`** (il re-résout les votes) — c'est voulu, il inclut la
> version 026 complète, notification d'admin comprise.

---

## 1. 🐛 Inscription : pourquoi ça ne marchait *toujours* pas

Le correctif précédent (028) était bon **mais l'erreur restait invisible**. Trois couches :

1. `useUpdateProfile` appelait `upsert_my_profile`. Si la RPC n'existait pas (SQL 028 non exécuté),
   PostgREST renvoyait `PGRST202`.
2. `sign-up.tsx` attrapait l'exception et affichait… **« Une erreur est survenue. Réessaie. »**
3. Pendant ce temps le compte était bien créé et la racine basculait sur l'accueil → l'utilisateur
   ne voyait jamais le message, et arrivait sur un profil vide.

**Corrigé** :
- `isMissingFunction()` détecte `PGRST202` / `42883` et lève un message qui **nomme le fichier SQL**
  à exécuter ;
- `sign-up.tsx` **affiche le vrai message** au lieu du texte générique (le fallback « une erreur
  est survenue » ne sert plus que si le message est vide).

> Si le pseudo et la photo ne s'affichent toujours pas après avoir passé 028 + 030, l'écran
> d'inscription te dira maintenant **exactement** pourquoi.

## 2. 🎨 Avatar : couleur, icône, avatar rigolo ou photo

Un profil peut porter trois choses, résolues dans cet ordre :

```
avatar_url   →  photo perso OU avatar généré     (image)
avatar_icon  →  icône lucide sur avatar_color    (bulle)
(rien)       →  initiales sur avatar_color       (bulle)
```

### Le sélecteur — [AvatarPicker.tsx](../../components/profile/AvatarPicker.tsx)
Bottom-sheet DA avec aperçu en direct et **4 onglets** :

| Onglet | Contenu |
|---|---|
| **Couleur** | 10 teintes de la DA (corail, rose, menthe, ambre, violet, ciel…) |
| **Icône** | 13 icônes lucide sport (haltère, vélo, flamme, éclair, trophée…) + « Aa » pour revenir aux initiales |
| **Fun** | 6 styles **DiceBear** (robots, smileys, aventuriers, pouces, formes, pixel) × 12 propositions |
| **Photo** | **Appareil photo** ou **Mes photos**, + « Retirer l'image » |

Tout est un **brouillon** : essayer une couleur alors qu'on a une photo n'efface rien tant qu'on
n'a pas validé. Choisir une couleur ou une icône retire l'image (sinon la couleur serait invisible),
mais **l'icône reste mémorisée** : retirer sa photo plus tard la fait réapparaître.

### Une seule bulle pour toute l'app — [Avatar.tsx](../../components/ui/Avatar.tsx)
Le composant est devenu la **source unique de vérité**. Il est branché partout :
accueil, groupe (pile de membres, classement, séances), vote, excuse, transfert d'admin,
liste des membres, invitations, recherche d'utilisateurs.

> **Les « ronds de couleur » bleus ont disparu.** Trois écrans dessinaient encore leur propre
> pastille `bg-primary-500` (membres, invitations, inviter) — ils utilisent maintenant `<Avatar>`.

Sans couleur choisie, `fallbackColor()` en calcule une **déterministe** à partir de l'id : le même
joueur garde toujours la même teinte, sur tous les appareils (un `Math.random()` aurait fait
clignoter les listes à chaque rendu).

### DiceBear
API gratuite, sans clé : `https://api.dicebear.com/9.x/<style>/png?seed=<pseudo>`. On demande du
**PNG** et pas du SVG (`expo-image` ne rend pas le SVG distant pareil sur les 3 plateformes), et on
stocke simplement l'URL — rien n'est ré-hébergé.

## 3. Écran Profil — refait à la maquette

[sport-motiv-profil.html](../../maquette/V3/sport-motiv-profil.html) était la **seule maquette
jamais implémentée** : c'est de là que venait le bleu `#3b82f6` sur fond blanc.

[app/(tabs)/profile.tsx](../../app/(tabs)/profile.tsx) est désormais **en lecture** :
avatar cerclé du dégradé de marque, nom, `@pseudo`, « Membre depuis mars 2026 », bouton
**Modifier le profil**, puis **Mes stats** (4 cartes), **Mes groupes** (objectif / pénalité /
cagnotte, tuile + badge de rôle, tap → le groupe), **Préférences** (thème fonctionnel,
notifications marquées « Bientôt »), **Compte**.

L'édition vit dans [app/profile-edit.tsx](../../app/profile-edit.tsx) — écran séparé, entête
maison, prénom / nom / pseudo / e-mail (lecture seule) + le sélecteur d'avatar.

> Route `/profile-edit` et **pas** `/profile/edit` : `app/profile/…` serait entré en collision
> avec l'onglet `(tabs)/profile`. Le footer reste sur l'onglet Profil (`activeFromPath`).

**Stats** (RPC `get_my_profile_stats`) : séances validées, série de semaines consécutives, taux
d'objectifs atteints, euros versés en pénalités. La semaine en cours est exclue du taux (elle n'est
pas finie) et tolérée dans la série.

## 4. Suppression de compte — on supprime *vraiment*

### La règle
> « On supprime tout, sauf s'il a mis de l'argent dans la cagnotte. »

`delete_account_internal` regarde s'il existe **une transaction de cagnotte ou une pénalité** au nom
du joueur :

| Cas | Ce qui se passe |
|---|---|
| **Aucun argent engagé** (comptes de test) | `DELETE` sur **toutes** ses lignes + `DELETE FROM auth.users` → **plus rien**, ni dans `public.users`, ni dans Authentication. L'e-mail est libéré. |
| **Argent versé ou dû** | Anonymisation (« Compte supprimé ») + bannissement. Effacer ses transactions fausserait la cagnotte et les comptes des autres. |

L'effacement est **explicite, table par table** (votes → blâmes → séances → excuses → jokers →
plans → notifications → invitations → adhésions → utilisateur → compte auth) plutôt que de parier
sur les `ON DELETE` du schéma. Le tout dans **une transaction** : si la suppression du compte auth
est refusée, rien n'est supprimé — jamais de demi-suppression.

### Le groupe est remis d'aplomb
C'est le point que tu as soulevé, et il valait pour **« Quitter le groupe » aussi** :

- **Passation d'admin** au membre actif le plus ancien (+ notification), et `groups.created_by`
  réassigné (la colonne est `NOT NULL`).
- **Groupe vidé de tout membre → supprimé** (cascade).
- 🔴 **Re-résolution des scrutins** — nouvelle fonction `resolve_group_pending_votes()`. Le seuil
  de majorité est `(votants / 2) + 1` : quand l'effectif baisse, un vote bloqué doit pouvoir se
  conclure **immédiatement**. Sans ça il restait « en attente » pour toujours.
  → Elle est **aussi appelée par `leave_group`**, qui avait le même trou.

### Plus besoin de déployer l'Edge Function
L'app appelle maintenant la RPC `delete_my_account()` **en direct**. L'Edge Function ne sert plus
que de **filet** : si ce projet Supabase interdit au rôle `postgres` d'écrire dans le schéma `auth`
(erreur `42501`), on bascule automatiquement dessus. Elle a été réécrite pour appeler le même cœur
(`delete_account_internal(uid, false)`) et ne gérer que le compte auth.

### Popup de confirmation
`useFeedback()` gagne un `alert()` (popup à un seul bouton) et un ton `success`. Après suppression :
« **Compte supprimé** — Ton compte et toutes tes données ont été supprimés. À bientôt ! ».
La popup vit dans le `FeedbackProvider`, monté **au-dessus** de la pile : elle reste visible pendant
que la racine bascule vers l'écran de connexion.

### 🧹 Purger tes anciens « Compte supprimé »
Un bloc `DO $$ … $$` **commenté** en fin de [031](../../supabase/sql/031_delete_account.sql) purge
d'un coup tous les comptes déjà anonymisés par l'ancienne version (il saute ceux qui ont de l'argent
engagé). Décommente-le et exécute-le une fois.

---

## Tests unitaires (+52)

| Fichier | Couvre |
|---|---|
| [avatar.test.ts](../../features/auth/__tests__/avatar.test.ts) | `resolveAvatar` (priorité image > icône > initiales, URL/icône vides traitées comme absentes, profil `null`), `initialsFrom*`, `fallbackColor` (déterminisme, appartenance à la palette), `displayName` |
| [avatars-catalog.test.ts](../../features/auth/__tests__/avatars-catalog.test.ts) | palette sans doublon et hexa valide, **cohérence `AVATAR_ICON_KEYS` ↔ `AVATAR_ICONS`**, `dicebearUrl` (encodage, graine de repli, tous les styles), `isDicebearUrl`, `dicebearSeeds` (unicité, stabilité) |
| [format.test.ts](../../features/profile/__tests__/format.test.ts) | `memberSince` (mois FR, décembre, date invalide), `handle` (jamais un `@` orphelin), `euros`, pluriel de `challengeCount`, `groupTile` |

## Fichiers touchés

- **Avatar** : `constants/avatars.ts`, `features/auth/avatar.ts`, `components/ui/Avatar.tsx`,
  `components/profile/AvatarPicker.tsx`
- **Profil** : `app/(tabs)/profile.tsx`, `app/profile-edit.tsx`, `features/profile/queries.ts`,
  `features/profile/format.ts`, `app/_layout.tsx`
- **Inscription** : `app/(auth)/sign-up.tsx`, `features/auth/profile-mutations.ts`
- **Suppression** : `features/auth/account.ts`, `app/settings.tsx`,
  `supabase/functions/delete-account/index.ts`
- **Propagation** : `features/groups/queries.ts`, `features/groups/invitations.ts`,
  `features/sessions/queries.ts`, `features/votes/queries.ts`, `features/excuses/queries.ts`,
  `app/group/[id]/{index,vote,excuse,members,invitations,invite}.tsx`,
  `components/groups/AdminTransferSheet.tsx`, `components/home/AppHeader.tsx`
- **Feedback** : `components/feedback/FeedbackProvider.tsx` (`alert()`, tons)
- **SQL / types** : `supabase/sql/030_*.sql`, `supabase/sql/031_*.sql`, `types/database.types.ts`

## Test rapide

1. Exécuter **030** puis **031**, puis `npx expo start --web --clear`.
2. **Créer un compte neuf** : tape « Personnaliser mon avatar » → une couleur, une icône, un avatar
   « Fun ». Créer → **le Profil doit afficher pseudo + avatar**.
3. Profil → **Modifier le profil** → changer d'avatar → vérifier qu'il change **aussi** dans
   l'entête d'accueil et dans la liste des membres du groupe.
4. Sur mobile : onglet **Photo** → « Appareil photo » (absent sur le web, c'est normal).
5. **Supprimer un compte de test** (sans cagnotte) → popup « Compte supprimé » → vérifier dans
   Supabase : **plus aucune ligne** dans `public.users` ni dans Authentication.
6. Groupe à 3 avec un vote en attente → un membre quitte → le vote doit **se conclure tout seul**
   si la nouvelle majorité est atteinte.

## Restant

- `app/settings.tsx` est encore pré-DA (fond blanc) alors que
  [sport-motiv-parametres.html](../../maquette/V3/sport-motiv-parametres.html) existe — hors périmètre ici.
- Les stats et la cagnotte affichées resteront à **0** tant que l'**Étape 9** (conséquences :
  crédit de cagnotte, pénalités) n'est pas faite.
- ⚠ Toujours à faire avant la prod : `DROP FUNCTION IF EXISTS public.dev_reset_excuse_joker(UUID);`
