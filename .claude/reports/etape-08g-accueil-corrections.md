# Étape 8 septies — Accueil à la maquette + 8 corrections

`npx tsc --noEmit` ✅ · `jest` **288/288** ✅ (39 suites, **+29 tests**). Aucun commit,
aucune commande git.

---

## ⚠️ SQL à exécuter

| Fichier | Rôle |
|---|---|
| [033_member_left_notifications.sql](../../supabase/sql/033_member_left_notifications.sql) | Notif « X a quitté / a supprimé son compte » + `is_username_available()` |

Après 030, 031 et 032. Il **remplace** `leave_group` et `delete_account_internal` (versions
enrichies), donc il doit passer **après** 031.

> ⚠ Si Supabase refuse le script avec « *unsafe use of new value of enum type* », exécute
> d'abord SEULE la ligne `ALTER TYPE … ADD VALUE … 'member_left';` puis relance le reste.

---

## 1. 🐛 Pseudo déjà pris : un vrai message, et **avant** la création

Avant : on créait le compte, le trigger explosait sur la contrainte unique, et on essayait de
deviner la cause depuis un « Database error saving new user ».

Maintenant, deux filets :
- **Vérification live** (`is_username_available`, SQL 033) dès 3 caractères → « Ce pseudo est
  déjà pris. » sous le champ, bouton désactivé. Rien n'est créé pour rien.
- **Mapping d'erreur robuste** ([username.ts](../../features/auth/username.ts)) qui lit le code
  `23505`, le message **et** le champ `details`, et qui distingue une collision de **pseudo**
  d'une collision d'**e-mail** — la version précédente accusait le pseudo dans les deux cas.

La vérif est volontairement **optimiste** : si la RPC n'existe pas encore, elle renvoie « je ne
sais pas » plutôt que de bloquer le formulaire. La contrainte en base reste le garde-fou.

## 2. 🐛 « Retirer la photo » renvoyait sur l'onglet Couleur

`removeImage()` faisait un `setTab("color")`. Supprimé — on reste où on est.

## 3. 🐛 Aucune confirmation après la suppression du compte

Même famille de bug que l'inscription : `useDeleteAccount` appelait `signOut()` **à la fin de la
mutation**, ce qui démontait l'écran… et les callbacks `mutate(_, { onSuccess })` sont
**abandonnés au démontage**. La popup n'avait aucune chance de s'afficher.

La déconnexion est sortie de la mutation :

```
mutateAsync()  →  alert("Compte supprimé")  →  finishAccountDeletion()
```

