# Étape 8 ter — Fix switch, notifications d'excuse, quitter le groupe, filtres semaine

`npx tsc --noEmit` ✅ · `jest` **186/186** ✅ (31 suites). Aucun commit ni commande git.

---

## ⚠️ SQL à exécuter (2 nouveaux fichiers, dans l'ordre)

| Fichier | Rôle |
|---|---|
| [024_excuse_notifications.sql](../../supabase/sql/024_excuse_notifications.sql) | Notifications in-app des excuses (demande → membres, résultat → auteur) + 2 valeurs d'enum |
| [025_leave_group.sql](../../supabase/sql/025_leave_group.sql) | RPC `leave_group` (quitter + transfert admin automatique) |
| [026_admin_transfer_notification.sql](../../supabase/sql/026_admin_transfer_notification.sql) | Notification « Tu es le nouvel admin » au membre promu |

Sans eux : le menu « Quitter le groupe » échouera et aucune notification d'excuse ne partira.

---

## 1. 🐛 Switch de compte : loader infini — CORRIGÉ

**Cause trouvée** : après `setSession()`, j'appelais `queryClient.clear()`. Or l'écran racine
([_layout.tsx:87](../../app/_layout.tsx#L87)) affiche un splash tant que la query `profile` charge.
`clear()` **supprime** les queries du cache pendant qu'elles sont observées : la query `profile` en
vol est détachée et ne se relance jamais → `isLoading` reste vrai → **loader permanent** (d'où le
reload obligatoire). Ça marchait « une fois sur deux » selon que le refetch était en vol ou non au
moment du clear.

**Fix** ([DevAccountSwitcher.tsx](../../components/profile/DevAccountSwitcher.tsx)) :
`queryClient.invalidateQueries()` à la place — non destructif, tout est marqué périmé et se
refetch proprement avec la nouvelle session. Plus aucun état bloquant possible.

## 2. Rejoindre 2× le même groupe → bloqué en amont

[join-confirm.tsx](../../app/group/join-confirm.tsx) : dès que l'aperçu du groupe est chargé, on le
compare à **mes groupes**. Si j'en suis déjà membre → **écran dédié** (pas de formulaire) : icône
ambre, « **Tu es déjà membre** », « Tu fais déjà partie de “X” — impossible de le rejoindre une
deuxième fois », boutons **Ouvrir le groupe** (dégradé) + Retour. Le refus serveur `ALREADY_MEMBER`
existait déjà (ceinture) ; là on prévient **avant** (bretelles).

## 3. Notifications d'excuse (in-app)

**Serveur** (SQL 024, réutilise la table `notifications` + l'écran existants) :
- `submit_excuse` → notification **`vote_pending_excuse`** à tous les autres membres actifs :
  « *Demande d'excuse à voter — Romain demande une excuse cette semaine dans « BOOM ». Donne ton
  vote.* » (data : group_id, excuse_id).
- `cast_excuse_vote` → à la résolution, notification à l'**auteur** : **`excuse_accepted`**
  (« Le groupe « BOOM » a accepté ton excuse de la semaine. ») ou **`excuse_rejected`**.
  Nouvelles valeurs d'enum ajoutées (`ALTER TYPE … ADD VALUE IF NOT EXISTS`).

**Client** — [notifications.tsx](../../app/notifications.tsx) entièrement **refait à la DA**
(il était encore fond blanc / bleu générique) : fond ink + AppBackground, cartes `surface` bordées
`line`, non-lu = teinte corail + point corail, icônes par type dans une pastille douce
(demande d'excuse = HeartPulse ambre, acceptée = check mint, refusée = croix rouge, vote séance =
urne corail…), actions « Tout marquer comme lu » / « Tout effacer », swipe-pour-supprimer conservé,
état vide DA. **Navigation au tap** : demande à voter → **deck de vote du groupe** ; résultat →
dashboard du groupe.

## 4. Quitter le groupe (menu ⋮)

- Le **⋮** en haut à droite du groupe est maintenant **pour tout le monde** et ouvre un
  **bottom-sheet DA** (avant : admin uniquement, direct vers Modifier) :
  - **Admin** : Modifier le groupe · Inviter au groupe · Quitter le groupe (rouge)
  - **Membre** : Quitter le groupe
- **Règle validée avec toi** : l'admin **peut quitter** → le rôle est **transféré automatiquement au
  membre actif le plus ancien** (SQL 025). La RPC renvoie le prénom du promu → toast
  « Tu as quitté « BOOM ». Léa devient admin. ». **Dernier membre** → refus explicite :
  « supprime le groupe plutôt ».
- Confirmation destructive avant (message spécifique admin), historique conservé (`left_at`),
  redirection vers l'onglet Groupes.
- Nouveau fichier [features/groups/leave.ts](../../features/groups/leave.ts) (`useLeaveGroup`,
  `mapLeaveError`).

## 5. Badge compteur sur la cloche

[AppHeader.tsx](../../components/home/AppHeader.tsx) : le petit point devient une **pastille
chiffrée** (1, 2, … **9+**) corail, bordée ink, ancrée sur le coin de la cloche. Et le compteur se
**rafraîchit tout seul** (refetch 60 s + retour de focus) — le vrai temps réel arrivera à l'Étape 11.

## 6. Excuse : « quand pourrai-je redemander ? »

Sur l'écran d'état ([excuse.tsx](../../app/group/[id]/excuse.tsx), excuse acceptée OU en attente) :
pastille « **Une excuse par semaine · prochaine demande possible lundi 29 juin** » (date du lundi
suivant, calculée sur la semaine ISO locale — la règle réelle : 1 excuse non refusée par semaine).
Textes principaux affinés (mention de la notification à venir).

## 7. Onglet Séances : semaine excusée visible

Quand **ma** semaine en cours a une excuse → **bandeau** en tête de l'onglet Séances :
- en attente : ambre, « Excuse en attente de vote — le groupe vote actuellement ta demande » ;
- acceptée standard : mint, « Semaine excusée · objectif réduit de 1 séance » ;
- acceptée majeure : mint, « Semaine excusée · semaine annulée, aucune pénalité ».
(L'effet chiffré réel sur les pénalités = Étape 9 ; ici c'est l'information à l'utilisateur.)

## 8. Onglet Séances : navigation par semaine (ton choix)

Sélecteur **‹ Semaine ›** en tête d'onglet : par défaut « **Cette semaine** », flèche gauche pour
remonter (« Semaine du 15 juin », …), **bornée au début du défi**, flèche droite pour revenir.
Le compteur de l'onglet et les sections (En attente de vote / Récentes) suivent la semaine
sélectionnée. État vide adapté (« Aucune séance déclarée cette semaine-là »). Le bandeau d'excuse ne
s'affiche que sur la semaine en cours.

## 9. PDF « bloqué par Chrome » — corrigé

Chrome interdit le rendu d'un PDF dans une iframe → l'aperçu inline web sautait. Le viewer
([JustificationViewer.tsx](../../components/excuses/JustificationViewer.tsx)) affiche désormais,
pour un PDF, une tuile + bouton **« Ouvrir le PDF »** : **nouvel onglet** sur web,
**visionneuse système** sur iOS/Android (comme convenu). Les images restent en plein écran inline.

---

## Fichiers touchés
- Fix : `components/profile/DevAccountSwitcher.tsx`
- SQL : `supabase/sql/024_excuse_notifications.sql`, `supabase/sql/025_leave_group.sql`
- Types : `types/database.types.ts` (enum + `leave_group`)
- Nouveaux : `features/groups/leave.ts`
- UI : `app/notifications.tsx` (refonte DA), `components/home/AppHeader.tsx`,
  `app/group/join-confirm.tsx`, `app/group/[id]/index.tsx` (menu ⋮ + filtre semaine + bandeau
  excuse), `app/group/[id]/excuse.tsx`, `components/excuses/JustificationViewer.tsx`
- `features/notifications/queries.ts` (refetch périodique)

## Test rapide (web, 2 comptes)
1. **Exécute les SQL 024 + 025**, puis `npx expo start --web --clear`.
2. Profil → bascule A→B→A plusieurs fois : **plus de loader bloqué**.
3. Compte B → soumet une excuse → compte A : **badge « 1 »** sur la cloche → notification
   « Demande d'excuse à voter » → tap → **deck de vote**. Vote oui → compte B reçoit
   « Excuse acceptée » et voit le **bandeau « Semaine excusée »** dans l'onglet Séances.
4. Groupe → ⋮ → **Quitter** (teste avec l'admin : vérifier le transfert du rôle).
5. Rejoindre le groupe avec un code déjà rejoint → écran « **Tu es déjà membre** ».
6. Onglet Séances → flèches **‹ ›** pour changer de semaine.

## 10. Notification du nouvel admin (ajout demandé)

SQL 026 : nouveau type `admin_transferred`. Quand l'admin quitte, le promu reçoit
« **Tu es le nouvel admin** — *Romain a quitté « BOOM » : tu deviens administrateur du groupe. Tu
peux modifier les règles et inviter des membres.* » (tap → dashboard du groupe). Icône bouclier ambre
dans la liste. Sans ça, un membre devenait admin **sans le savoir**.

## À savoir
- Les notifications restent **in-app** (pas de push) — le push est l'Étape 11.
