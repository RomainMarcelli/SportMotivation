# Rapport — Étape 7 : Voter (validation des séances par le groupe)

Date : 2026-06-20 · Branche : `feature/refonte` · Statut : ✅
Source : `maquette/V3/sport-motiv-voter.html`. UI + logique de vote, réutilise l'existant.

## 1. Reconnaissance (existant)
- **Aucun écran de vote** avant cette étape ; les lignes de séances du dashboard étaient en lecture
  seule (Étape 5).
- **Données présentes** : table `votes` (id, `session_id`, `voter_id`, `vote_value` bool, `comment`),
  table `sessions` (statut `session_status` = `pending_vote`/`validated`/`rejected`/`expired`,
  `published_at`, `week_start`, `validated_at`), `group_members` (actif = `left_at IS NULL`),
  `groups.vote_deadline` (enum `deadline_type` = `same_day`/`end_of_week`). **Pas** de RPC de vote ni de
  résolution → créés ici.
- **Maquette** : deck façon « cartes à swiper ». Carte = média de preuve (photo/Strava/lien) + badge
  type + géo, déclarant (avatar + nom), pills (activité/durée/date), commentaire, **tally** (X oui / Y
  non + « majorité à N voix »). Gros boutons ronds **Refuser** (cercle rouge) / **Valider** (cercle
  dégradé vert), tampons VALIDÉE/REFUSÉE au swipe, compteur « N restantes », état final « Tu es à jour ».

## 2. Écran Voter = maquette → `app/group/[id]/vote.tsx`
- **Header** : retour + « À valider » + nom du groupe + pill « N restantes ».
- **Deck** : carte du dessus déplaçable (`react-native-gesture-handler` `Gesture.Pan` +
  `reanimated`), pile en arrière-plan, **tampons** VALIDÉE/REFUSÉE dont l'opacité suit le geste.
- **Carte** (`VoteCard`) :
  - Média : **photo** (URL signée `useProofSignedUrl`), **Strava** (dégradé + stats distance/durée
    depuis `strava_data`), **lien** (icône + « Voir la preuve » → `Linking`). Badge type + badge géo si
    `latitude/longitude`.
  - Déclarant (Avatar + « a déclaré une séance »), **délai restant** (`formatTimeRemaining`), pills
    activité (`getSportIcon`)/durée/date (relative), commentaire, **tally** oui/non + « majorité à N voix ».