Le message est aussi plus clair et distingue les deux cas réels (effacement total vs
anonymisation pour cause d'argent engagé) — cf. `deletionMessage()`.

## 4. 🐛 Le fond coloré se voyait derrière la photo

Deux endroits cerclaient la bulle d'un anneau de couleur, y compris quand il y avait une photo :
l'aperçu du sélecteur et l'entête du profil. **L'anneau ne s'affiche plus dès qu'il y a une
image** (et l'avatar prend la place libérée : 86 px au lieu de 80).

## 5. Choisir une couleur n'efface plus la photo

> « quand j'ai choisi une photo et que je change de couleur ça m'enlève la photo, est-ce que
> c'est normal ? »

Non. C'était un choix de ma part, et c'était le mauvais : perdre sa photo en tapant une pastille
est une mauvaise surprise. Désormais **la photo est conservée**, la couleur/icône sont
simplement mémorisées pour le jour où on la retirera. Un bandeau ambre l'explique dans les
onglets Couleur et Icône, avec un raccourci **« Retirer l'image »**.

## 6. Bouton « J'ai un code » + centrage

- L'icône `Sparkles` (qui faisait « emoji décoratif ») devient **`KeyRound`** : une clé dit ce
  que fait le bouton — entrer un code d'accès.
- Un `pb-12` traînait sur l'état vide de l'onglet **Groupes** : il remontait tout le bloc. Retiré,
  le centrage est désormais **identique à l'accueil**.

## 7. 🔔 Notifications de départ

Nouveau type `member_left` + helper `notify_member_left()`. Tous les membres actifs restants
reçoivent une notification :

| Cas | Message |
|---|---|
| Quitte le groupe | « *Léa a quitté « Défi de l'été ». Vous êtes maintenant 4 membres. La majorité requise pour les votes est mise à jour.* » |
| Supprime son compte | « *Léa a supprimé son compte : elle ne fait plus partie de « Défi de l'été ». Ses séances ont été retirées du groupe. Vous êtes maintenant 4 membres…* » |

Le rappel de l'effectif est volontaire : c'est **ce qui impacte concrètement** les autres
(la majorité de vote change).

## 8. Le compte supprimé apparaissait encore dans le groupe

Le SQL 031 supprime bien la ligne `group_members`. Deux causes possibles à ce que tu as vu :

1. **La suppression a échoué** sans que tu le saches — c'est le point 3, maintenant corrigé :
   tu verras la confirmation, ou l'erreur.
2. **Cache** : l'autre compte affichait une liste de membres chargée avant la suppression.
   Ajouté `refetchOnMount: "always"` sur `useGroupMembers` → rentrer dans le groupe recharge.

> ⚠ Honnêteté : sur **deux appareils différents**, l'autre écran ne se mettra à jour qu'au
> prochain chargement. Du temps réel (Supabase Realtime) serait nécessaire pour faire mieux —
> à décider plus tard.

## 9. 🏠 Accueil refait à la maquette

[sport-motiv-accueil.html](../../maquette/V3/sport-motiv-accueil.html) était implémenté à ~20 %
(uniquement « Ma semaine »). L'accueil avec groupe contient maintenant, dans l'ordre :

| Bloc | Contenu |
|---|---|
| **Salutation** | « Salut Romain » + phrase **calculée** (« Plus qu'une séance… », « Objectif atteint ») |
| **Hero défi** | pastille « EN COURS », compte à rebours **J-47 / Dernier jour / Terminé**, nom du défi, **anneau de progression** SVG dégradé (3/4), objectif, reste à faire, cagnotte animée, pile d'avatars + effectif |
| **CTA** | « Déclarer une séance » |
| **Ma semaine** | inchangé (7 jours + joker) |
| **Dernières séances** | 3 dernières du groupe, icône par sport, auteur, durée, « aujourd'hui / hier / dimanche », badge de statut, lien « Voir tout » |
| **Historique** | 6 dernières semaines en barres dégradées, semaine en cours en corail |

Trois nouveaux composants : [ChallengeHero.tsx](../../components/home/ChallengeHero.tsx),
[RecentSessions.tsx](../../components/home/RecentSessions.tsx),
[WeeklyHistory.tsx](../../components/home/WeeklyHistory.tsx). Toute l'arithmétique est isolée
dans [home-stats.ts](../../features/home/home-stats.ts) — pure et testée.

---

## Tests ajoutés (+29)

| Fichier | Couvre |
|---|---|
| [home-stats.test.ts](../../features/home/__tests__/home-stats.test.ts) | `weekStats` (filtre auteur/semaine/statut, ratio plafonné à 1, division par zéro), `motivationLine` (singulier « une séance », objectif atteint, pas d'objectif), `countdownLabel` (« Dernier jour » plutôt que « J-0 »), `historyBars` (6 semaines, semaines vides conservées, échelle sur le meilleur score), `relativeDay` (aujourd'hui/hier/jour/date, date invalide) |
| [username.test.ts](../../features/auth/__tests__/username.test.ts) | `isUsernameTakenError` (code 23505, message, `details`, **ne confond pas avec l'e-mail**), `isEmailTakenError` |

## Fichiers touchés

- **Accueil** : `app/(tabs)/index.tsx`, `components/home/{ChallengeHero,RecentSessions,WeeklyHistory}.tsx`,
  `features/home/home-stats.ts`
- **Avatar** : `components/profile/AvatarPicker.tsx`, `app/(tabs)/profile.tsx`
- **Suppression** : `features/auth/account.ts`, `app/(tabs)/profile.tsx`, `app/settings.tsx`
- **Inscription** : `app/(auth)/sign-up.tsx`, `features/auth/username.ts`
- **Divers** : `components/home/EmptyGroups.tsx`, `app/(tabs)/groups.tsx`,
  `features/groups/queries.ts`
- **SQL / types** : `supabase/sql/033_member_left_notifications.sql`, `types/database.types.ts`

## Test rapide

1. Exécuter **033**, puis `npx expo start --web --clear`.
2. **Inscription** : tape un pseudo existant → « Ce pseudo est déjà pris. » **avant** de valider.
3. Avatar : choisis une photo → **plus aucun liseré coloré** autour. Va sur Couleur → bandeau
   « ta photo masque la bulle », et la photo **reste**. « Retirer l'image » → tu restes sur l'onglet.
4. **Supprimer un compte** → la popup « Compte supprimé » doit s'afficher, puis la déconnexion.
5. Avec un 2ᵉ compte dans le même groupe → il reçoit une **notification** « X a supprimé son
   compte », et X a disparu de la liste des membres.
6. **Accueil avec un groupe** : hero + anneau + cagnotte + CTA + Ma semaine + dernières séances
   + historique.

## Restant

- `app/settings.tsx` reste le dernier écran pré-DA.
- Cagnotte et historique afficheront **0** tant que l'**Étape 9** (conséquences) n'est pas faite.
- ⚠ Avant la prod : `DROP FUNCTION IF EXISTS public.dev_reset_excuse_joker(UUID);`
