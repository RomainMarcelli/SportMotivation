# Sport Motivation App — Spécifications MVP

> **Version** : 1.1
> **Date** : Mai 2026
> **Statut** : Validé — en attente d'attaque dev
> **Source** : conversion du document `Specifications_MVP_SportMotivationApp_V1.1.docx`

## Évolutions V1.1 (vs V1.0)

- Nombre de séances figé pour toute la durée du défi
- Montant de pénalité défini par l'administrateur (commun à tous)
- Contrat simplifié en récapitulatif + case à cocher (type CGU)
- Refonte du système de blâmes (sanction des séances rejetées)
- Excuses : possibilité de remise à zéro de la semaine en cas majeur
- Précision du mécanisme d'alimentation de la cagnotte

---

# 1. Contexte et objectif

## 1.1 Vision du produit

Sport Motivation App est une application mobile conçue pour aider des groupes d'amis à se motiver mutuellement à pratiquer une activité sportive régulière. Elle s'appuie sur trois leviers psychologiques puissants : l'engagement social, la perte financière (plus motivante que le gain selon les études comportementales) et la récompense collective.

## 1.2 Principe de fonctionnement

Des amis se réunissent autour d'un défi sportif sur une durée définie (par exemple 3 mois). Chaque participant s'engage sur un nombre de séances hebdomadaires et un montant de pénalité. Toute séance non effectuée entraîne le versement de cette pénalité dans une cagnotte commune. À la fin du défi, la cagnotte est débloquée pour financer une activité collective (restaurant, weekend, sortie, etc.).

## 1.3 Cible utilisateurs

- Groupes d'amis (2 à 10 personnes par groupe)
- Personnes souhaitant maintenir une routine sportive régulière
- Utilisateurs majoritairement mobiles (iOS et Android)

## 1.4 Objectifs du MVP

- Valider le concept en conditions réelles avec des groupes test
- Tester l'engagement et la rétention des utilisateurs
- Identifier les frictions UX avant un éventuel passage à l'échelle
- Préparer les fondations techniques pour la V2 (paiements réels, chat, monétisation)

---

# 2. Fonctionnalités V1 (MVP)

## 2.1 Authentification et profil

- Inscription et connexion par email/mot de passe
- Connexion via Google (OAuth)
- Profil utilisateur : photo, prénom, nom, pseudo
- Possibilité d'être membre de plusieurs groupes en parallèle

## 2.2 Création et gestion des groupes

### Création

- Un utilisateur crée un groupe et devient automatiquement administrateur
- Le groupe a un nom, une description optionnelle, une photo de groupe
- Définition de la durée du défi (date de début, date de fin)
- Capacité maximale : 10 membres par groupe

### Rejoindre un groupe

Trois méthodes possibles :
- Code à 6 chiffres saisi manuellement
- Lien d'invitation (ouverture directe dans l'app)
- QR Code à scanner

### Rôles

- **Administrateur** : peut modifier les règles du groupe (avant lancement), exclure un membre, désigner d'autres administrateurs, déclencher le déblocage de la cagnotte. Plusieurs administrateurs sont possibles dans un même groupe.
- **Membre** : participe au défi sans droits administratifs.

## 2.3 Configuration du défi

> ⚠ **MODIFICATION V1.1** — Le nombre de séances hebdomadaires est fixé une fois pour toutes par chaque membre à son entrée dans le groupe, et reste immuable pendant toute la durée du défi. Le montant de la pénalité est défini par l'administrateur à la création du groupe et s'applique uniformément à tous les membres.

### Paramètres définis par l'administrateur (à la création du groupe)

- Date de début et date de fin du défi (ex : 30 mai au 30 août)
- Montant de la pénalité par séance manquée — commun à tous les membres du groupe (ex : 5 €)
- Activités acceptées (course, musculation, vélo, yoga, etc.)
- Durée minimum d'une séance pour qu'elle soit valide (ex : 30 minutes)
- Délai de publication d'une séance : jour même ou jusqu'au dimanche 23h59
- Délai de vote : jusqu'au dimanche 23h59 ou jour même 23h59
- Seuil de blâmes avant pénalité (3 par défaut)
- Limite d'excuses par membre sur la durée du défi (illimité par défaut)