- **Actions** : Refuser / Valider (DA, **haptics** natif, désactivés pendant l'envoi). Swipe **ou**
  boutons → même issue. `Reveal` sur les entrées, `prefers-reduced-motion` respecté (pas d'animation de
  swipe, vote direct).
- **État vide / fin** : « Tu es à jour » (cercle vert) + « Retour au groupe ».

## 3. Logique de vote
- **Helpers purs** `features/votes/vote-logic.ts` (testés) : `voteDeadline` (selon `same_day`/
  `end_of_week`), `isVoteExpired`, `voteThreshold` (= majorité stricte des autres membres,
  `floor(n/2)+1`), `resolveVote` (oui/non ≥ seuil, sinon majorité simple si tout le monde a voté ou
  délai écoulé, sinon en attente), `formatTimeRemaining`.
- **Query** `features/votes/queries.ts` → `useVotableSessions(groupId, meId)` : séances `pending_vote`
  du groupe, **pas les miennes** (`neq user_id`), **pas déjà votées** (filtre via mes votes), avec
  auteur + preuves + **tally** (lecture de `votes`, autorisée par la nouvelle RLS).
- **Mutation** `features/votes/mutations.ts` → `useCastVote()` appelle la RPC `cast_vote` puis invalide
  `["votes", groupId]` + `["sessions", groupId]`. Erreurs mappées (`mapVoteError` :
  `CANNOT_VOTE_OWN`, `ALREADY_VOTED`, `SESSION_NOT_PENDING`…).
- **Anti-fraude / intégrité** : tout est dans la RPC `cast_vote` (SECURITY DEFINER) → membre du groupe,
  **pas sa propre séance**, séance en attente, **anti-double-vote** (index unique). Résolution : seuil
  de majorité atteint → `validated`/`rejected` ; tout le monde a voté / délai dépassé → majorité simple
  (0 vote → `expired`). **Conséquences (cagnotte/blâmes) = `// TODO Étape 9`** dans la RPC (non faites).

## 4. Entrée vers l'écran
Dashboard groupe ([app/group/[id]/index.tsx](../../app/group/[id]/index.tsx)), onglet **Séances** :
bannière coral **« N séance(s) à valider · Donne ton vote »** (visible si `useVotableSessions` > 0) →
route `/group/[id]/vote`. Route déclarée dans `app/group/[id]/_layout.tsx` (`headerShown:false`,
header custom).

## 5. SQL — [018_vote_session.sql](../../supabase/sql/018_vote_session.sql) ⚠️ à exécuter
- Index unique `votes(session_id, voter_id)` (anti-double-vote).
- RLS `votes_select_members` : un membre lit les votes des séances de son groupe (tally).
- RPC `cast_vote(p_session_id, p_value, p_comment)` : vote + résolution + `GRANT EXECUTE`.
- `types/database.types.ts` : signature `cast_vote` ajoutée à la main (types non régénérés).

## 6. Vérif
- `features/votes/__tests__/vote-logic.test.ts` : seuil, deadlines, résolution (majorité/expiration),
  countdown. `tsc --noEmit` ✅ · `jest` **165/165** ✅ (28 suites, +13).

## Écarts / décisions
1. **Deck swipe** (au lieu de cartes empilées HTML) : `Gesture.Pan` + `reanimated`, boutons en doublon
   pour web/accessibilité. Une seule carte montée à la fois (+ pile décorative) → hooks de preuve OK.
2. **Auto-résolution à l'expiration du délai** : faite **à la volée** quand un vote est enregistré après
   la deadline. Sans vote après deadline, la séance reste `pending_vote` jusqu'à interaction → une vraie
   expiration automatique nécessitera un job planifié (pg_cron / edge function), hors scope « basique ».
3. **Conséquences cagnotte/blâmes** non implémentées (Étape 9, `// TODO` en place).
4. **kcal Strava** non affiché (non stocké) ; carte montre distance + durée.

## Corrections (révision écran de vote)
- **Bug du deck (saut de carte)** : on votait 1 séance sur 2. Cause = double avance — `cursor++`
  ET le refetch de `useVotableSessions` retirait la séance votée → `list[cursor]` sautait la suivante
  (« Tu es à jour » prématuré + bannière persistante au retour). Fix : file d'attente locale
  `votedIds` (Set) ; la carte courante = `queue[0]` (`items` filtré). Plus de curseur.
- **Photo plein écran** : tap sur la preuve photo → `Modal` plein écran (contain + fermeture).
- **Carte compacte** : la carte ne s'étire plus (`flex-1` retiré), centrée verticalement dans le deck,
  tally collé au contenu (plus de grand vide sous un commentaire court).
- **Retour après vote** : toast « Tu as validé/refusé la séance de X. ».
- **Refus motivé** : le refus ouvre une `RefuseModal` (raison facultative) ; le commentaire part dans
  `votes.comment` via `cast_vote(p_comment)`. Swipe gauche = ouvre la modale (ne refuse plus à l'aveugle).
- **« Expiré » trop tôt** : ce n'était pas un bug. Le groupe est en `vote_deadline = 'same_day'`
  (vote fermé en fin de journée de déclaration). Pour voter jusqu'au dimanche : SQL optionnel
  [021_set_vote_deadline_end_of_week.sql](../../supabase/sql/021_set_vote_deadline_end_of_week.sql).
  Garde-fou client : fallback `published_at ?? performed_at` pour la source de deadline.

### Reste à faire (à valider) — fil de contestation du refus
Demande : après un refus, l'auteur peut **protester** (réponse visible du seul refuseur), renvoyée au
refuseur qui re-tranche ; s'il refuse encore → refus définitif. C'est une **vraie feature** (nouvelle
table `vote_contestations` + RPCs + une **surface de notifications/inbox** in-app — alignée avec la
Phase 2.5 prévue). Non amorcée côté backend pour ne pas l'improviser : à cadrer/valider d'abord.
La 1ʳᵉ brique (raison du refus persistée) est en place.

## Commit proposé
`feat(vote): scrutin des séances (deck swipe, cast_vote + résolution, bannière dashboard)`
`fix(vote): file d'attente sans saut, photo plein écran, carte compacte, refus motivé + toasts`
