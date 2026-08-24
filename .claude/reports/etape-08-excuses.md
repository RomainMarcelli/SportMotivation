# Étape 8 — Excuses (justifier une semaine) + Joker

UI 100 % `maquette/V3/sport-motiv-excuse.html`. iOS + Android + web. `tsc --noEmit` ✅ ·
`jest` **178/178** ✅ (30 suites, +13).

## 1. Reconnaissance
- **Maquette** = écran de **soumission** d'une excuse : choix du **type** (radio), **motif** obligatoire
  (chips + textarea), **justificatif** facultatif, bloc « soumise au **vote du groupe** à la majorité
  simple », CTA « Soumettre au vote ». Pas d'écran de joker dédié.
- **Existant réutilisé** :
  - Table `excuses` (`excuse_type` = `standard`|`major`, `reason`, `justification_url`, `status` =
    `pending_vote`|`accepted`|`rejected`, `week_start`) — déjà au schéma, jamais utilisée.
  - `votes.excuse_id` (nullable) déjà présent → les votes d'excuse réutilisent la table `votes`.
  - Joker = **placeholder** dans [WeekPlanner](../../components/home/WeekPlanner.tsx) (chip commenté,
    non persistant). Aucune table `jokers` n'existait.
  - `is_group_member()`, deck de vote (Étape 7), `weekStartString`, pattern upload de preuve.

## 2. Écran / flux = maquette
- [app/group/[id]/excuse.tsx](../../app/group/[id]/excuse.tsx) : **Type** (cartes radio standard/majeure
  avec effet annoncé), **Motif** (chips selon le type + textarea, source de vérité = textarea),
  **Justificatif** (image facultative, « Recommandé » pour majeure), **bloc info-vote** (avatars des
  autres membres + « N membres voteront »), footer collant « Soumettre au vote » (désactivé tant que le
  motif est vide). Anti-doublon UI : si une excuse de la semaine existe déjà → écran d'état
  (« déjà soumise » / « acceptée »).
- **Vote du groupe** branché en réutilisant le **deck de l'Étape 7** : le même écran `/group/[id]/vote`
  affiche désormais une **file unifiée séances + excuses** (carte `ExcuseVoteCard`). Valider/Refuser,
  refus motivé (commentaire → `votes.comment`), résolution serveur. Tampon « ACCEPTÉE » pour les excuses.
- **Joker** rendu fonctionnel sur « Ma semaine » : chip **1 joker / Joker utilisé** (confirm → `use_joker`),
  reflète l'état réel du mois. + entrée **« M'excuser cette semaine »** vers l'écran.

## 3. Logique (pure, testée)
- [features/excuses/excuse-logic.ts](../../features/excuses/excuse-logic.ts) : `EXCUSE_TYPES`,
  `EXCUSE_MOTIFS`, `excuseThreshold` (majorité simple des autres), `resolveExcuse`
  (oui/non ≥ seuil, sinon tout-le-monde-a-voté → majorité, **égalité = acceptée**), `isExcuseReasonValid`.
- [features/jokers/joker.ts](../../features/jokers/joker.ts) : `monthStartString`, `monthLabel`,
  `isJokerUsed`.
- **Anti-doublon** : 1 excuse non-refusée par (groupe, membre, semaine) — index partiel + contrôle RPC.
- **Conséquences** (exemption pénalité, reset de semaine pour une majeure, séance exemptée par joker)
  = **`// TODO Étape 9`** dans `cast_excuse_vote` / `use_joker`. Non implémentées ici.

## 4. Données
- `features/excuses/{schemas,queries,mutations}.ts` : `useMyWeekExcuse`, `useVotableExcuses` (+ tally,
  filtre « déjà voté »), `useJustificationSignedUrl`, `useSubmitExcuse` (upload justificatif puis RPC),
  `useCastExcuseVote`, `mapExcuseError`.
- `features/jokers/queries.ts` : `useMonthlyJoker`, `useUseJoker`, `mapJokerError`.
- `types/database.types.ts` : table `jokers` + signatures RPC `submit_excuse`, `cast_excuse_vote`,
  `use_joker` ajoutées à la main (types non régénérés).

## 5. SQL ⚠️ à exécuter
- [022_excuses.sql](../../supabase/sql/022_excuses.sql) : index anti-doublon excuse + anti-double-vote
  excuse ; RLS lecture des excuses (membres) ; **extension de `votes_select_members`** aux votes
  d'excuse ; RPC `submit_excuse` et `cast_excuse_vote` (majorité simple) ; **bucket privé
  `excuse-justifications`** + policies (upload owner, lecture par membre d'un groupe partagé).
- [023_jokers.sql](../../supabase/sql/023_jokers.sql) : table `jokers` (1/membre/mois, unicité), RLS
  lecture membres, RPC `use_joker`.

## 6. Vérif
- Tests : `features/excuses/__tests__/excuse-logic.test.ts` (8), `features/jokers/__tests__/joker.test.ts`
  (5). `tsc --noEmit` ✅ · `jest` **178/178** ✅.
- Web : déclarer une excuse (standard/majeure, motif chips + libre, justificatif), voir l'anti-doublon,
  voter une excuse dans le deck, consommer le joker (« Joker utilisé »), footer + nav 3 onglets OK.

## Écarts / décisions
1. **Pas d'écran joker dédié** (absent des maquettes) : joker = chip fonctionnel sur « Ma semaine »
   (1/mois, irréversible) ; l'effet réel = Étape 9. Une table `jokers` a été créée (aucune n'existait).
2. **Vote d'excuse intégré au deck existant** (réutilisation Étape 7) plutôt qu'un écran séparé non
   maquetté : file unifiée séances + excuses, carte d'excuse cohérente DA.
3. **Justificatif = image** (galerie/web) : le PDF/document de la maquette n'est pas géré (picker image
   uniquement) — à compléter si besoin. Nouveau bucket privé `excuse-justifications` (policies dans 022).
4. **`major` vs « majeure »** : l'enum DB vaut `major` ; libellé UI « Excuse majeure ».

## Commit proposé
`feat(excuses): déclaration au vote du groupe (maquette) + vote d'excuse dans le deck + joker mensuel`