### Paramètres définis par chaque membre (à son entrée)

- **Nombre de séances hebdomadaires** — propre à chaque membre
- Une fois défini, ce nombre est **verrouillé** pour toute la durée du défi. Aucune modification possible en cours de route.

### Synthèse des paramètres

| Paramètre | Description | Défini par |
|---|---|---|
| Durée du défi | Date de début et date de fin | Admin |
| Montant de pénalité | Somme due à la cagnotte par séance manquée. Commun à tous | Admin |
| Activités acceptées | Types d'activités valides (course, muscu, vélo, yoga, etc.) | Admin |
| Durée minimum d'une séance | Pour qu'une séance soit valide (ex : 30 min) | Admin |
| Délai de publication | Jour même ou jusqu'au dimanche 23h59 | Admin |
| Délai de vote | Jour même 23h59 ou dimanche 23h59 | Admin |
| Seuil de blâmes | 3 par défaut | Admin |
| Limite d'excuses par membre | Illimité par défaut | Admin |
| Nombre de séances hebdo | Verrouillé pour toute la durée du défi une fois validé | Membre |

## 2.4 Récapitulatif et acceptation des règles

> ⚠ **MODIFICATION V1.1** — Suppression du contrat avec signature manuscrite, jugé trop lourd. Remplacement par un récapitulatif clair des règles affiché avant de rejoindre, validé par une case à cocher de type CGU.

À l'entrée dans un groupe, chaque membre doit consulter et accepter les règles du défi avant de pouvoir participer.

### Contenu affiché

