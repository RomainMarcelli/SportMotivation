# Étape 8 quater — Fix inscription, invitation pour tous, changement d'admin, nav footer

`npx tsc --noEmit` ✅ · `jest` **203/203** ✅ (33 suites, **+17 tests**). Aucun commit, aucune
commande git.

---

## ⚠️ SQL à exécuter (2 nouveaux fichiers)

| Fichier | Rôle |
|---|---|
| [028_upsert_my_profile.sql](../../supabase/sql/028_upsert_my_profile.sql) | **Fix du bug d'inscription** (profil perdu) |
| [029_transfer_admin.sql](../../supabase/sql/029_transfer_admin.sql) | RPC « changer d'admin » + notification |

`029` suppose que `026` (type `admin_transferred`) est déjà passé.

---

## 1. 🐛 Inscription : prénom / pseudo / photo perdus — CORRIGÉ

**Deux bugs cumulés, tous deux silencieux** (aucune erreur affichée, d'où l'effet « ça a marché
mais rien n'est enregistré ») :

### a. La mutation partait sans utilisateur
`useUpdateProfile` lisait l'utilisateur dans le **store Zustand** (`useCurrentUser()`). Or à
l'inscription on enchaîne :

```
await signUp.mutateAsync(...)   →  la session vient d'être créée
await updateProfile.mutateAsync(...)   →  mais le store est encore à `null`
```

Le store n'est alimenté que par `onAuthStateChange`, **de façon asynchrone**. Selon que le
re-render avait eu lieu ou non, la mutation partait avec `user = null` → `throw` → attrapé par
`handleError` → message générique. **C'est aussi ce qui rendait le bug intermittent.**

→ **Fix** : on interroge `supabase.auth.getUser()` **dans** la mutation. Plus aucune dépendance à
l'état client (même approche que `useDeclareSession`).

### b. Un UPDATE qui ne touche rien ne renvoie PAS d'erreur
La mutation faisait `.from("users").update(...).eq("id", ...)`. Si **aucune ligne** n'est touchée
(ligne `public.users` pas encore créée par le trigger, ou masquée par la RLS), PostgREST répond
**200 avec 0 ligne** : l'écriture est perdue **sans la moindre erreur**.

→ **Fix** : nouvelle RPC **`upsert_my_profile`** (SECURITY DEFINER) qui :
- s'identifie via `auth.uid()` côté serveur ;
- fait un `INSERT … ON CONFLICT (id) DO UPDATE` → marche même si la ligne n'existe pas encore ;
- n'écrase **jamais** une valeur existante avec un champ vide (`COALESCE`).

### c. Bonus : l'écran Profil réclamait un « Nom » jamais demandé
`completeProfileSchema` exigeait `lastName` (« Nom requis »), alors que **l'inscription ne le
collecte pas** (hors maquette). Le formulaire était donc invalide d'office. → `lastName` est
désormais **optionnel** (champ intitulé « Nom (optionnel) »), longueur max toujours validée.

## 2. Inviter : accessible à TOUS les membres

Nouveau [InviteSheet.tsx](../../components/groups/InviteSheet.tsx) : bottom-sheet DA contenant le
bloc d'invitation existant (**QR code + code à 6 caractères + lien + partage**), réutilisé tel quel.

Dans le menu ⋮ du groupe, **« Inviter au groupe » est maintenant en première position pour tout le
monde** (avant : admin uniquement, et ça ouvrait un écran complet). L'admin garde par ailleurs le
bloc d'invitation dans l'onglet Infos.

## 3. Changer d'admin (admin uniquement)

- **SQL 029** — RPC `transfer_admin(p_group_id, p_new_admin_id)` : vérifie que je suis **admin
  actif**, que la cible est un **membre actif**, promeut la cible, me repasse **membre simple**
  (je **reste** dans le groupe — c'est la différence avec « Quitter »), et **notifie** le nouvel
  admin (« *Romain t'a confié l'administration de « BOOM ». Tu peux modifier les règles et inviter
  des membres.* »).
- **UI** — [AdminTransferSheet.tsx](../../components/groups/AdminTransferSheet.tsx) : bottom-sheet
  avec couronne ambre, liste des membres (avatar, prénom, « membre depuis le … »), **du plus ancien
  au plus récent**, spinner sur la ligne en cours. Confirmation destructive avant transfert, puis
  toast « *Léa est désormais l'admin du groupe.* ».
- L'entrée **« Changer d'admin »** n'apparaît que si je suis admin **et** qu'il existe au moins un
  autre membre.

## 4. 🐛 Footer inutilisable depuis une notification — CORRIGÉ

**Reproduction** : Accueil → cloche → Notifications → tap sur une notif → Groupe. Là, seul
**Profil** répondait.

**Cause** : la pile racine contenait alors **deux écrans poussés** (`notifications` puis `group`).
`router.navigate("/")` ne quittait pas cette pile (la cible « / » était ignorée), et « Groupes »
était considéré comme **déjà actif** (`/group/...` → onglet Groupes) donc sans effet. Seul
« Profil », cible différente et non ambiguë, fonctionnait.

**Fix** ([BottomNav.tsx](../../components/ui/BottomNav.tsx)) : on **dépile la pile racine**
(`dismissAll`, protégé par `canDismiss()` + try/catch) **avant** de rejoindre l'onglet. Fiable
depuis n'importe quelle profondeur.

---

## Tests unitaires ajoutés (+17)

| Fichier | Couvre |
|---|---|
| [admin-transfer.test.ts](../../features/groups/__tests__/admin-transfer.test.ts) | candidats (exclusion de soi, tri par ancienneté, non-mutation du tableau, cas « seul »), `canTransferAdmin`, mapping d'erreurs |
| [BottomNav.test.ts](../../components/ui/__tests__/BottomNav.test.ts) | onglet actif par route, dont `/notifications` → **aucun** onglet (non-régression du bug ci-dessus) |
| [profile-schemas.test.ts](../../features/auth/__tests__/profile-schemas.test.ts) | nom absent / vide / trop long / conservé |

> 🐞 **Un test a immédiatement attrapé un vrai bug** : `mapTransferAdminError` renvoyait
> « Tu n'es pas membre de ce groupe » pour `TARGET_NOT_MEMBER`, parce que cette chaîne **contient**
> `NOT_MEMBER` et que le parcours suivait l'ordre de déclaration. Corrigé en testant les codes
> **du plus long au plus court**.

## Fichiers touchés
- **Fix inscription** : `features/auth/profile-mutations.ts`, `features/auth/profile-schemas.ts`,
  `app/(tabs)/profile.tsx`, `supabase/sql/028_upsert_my_profile.sql`
- **Invitation / admin** : `components/groups/InviteSheet.tsx`,
  `components/groups/AdminTransferSheet.tsx`, `features/groups/admin-transfer.ts`,
  `features/groups/transfer-mutations.ts`, `supabase/sql/029_transfer_admin.sql`,
  `app/group/[id]/index.tsx`
- **Nav** : `components/ui/BottomNav.tsx`
- **Types** : `types/database.types.ts` (`upsert_my_profile`, `transfer_admin`)

## Test rapide
1. Exécuter **028** et **029**, puis `npx expo start --web --clear`.
2. **Créer un compte neuf** avec prénom + pseudo + photo → aller dans Profil : les 3 doivent être
   **remplis**, et aucun champ obligatoire ne doit bloquer.
3. Groupe → ⋮ → **Inviter au groupe** (teste avec un compte **non-admin**) → QR + code + lien.
4. Admin → ⋮ → **Changer d'admin** → choisir un membre → il reçoit la notification, tu redeviens
   membre (ton ⋮ ne propose plus Modifier/Changer d'admin).
5. Accueil → cloche → une notification → Groupe → **les 3 onglets du footer doivent répondre**.

## Note
L'écran Profil reste globalement **pré-DA** (fond blanc) : c'est l'**Étape 13**. Seuls le champ
« Nom (optionnel) » et le bloc de bascule de comptes ont été touchés ici.
