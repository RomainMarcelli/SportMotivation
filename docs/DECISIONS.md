# Decisions — Journal des décisions techniques

> Toute décision technique structurante doit être consignée ici avec : date, contexte, décision, alternatives écartées et justification.
>
> Les décisions strictement triviales (formatage, nom de variable) n'ont pas leur place ici.

---

## 2026-05-21 — Lecture des groupes via RPC SECURITY DEFINER (et non RLS SELECT directe)

**Contexte** : après avoir rejoint un groupe, un membre ne pouvait pas le lire (RLS SELECT réservée au créateur), d'où « impossible de charger le groupe ». Plusieurs tentatives de correctifs RLS successifs.

**Décision** : exposer des fonctions `SECURITY DEFINER` (`get_my_groups`, `get_group_dashboard`, `get_group_members`) avec contrôle d'appartenance explicite via `auth.uid()`, et faire lire l'app par ces RPC plutôt que par des SELECT directs soumis à la RLS.

**Alternatives écartées** : multiplier les policies SELECT permissives (fragile, difficile à déboguer à l'aveugle sans accès DB).

**Justification** : robustesse et lisibilité du contrôle d'accès ; supprime la dépendance à des policies invisibles ; le contournement est explicite et auditable dans le code de la fonction.

---

## 2026-05-21 — Suppression de compte = anonymisation (soft delete)

**Contexte** : besoin d'une suppression de compte respectant le RGPD sans fausser les cagnottes/historiques des groupes.

**Décision** : Edge Function `delete-account` (service_role) qui anonymise le profil, fait quitter les groupes et bannit le compte auth. Les séances/pénalités restent. Idem pour la suppression de groupe via RPC `delete_group` (admin), qui elle est un hard delete (cascade).

**Justification** : intégrité des données financières du groupe (cagnotte) vs. droit à l'effacement → l'anonymisation concilie les deux.

---

## 2026-05-21 — Suppression de notifications = hard delete

**Contexte** : besoin de vider/supprimer des notifications.

**Décision** : hard delete (RLS `notifications_delete_own`).

**Justification** : les notifications ne sont pas des données critiques ni à conserver pour l'historique ; pas besoin de soft delete.

---

## 2026-05-21 — Système de feedback animé maison (toasts + confirmations)

**Contexte** : les `Alert` natives sont incohérentes et peu esthétiques (surtout Android) ; demande d'animations.

**Décision** : `components/feedback/FeedbackProvider.tsx` (Animated API) exposant `toast()` et `confirm()`, monté à la racine. Remplace progressivement les `Alert`.

**Justification** : UI cohérente cross-plateforme, animée, et confirmations en `Promise<boolean>` faciles à utiliser.

---

## 2026-05-21 — Préférence de thème persistée via NativeWind

**Contexte** : option clair/sombre/auto dans les Paramètres.

**Décision** : store Zustand `lib/theme-store.ts` qui applique le thème via l'API `colorScheme` de NativeWind et le persiste dans AsyncStorage ; restauré au démarrage dans `app/_layout.tsx`.

**Justification** : NativeWind pilote déjà les variantes `dark:` ; réutiliser son API évite un système de thème parallèle.

---

## 2026-05-19 — Stack technique du MVP

**Contexte** : Démarrage du projet, choix de la stack.

**Décision** : React Native + Expo + TypeScript ; NativeWind ; Expo Router ; Zustand + TanStack Query ; React Hook Form + Zod ; Supabase (DB + Auth + Storage + Edge Functions) ; Expo Notifications ; OAuth Strava v3.

**Alternatives écartées** :
- Flutter / native iOS+Android : courbe d'apprentissage + double codebase, Romain pas dev pro.
- Firebase : moins flexible côté SQL, vendor lock-in plus fort, RLS PostgreSQL plus fine.
- Backend custom (Node/Fastify + Postgres) : time-to-market trop long pour un MVP.
- PWA pure : notifications push iOS peu fiables, accès caméra/géoloc limité.

**Justification** : Expo + Supabase = vitesse d'exécution maximale, gratuit en beta, scalable. PostgreSQL = migration facile plus tard si besoin de quitter Supabase.

---

## 2026-05-19 — Package manager : npm (pas pnpm)

**Contexte** : Choix entre npm et pnpm pour le projet.

**Décision** : npm.

**Alternatives écartées** : pnpm.

**Justification** :
- L'écosystème Expo + React Native est principalement testé avec npm.
- pnpm cause parfois des problèmes de hoisting avec les modules natifs (Metro bundler n'aime pas toujours les symlinks).
- npm déjà installé (10.8.2), pas d'installation supplémentaire.
- Le gain pnpm (vitesse, espace disque) est marginal sur un seul projet.
- Migration triviale plus tard si besoin.

---

## 2026-05-19 — Commits Git manuels

**Contexte** : Workflow Git du projet.

**Décision** : Tous les commits sont réalisés manuellement par Romain. Claude Code prépare les fichiers, indique quand committer et propose un message, mais n'exécute jamais `git commit`/`git add`/`git push`.

**Justification** : Romain veut garder un contrôle total sur l'historique Git de son projet. Énoncé explicitement le 2026-05-19.

---

## 2026-05-19 — Cagnotte virtuelle en V1

**Contexte** : Comment gérer l'argent de la cagnotte ?

**Décision** : V1 = cagnotte 100 % virtuelle. Pas de paiement intégré. Les membres s'arrangent entre eux via Revolut, Lydia ou virement. Un trésorier coche manuellement les paiements reçus.

**Alternatives écartées** :
- Stripe Connect, Mangopay : conformité ACPR / DSP2 / KYC trop lourde pour un MVP.
- Lydia API / Revolut API : pas d'API grand public stable.

**Justification** : Valider le concept sans contrainte réglementaire. V2/V3 = paiements réels avec audit conformité.

---

## 2026-05-19 — Système de blâmes refondu (V1.1)

**Contexte** : V1.0 sanctionnait l'absence de vote → problème quand un membre publie tardivement un dimanche soir et que les autres n'ont pas le temps de voter.

**Décision** : Le blâme sanctionne désormais **les séances rejetées par vote**, pas l'absence de vote. Absence de vote = vote positif par défaut.

**Justification** : Évite de pénaliser les votants alors qu'on veut pénaliser les fraudeurs / non-conformes. Pousse à l'auto-régulation du groupe.

---

## 2026-05-19 — Verrouillage du nombre de séances hebdo (V1.1)

**Contexte** : V1.0 permettait potentiellement à un membre d'ajuster son objectif en cours de défi.

**Décision** : Le nombre de séances hebdomadaires choisi par un membre à son entrée dans le groupe est **verrouillé pour toute la durée du défi**. Aucune modification possible. Contrainte stricte côté DB et côté UI.

**Justification** : Évite que les membres baissent leur objectif en cours de route pour échapper aux pénalités. Engagement = engagement.

---

## 2026-05-19 — Excuses à deux niveaux (V1.1)

**Contexte** : Une seule classe d'excuses ne suffit pas — il y a une différence entre « j'avais une gastro » et « je suis à l'hôpital ».

**Décision** :
- **Excuse standard** : vote majoritaire, réduit l'objectif de 1 pour la semaine.
- **Excuse majeure** : vote majoritaire, remise à zéro complète de la semaine. Réservée aux cas exceptionnels (hospitalisation, blessure grave, événement familial majeur).

**Justification** : Cas extrêmes méritent une remise à zéro complète, sinon le système devient injuste. Mais on garde la philosophie stricte : maladie bénigne et vacances ≠ excuses majeures.