- Nom du groupe, durée du défi (dates de début et fin)
- Montant de la pénalité par séance manquée (défini par l'admin)
- Activités acceptées et durée minimum d'une séance
- Modalités de publication et de vote
- Fonctionnement des excuses et des blâmes
- Rappel : la cagnotte est utilisée collectivement à la fin du défi
- Rappel : le nombre de séances hebdomadaires sera verrouillé après validation

### Acceptation

- Case à cocher unique : « J'ai lu et j'accepte les règles du défi »
- Horodatage de l'acceptation enregistré en base de données
- Les règles acceptées sont consultables à tout moment depuis le profil membre du groupe
- Sans acceptation, l'accès au défi est bloqué

## 2.5 Cycle hebdomadaire

### Définition de la semaine

- Une semaine commence le **lundi à 00h00**
- Une semaine se termine le **dimanche à 23h59**

### Planification optionnelle

- Chaque membre peut indiquer en début de semaine les jours où il prévoit de faire du sport
- Cette planification déclenche des notifications de rappel personnalisées
- La planification n'est pas obligatoire, c'est un outil d'aide à la motivation

### Déclaration et publication d'une séance

- Une séance doit être publiée le jour même où elle est effectuée (règle par défaut, modifiable par l'admin lors de la création)
- Le membre saisit le type d'activité, la durée, un commentaire optionnel
- Il fournit une preuve (voir section 2.6)
- La séance est immédiatement visible par les autres membres pour vote

### Clôture hebdomadaire et alimentation de la cagnotte

> ⚠ **MODIFICATION V1.1** — Précision du mécanisme d'alimentation de la cagnotte.

Le dimanche à 23h59, un traitement automatique se déclenche pour chaque groupe :

- Calcul du nombre de séances validées pour chaque membre sur la semaine écoulée
- Comparaison avec l'objectif hebdomadaire défini pour ce membre
- Pour chaque séance manquante : création d'une pénalité automatique d'un montant égal à la pénalité unitaire définie par l'admin
- La pénalité est ajoutée immédiatement et automatiquement au montant total de la cagnotte du groupe
- Une notification est envoyée au membre concerné avec le détail des pénalités
- Un récapitulatif hebdomadaire est envoyé à l'ensemble du groupe

### Exemple concret

Romain s'est engagé sur 4 séances par semaine. La pénalité du groupe est de 5 €. À la clôture du dimanche 23h59, l'application constate qu'il n'a fait que 2 séances validées. Le système crée automatiquement 2 pénalités de 5 €, soit 10 € ajoutés à la cagnotte. Romain reçoit une notification : « Tu as manqué 2 séances cette semaine. 10 € ajoutés à la cagnotte. »

## 2.6 Preuves de séance

Trois types de preuves sont acceptés :

### Photo prise dans l'application

- Capture obligatoirement via la caméra de l'app (pas d'upload depuis la galerie)
- Horodatage automatique
- Géolocalisation enregistrée dans les métadonnées (anti-fraude)

### Intégration Strava

- Connexion OAuth au compte Strava du membre
- Sélection d'une activité Strava récente
- Récupération automatique des données (distance, durée, type, carte)
- Cas d'usage : course, vélo, randonnée, natation, etc.

### Lien externe (autres applications)

- Collage d'un lien d'une activité publique d'une autre app
- Capture d'écran obligatoire en complément du lien
- Texte descriptif obligatoire

## 2.7 Système de vote

### Vote sur les séances

- Tous les membres du groupe votent OUI ou NON sur chaque séance publiée
- Le membre auteur de la séance ne vote pas sur sa propre séance
- Vote public : chacun voit qui a voté quoi
- Délai de vote : selon paramètre du groupe (jour même 23h59 ou dimanche 23h59)

### Règles de validation

- **Majorité simple** : plus de OUI que de NON = séance validée
- Plus de NON que de OUI = séance rejetée (le membre doit la refaire)
- **Égalité** = séance validée (bénéfice du doute)
- **Absence de vote** = considéré comme un vote positif par défaut à la fin du délai

### Exemple

Un joueur prévoit 4 séances par semaine. Il en fait 3 dont une est rejetée par les autres membres. Son compteur effectif tombe à 2 séances validées sur 4 attendues. Il devra donc encore en faire 2 d'ici la fin de la semaine, faute de quoi il paiera 2 pénalités à la cagnotte.

## 2.8 Système de blâmes (sanction de l'assiduité)

> ⚠ **MODIFICATION V1.1** — Refonte complète. Le blâme ne sanctionne plus l'absence de vote (problématique en cas de publication tardive un dimanche soir), mais l'accumulation de séances rejetées par le groupe. L'objectif est de pousser à l'assiduité sur les vrais types de séance et de décourager la fraude répétée.

### Principe

Le blâme sanctionne les membres dont les séances sont jugées non conformes par le groupe, afin de pousser à des séances honnêtes et conformes aux règles définies (durée, type d'activité, intensité réelle, etc.).

### Fonctionnement

- Un membre reçoit **1 blâme à chaque séance rejetée** par le vote du groupe
- Au bout de **3 blâmes cumulés** (paramétrable par l'administrateur), le membre paie une pénalité supplémentaire à la cagnotte
- Le montant de cette pénalité est égal à celui d'une séance manquée (montant unitaire défini par l'admin)
- Après paiement, le compteur de blâmes est remis à zéro
- Les blâmes se cumulent sur toute la durée du défi

### Exemple

Le groupe a fixé la pénalité à 5 € et le seuil à 3 blâmes. Sur 3 semaines, un membre fait 3 séances dont les autres membres considèrent qu'elles ne sont pas honnêtes (ex : balade de 15 minutes présentée comme une séance de sport). Il atteint 3 blâmes. Le système ajoute automatiquement 5 € supplémentaires à la cagnotte (en plus des pénalités déjà comptées pour ses séances manquées), et son compteur revient à 0.

### Effet recherché

- Encourager les membres à proposer de vraies séances dès la première publication
- Limiter les tentatives de fraude (activités sous-dimensionnées ou non-conformes)
- Renforcer l'auto-régulation du groupe par le vote

## 2.9 Système d'excuses

> ⚠ **MODIFICATION V1.1** — Ajout de la notion d'excuse majeure permettant une remise à zéro de la semaine (cas d'hospitalisation, blessure grave, etc.). Le système distingue désormais excuses standards (vote majoritaire) et excuses majeures (remise à zéro).

Le système d'excuses permet à un membre de déclarer en avance une impossibilité de faire ses séances. Deux niveaux sont prévus :

### Excuse standard (vote majoritaire)

- Le membre déclare une excuse via un formulaire avec motif obligatoire
- L'excuse est soumise au vote des autres membres (majorité simple)
- Si acceptée : l'objectif hebdomadaire du membre est réduit de 1 pour cette semaine uniquement
- Si rejetée : la séance reste due, et entraînera une pénalité si non effectuée
- La semaine suivante, l'objectif initial reprend ses droits
- Cas d'usage : grosse gastro, contrainte ponctuelle, déplacement professionnel imprévu

### Excuse majeure (remise à zéro de la semaine)

- Réservée aux cas exceptionnels : hospitalisation, blessure grave, événement familial majeur
- Le membre déclare l'excuse avec motif obligatoire et justificatif optionnel
- Soumise au vote du groupe (majorité simple par défaut)
- Si acceptée : toutes les séances de la semaine sont annulées, aucune pénalité possible cette semaine
- La semaine suivante, l'objectif initial reprend ses droits
- Le membre peut également suspendre sa planification pour la semaine

### Philosophie du système

Le système est volontairement strict pour préserver l'engagement. Une maladie bénigne ou des vacances ne constituent pas par défaut une excuse valable : c'est au membre de s'organiser. Seuls les cas réellement subis (hospitalisation, blessure incapacitante, événement majeur) justifient une remise à zéro. Pour les cas intermédiaires, le vote du groupe tranche.

### Cadre de fonctionnement

- Pas de limite d'excuses par défaut, paramétrable par l'admin
- Vote en majorité simple
- Le groupe régule lui-même par les votes : trop d'excuses tue les excuses

## 2.10 Cagnotte commune

### Fonctionnement en V1 (cagnotte virtuelle)

- Affichage du montant total cumulé en temps réel
- Affichage détaillé de qui doit combien
- Historique de toutes les pénalités et leur motif (séance manquée, blâme)
- Un trésorier (désigné par l'administrateur) coche manuellement les paiements reçus
- Pas de paiement réel intégré en V1 (les membres s'arrangent entre eux via Revolut, Lydia, virement)

### Déblocage de la cagnotte

- À la fin du défi, l'administrateur déclenche le déblocage
- Les membres définissent collectivement la date et le type d'utilisation (restaurant, sortie, etc.)
- Un récapitulatif de l'utilisation peut être saisi dans l'app

### Cas particulier : départ d'un membre

- Si un membre quitte le groupe, sa contribution reste dans la cagnotte par défaut
- L'administrateur peut choisir exceptionnellement de lui rembourser sa contribution
- Un membre ayant quitté peut être réinvité ultérieurement

## 2.11 Classement et gamification

- Classement intra-groupe basé sur le nombre de séances réussies
- Affichage du taux de réussite de chaque membre
- Système de jokers : un joker mensuel par membre pour annuler une séance sans pénalité ni vote (à utiliser avec parcimonie)

## 2.12 Notifications push

Les notifications sont essentielles à l'engagement utilisateur. Liste minimale V1 :

- Rappel personnalisé si une séance planifiée n'a pas été publiée (ex : lundi 18h)
- Récapitulatif dominical (dimanche 10h) avec séances restantes et votes en attente
- Notification quand une nouvelle séance attend votre vote
- Notification quand une excuse attend votre vote
- Notification de réception d'un blâme
- Notification quand un membre rejoint le groupe
- Notification J-7 avant la fin du défi
- Notification de clôture du défi avec montant final de la cagnotte

---

# 3. Hors périmètre V1 (prévu en V2)

Les fonctionnalités suivantes ne font pas partie du MVP afin de garantir un lancement rapide et un test concept efficace :

- Paiements réels intégrés (Stripe Connect, Mangopay, etc.)
- Chat interne au groupe
- Intégrations Apple Health, Google Fit, Garmin Connect, Nike Run Club
- Streaks, badges et système de récompenses avancé
- Classements inter-groupes
- Modes « défi spécial » temporaires avec cagnotte boostée
- Monétisation (commission sur cagnotte, abonnement, etc.)
- Pénalités progressives (5 €, puis 10 €, puis 20 €, etc.)

---

# 4. Architecture technique

## 4.1 Stack technologique

| Composant | Technologie |
|---|---|
| Application mobile | React Native + Expo + TypeScript |
| UI / Design system | NativeWind (Tailwind pour RN) + composants Tamagui ou React Native Paper |
| Navigation | Expo Router (file-based) |
| Gestion d'état | Zustand (état client) + React Query (cache serveur) |
| Formulaires | React Hook Form + Zod (validation) |
| Backend | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| Authentification | Supabase Auth (email/password + Google OAuth) |
| Notifications push | Expo Notifications |
| Stockage médias | Supabase Storage (photos de séances) |
| Tâches planifiées | Supabase Edge Functions + cron (clôture hebdo, notifications planifiées) |
| Intégration Strava | OAuth 2.0 + API Strava v3 |

## 4.2 Modèle de données (entités principales)

- `users` — profil utilisateur (lié à Supabase Auth)
- `groups` — groupes et leurs paramètres (durée, montant pénalité, règles)
- `group_members` — relation user/group avec rôle et objectif hebdo (verrouillé)
- `rule_acceptances` — acceptation des règles par chaque membre (horodatée)
- `sessions` — séances déclarées (type, durée, statut, semaine)
- `session_proofs` — preuves rattachées (photo, lien Strava, lien externe)
- `votes` — votes sur les séances et les excuses
- `excuses` — excuses déclarées (standard ou majeure)
- `penalties` — pénalités dues par un membre (séance manquée, blâme)
- `blames` — historique des blâmes par membre (basé sur séances rejetées)
- `pots` — cagnotte du groupe (montant total, statut)
- `pot_transactions` — mouvements de la cagnotte (ajout pénalité, paiement reçu)
- `weekly_plans` — planification optionnelle de la semaine par membre
- `notifications` — notifications envoyées et leur statut

---

# 5. Parcours utilisateur clés

## 5.1 Premier lancement

- Écran d'onboarding (3 slides max) présentant le concept
- Inscription email/password ou Google
- Création du profil (nom, photo)
- Choix : créer un groupe ou rejoindre un groupe existant

## 5.2 Création d'un groupe

- Définition du nom, description, photo du groupe
- Définition des dates du défi (début, fin)
- Définition du montant de pénalité (commun à tous)
- Configuration des règles (activités acceptées, durée min, délais, seuils)
- Génération d'un code à 6 chiffres, d'un lien et d'un QR code
- Partage des invitations (SMS, email, messageries)

## 5.3 Rejoindre un groupe

- Saisie du code, scan du QR ou ouverture du lien
- Affichage du récapitulatif complet des règles du défi
- Définition personnelle du nombre de séances hebdomadaires
- Avertissement explicite : ce nombre sera verrouillé pour toute la durée du défi
- Case à cocher d'acceptation des règles
- Accès au défi

## 5.4 Déclarer une séance

- Depuis l'écran principal du groupe, bouton « J'ai fait ma séance »
- Sélection du type d'activité
- Choix de la preuve : photo, Strava, lien externe
- Ajout d'un commentaire optionnel
- Publication immédiate, vote des autres déclenché

## 5.5 Voter sur une séance

- Notification push reçue lors de la publication
- Affichage de la séance et de sa preuve
- Bouton OUI / NON, commentaire optionnel
- Validation immédiate du vote

## 5.6 Déclarer une excuse

- Bouton « Déclarer une excuse » depuis l'écran du groupe
- Choix du type : excuse standard ou excuse majeure
- Saisie du motif et justificatif optionnel
- Notification envoyée aux autres membres pour vote

## 5.7 Fin de défi

- Notification de fin de défi avec montant final
- Affichage du classement final et des stats de chacun
- L'administrateur déclenche le déblocage de la cagnotte
- Saisie de l'événement utilisé (date, lieu)
- Proposition de relancer un défi avec les mêmes membres

---

# 6. Indicateurs de succès du MVP

## 6.1 Métriques d'engagement

- Taux de rétention à 7 jours, 30 jours, fin de défi
- Nombre moyen de séances publiées par membre par semaine
- Taux de complétion du défi (objectif atteint)
- Taux de participation au vote

## 6.2 Métriques produit

- Nombre de groupes créés
- Nombre moyen de membres par groupe
- Durée moyenne d'un défi
- Taux de relance d'un nouveau défi après un premier

## 6.3 Métriques qualitatives

- Sentiment utilisateur (NPS post-défi)
- Feedback sur les frictions UX (interviews utilisateurs)
- Taux de séances rejetées par vote (indicateur de fraude détectée)
- Nombre moyen de blâmes par membre

---

# 7. Estimation et planning

## 7.1 Phases de développement (estimation initiale)

| Phase | Description | Durée estimée | Livrable |
|---|---|---|---|
| Phase 0 | Setup projet, design system, modèle de données | 1 semaine | Squelette d'app |
| Phase 1 | Auth, profils, création/jonction de groupe, acceptation règles | 2 semaines | Onboarding complet |
| Phase 2 | Déclaration de séance, preuves (photo, Strava, lien) | 2 semaines | Cœur fonctionnel |
| Phase 3 | Système de vote, excuses (standard + majeure), blâmes | 1.5 semaine | Logique collective |
| Phase 4 | Cagnotte virtuelle, clôture hebdo, classement, jokers | 1 semaine | Cycle complet |
| Phase 5 | Notifications push, tâches planifiées | 1 semaine | Engagement |
| Phase 6 | Tests, corrections, polish UX, beta privée | 1.5 semaine | MVP livrable |
| **TOTAL** | De la première ligne de code à la beta utilisable | **~10 semaines** | App testable |

> Note : ces estimations supposent un développement à temps plein. Elles peuvent doubler ou tripler pour un projet en parallèle d'une autre activité. L'usage d'outils d'assistance au code (type Claude Code) peut réduire significativement ces délais.

> ⚠ Le découpage en phases utilisé pour le développement Claude Code est légèrement différent (8 phases, 0 à 7) — voir [PROJECT_STATUS.md](./PROJECT_STATUS.md).

---

# 8. Risques identifiés et mitigation

| Risque | Impact | Mitigation |
|---|---|---|
| Fraude sur les preuves (vieille photo recyclée) | Crédibilité du système | Photo prise dans l'app uniquement + timestamp + géoloc + vote collectif + système de blâmes |
| Abandon en cours de défi | Démotivation collective | Notifications de relance personnalisées + cagnotte non remboursée par défaut |
| Conflits dans les votes (tensions sociales) | Dégradation du lien amical | Règles claires définies en amont + vote public assumé + possibilité de jokers |
| Problématiques de cagnotte (gestion de l'argent réel) | Conformité bancaire / ACPR | V1 = cagnotte virtuelle, paiements gérés hors-app entre amis. V2 = intégration Mangopay/Stripe Connect avec audit conformité |
| Faible adoption initiale | Test concept invalidé | Beta fermée auprès de 3 à 5 groupes test avant ouverture publique |
| Coût de l'infrastructure Supabase | Budget hébergement | Le plan gratuit suffit pour la beta. Plan Pro (~25 $/mois) à partir de plusieurs centaines d'utilisateurs |
| Tension sur les excuses majeures (abus) | Détournement du système | Vote majoritaire + justificatif optionnel + régulation par le groupe + traçabilité |

---

# 9. Évolutions envisagées (post-MVP)

## 9.1 V2 — Enrichissement

- Intégration Apple Health et Google Fit
- Intégration Garmin Connect, Nike Run Club, Decathlon Coach
- Chat interne au groupe
- Système de badges et streaks (à la Duolingo)
- Pénalités progressives (escalade en cas de récidive)
- Modes « défi spécial » temporaires avec cagnotte boostée

## 9.2 V3 — Paiements réels

- Intégration Mangopay ou Stripe Connect
- Cagnotte avec dépôts réels
- Déblocage automatique en fin de défi
- Audit de conformité ACPR / DSP2

## 9.3 V4 — Monétisation

- Commission sur la cagnotte (~1 %)
- Plan Premium (statistiques avancées, jokers illimités, etc.)
- Partenariats avec salles de sport, applications sportives
- Classements inter-groupes et ligues compétitives

---

# 10. Annexes

## 10.1 Glossaire

- **Défi** — Période définie pendant laquelle un groupe s'engage sur des séances hebdomadaires
- **Séance** — Activité sportive effectuée par un membre, validée par les autres
- **Pénalité** — Montant dû à la cagnotte par un membre n'ayant pas respecté son objectif (montant unique défini par l'admin)
- **Blâme** — Sanction reçue à chaque séance rejetée par le vote. Au cumul de 3 (paramétrable), pénalité supplémentaire
- **Excuse standard** — Déclaration anticipée d'un empêchement réduisant l'objectif de 1 pour la semaine, soumise au vote majoritaire
- **Excuse majeure** — Cas exceptionnel (hospitalisation, blessure grave) permettant une remise à zéro de la semaine, soumise au vote majoritaire
- **Cagnotte** — Somme accumulée des pénalités, destinée à une activité collective de fin de défi
- **Joker** — Possibilité d'annuler une séance manquée sans pénalité (limité à 1 par mois)
- **MVP** — Minimum Viable Product, version minimale fonctionnelle pour tester le concept
- **PWA** — Progressive Web App, application web installable se comportant comme une app native

## 10.2 Choix techniques argumentés

### Pourquoi React Native plutôt que PWA ?

- Notifications push iOS plus fiables et naturelles
- Accès caméra optimal pour les preuves de séance
- Intégration OAuth Strava plus fluide
- Expérience utilisateur mobile native attendue par la cible

### Pourquoi Supabase plutôt qu'un backend custom ?

- Time-to-market drastiquement réduit (Auth, DB, Storage, Realtime out-of-the-box)
- Coût quasi nul pour la beta (plan gratuit généreux)
- PostgreSQL = base de données relationnelle robuste, facile à migrer plus tard
- Edge Functions pour les tâches planifiées (clôture hebdo, notifications)

### Pourquoi cagnotte virtuelle plutôt que paiements réels en V1 ?

- Évite les contraintes réglementaires (ACPR, DSP2, KYC)
- Valide le concept sans complexité supplémentaire
- Les utilisateurs s'arrangent entre amis via Revolut, Lydia, virement
- Permet d'observer les usages réels avant d'investir dans une solution de paiement

## 10.3 Historique des versions

| Version | Date | Modifications |
|---|---|---|
| V1.0 | Mai 2026 | Version initiale soumise à validation |
| V1.1 | Mai 2026 | Intégration des retours de Ben : verrouillage du nombre de séances, montant de pénalité commun défini par admin, simplification du contrat en case à cocher CGU, refonte du système de blâmes (sanction des séances rejetées), ajout des excuses majeures avec remise à zéro de la semaine, précision du mécanisme d'alimentation de la cagnotte |

— Fin du document —
