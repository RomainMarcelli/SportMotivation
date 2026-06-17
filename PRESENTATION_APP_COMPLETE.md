# Sport Motivation App — Présentation complète

## Introduction

Sport Motivation App est une application mobile dédiée à la motivation sportive entre amis. Elle s'adresse à des groupes d'amis qui souhaitent maintenir une pratique sportive régulière en s'appuyant sur le pouvoir de l'engagement collectif et un système de pénalités financières ludiques. L'idée est née d'un constat simple : il est difficile de se motiver seul à faire du sport régulièrement, mais quand on s'engage devant ses amis avec un enjeu concret, on tient bien mieux ses objectifs.

L'application transforme la routine sportive en un défi de groupe avec une dimension financière qui rend chaque séance manquée concrète, et une récompense collective qui valorise les efforts en fin de défi.

## Le concept en quelques mots

Des amis se réunissent autour d'un défi sportif d'une durée définie, par exemple trois mois, du 30 mai au 30 août. Chaque membre du groupe s'engage personnellement sur un nombre de séances de sport à effectuer chaque semaine, ce nombre lui est propre et reste fixé pour toute la durée du défi. Si un membre ne respecte pas son objectif hebdomadaire, il doit verser une pénalité en euros, dont le montant a été défini par l'administrateur du groupe à la création, dans une cagnotte commune virtuelle. À la fin du défi, cette cagnotte est débloquée pour financer une activité collective : un restaurant, un weekend, une sortie, ce que le groupe décide ensemble.

L'application s'appuie sur trois leviers psychologiques puissants : l'engagement social, où l'on s'engage publiquement devant ses amis, la perte financière qui est scientifiquement plus motivante que le gain, et la récompense collective qui transforme l'effort individuel en plaisir partagé.

## Les fonctionnalités principales

### Création et gestion des groupes

N'importe quel utilisateur peut créer un groupe sportif. Le créateur devient automatiquement administrateur et peut désigner d'autres administrateurs s'il le souhaite. Un groupe peut compter jusqu'à dix membres et un utilisateur peut appartenir à plusieurs groupes en parallèle, à ses risques et périls puisqu'il devra tenir ses engagements dans chacun.

Pour inviter ses amis, trois méthodes sont proposées : un code à six chiffres généré automatiquement, un lien d'invitation qui ouvre directement l'application, et un QR code à scanner. Une page de suivi permet à l'administrateur de voir où en sont ses invitations : en attente, acceptées, refusées ou expirées.

### Configuration du défi

À la création du groupe, l'administrateur définit les paramètres communs à tous les membres : la durée du défi avec une date de début et de fin, le montant de la pénalité par séance manquée qui s'applique uniformément à tous, les activités sportives acceptées comme la course, la musculation, le vélo, le yoga ou la natation, la durée minimum d'une séance pour qu'elle soit considérée valide, les délais de publication et de vote, et le seuil de blâmes avant pénalité supplémentaire.

Chaque membre, à son entrée dans le groupe, définit lui-même son nombre de séances hebdomadaires. C'est un point important du concept : ce nombre est verrouillé pour toute la durée du défi une fois validé, impossible d'en changer en cours de route. Cela évite les ajustements stratégiques quand quelqu'un voit qu'il va perdre.

### Acceptation des règles

Avant d'entrer dans un groupe, chaque membre consulte un récapitulatif clair des règles du défi : les dates, le montant des pénalités, les activités acceptées, les modalités de publication et de vote, le fonctionnement des excuses et des blâmes. Il valide via une case à cocher unique, comme des conditions générales d'utilisation, dont l'acceptation est horodatée en base de données avec un snapshot des règles acceptées pour traçabilité.

### Cycle hebdomadaire

La semaine va du lundi minuit au dimanche vingt-trois heures cinquante-neuf. En début de semaine, chaque membre peut optionnellement planifier les jours où il prévoit de faire du sport, ce qui déclenche des notifications de rappel personnalisées si une séance planifiée n'est pas publiée à temps.

À la clôture du dimanche vingt-trois heures cinquante-neuf, un traitement automatique se déclenche pour chaque groupe : il compte les séances validées de chaque membre, compare avec son objectif hebdomadaire, et pour chaque séance manquante, crée automatiquement une pénalité qui s'ajoute à la cagnotte commune. Chaque membre concerné reçoit une notification détaillée, et un récapitulatif hebdomadaire est envoyé à tout le groupe.

### Déclaration et preuves de séance

Quand un membre fait une séance de sport, il la déclare dans l'application. Il saisit le type d'activité, la durée, peut ajouter un commentaire, et doit fournir une preuve. Trois types de preuves sont acceptés.

La première est une photo prise obligatoirement avec la caméra de l'application, jamais depuis la galerie. Cette contrainte est volontaire pour empêcher la fraude : on enregistre automatiquement l'horodatage et la géolocalisation dans les métadonnées.

La deuxième est l'intégration Strava via OAuth. Le membre connecte son compte Strava une fois, puis peut sélectionner une activité récente. L'application récupère automatiquement la distance, la durée, le type et la carte du parcours. C'est idéal pour la course, le vélo, la randonnée ou la natation.

La troisième est le lien externe pour les autres applications, où le membre colle un lien d'une activité publique, ajoute obligatoirement une capture d'écran et une description.

### Système de vote

Une fois une séance publiée, les autres membres du groupe votent pour la valider ou la rejeter. Le vote est public, chacun voit qui a voté quoi. Le membre auteur de la séance ne vote pas sur sa propre publication, évidemment. La règle de validation est simple : majorité simple des votants. Plus de oui que de non, la séance est validée. Plus de non, elle est rejetée et le membre devra refaire une séance. En cas d'égalité, la séance est validée au bénéfice du doute. Si personne ne vote dans le délai imparti, le vote est considéré comme positif par défaut.

### Système de blâmes

Le système de blâmes existe pour décourager la fraude. Chaque séance rejetée par le vote du groupe entraîne un blâme pour son auteur. Au cumul de trois blâmes, ce seuil étant paramétrable par l'administrateur, le membre paie une pénalité supplémentaire à la cagnotte, d'un montant égal à celui d'une séance manquée. Après paiement, le compteur est remis à zéro. Les blâmes se cumulent sur toute la durée du défi.

L'objectif est clair : pousser les membres à proposer de vraies séances honnêtes dès la première publication, et limiter les tentatives comme présenter une balade de quinze minutes comme une séance de sport.

### Système d'excuses

L'application prévoit deux niveaux d'excuses pour gérer les imprévus de la vie.

L'excuse standard concerne les empêchements ponctuels comme une grosse gastro, un déplacement professionnel imprévu, une contrainte particulière. Le membre déclare son excuse avec un motif obligatoire, et les autres membres votent à la majorité simple. Si elle est acceptée, son objectif hebdomadaire est réduit d'une séance pour cette semaine uniquement. La semaine suivante, l'objectif initial reprend ses droits.

L'excuse majeure est réservée aux cas réellement exceptionnels : hospitalisation, blessure grave, événement familial majeur. Le membre déclare l'excuse avec un motif obligatoire et un justificatif optionnel. Si elle est acceptée par vote majoritaire, toutes les séances de la semaine sont annulées, aucune pénalité possible. La philosophie est volontairement stricte : une simple maladie bénigne ou des vacances ne constituent pas une excuse valable par défaut, c'est au membre de s'organiser.

### Cagnotte commune

La cagnotte centralise tout l'aspect financier du défi. Pour la version actuelle de l'application, elle est virtuelle : elle affiche le montant total cumulé en temps réel, le détail de qui doit combien, et l'historique de toutes les pénalités avec leur motif. Un trésorier désigné par l'administrateur coche manuellement les paiements reçus quand les membres règlent leur dû entre eux, via Revolut, Lydia ou virement bancaire selon leurs préférences.

À la fin du défi, l'administrateur déclenche le déblocage. Les membres définissent collectivement la date et le type d'utilisation de la cagnotte. Si un membre quitte le groupe en cours de route, sa contribution reste dans la cagnotte par défaut, mais l'administrateur peut exceptionnellement choisir de la rembourser.

L'intégration de paiements réels est prévue pour une version ultérieure de l'application.

### Classement et gamification

Un classement intra-groupe affiche en temps réel le nombre de séances réussies et le taux de réussite de chaque membre. Un système de jokers est également disponible : chaque membre dispose d'un joker mensuel lui permettant d'annuler une séance manquée sans pénalité ni vote, à utiliser avec parcimonie.

### Notifications push

L'application envoie des notifications push pour maintenir l'engagement : rappel personnalisé si une séance planifiée n'est pas publiée, récapitulatif dominical avec les séances restantes et les votes en attente, notification quand une nouvelle séance attend votre vote, notification quand une excuse attend votre vote, notification de réception d'un blâme, notification quand un membre rejoint le groupe, rappel à sept jours de la fin du défi, et notification de clôture du défi avec le montant final de la cagnotte.

## Les pages et écrans de l'application

L'application est structurée autour de plusieurs écrans clés.

L'**écran d'onboarding** présente le concept en trois slides à la première ouverture.

L'**écran d'inscription et de connexion** propose deux méthodes : email avec mot de passe, ou connexion via Google.

L'**écran de création de profil** permet de renseigner son prénom, son nom, son pseudo et sa photo de profil.

L'**écran d'accueil** affiche le nom et le pseudo de l'utilisateur en haut, ses groupes actifs, et permet de créer un nouveau groupe ou d'en rejoindre un.

L'**écran de profil** permet de modifier ses informations personnelles, gérer son avatar, se déconnecter et supprimer son compte si besoin. On y accède en cliquant sur son nom depuis l'accueil.

L'**écran de création de groupe** guide l'administrateur dans la définition de tous les paramètres du défi, génère automatiquement le code, le lien et le QR code d'invitation.

L'**écran de jonction d'un groupe** permet de rejoindre un groupe par code, lien ou scan de QR code, affiche le récapitulatif des règles, permet de définir son nombre de séances hebdomadaires et de valider l'acceptation des règles.

L'**écran principal d'un groupe** présente le dashboard avec deux onglets, Infos et Séances. L'onglet Infos affiche les détails du défi, les membres avec leurs rôles, et les actions administratives. L'onglet Séances affiche le feed des séances publiées par tous les membres.

L'**écran de déclaration d'une séance** permet de choisir le type d'activité, la durée, la date, d'ajouter un commentaire et de fournir une preuve via photo, Strava ou lien externe.

L'**écran de vote sur une séance** affiche la séance avec sa preuve et permet de voter oui ou non avec un commentaire optionnel.

L'**écran de déclaration d'excuse** permet de choisir entre excuse standard et excuse majeure, de saisir le motif et un justificatif optionnel.

L'**écran de cagnotte** affiche le montant total en temps réel, le détail par membre, l'historique des pénalités et la vue trésorier pour cocher les paiements reçus.

L'**écran de gestion des invitations** permet à l'administrateur de voir le statut de chaque invitation envoyée et de renvoyer ou annuler les invitations en attente.

L'**écran des notifications** centralise toutes les notifications avec la possibilité de les supprimer une par une via un swipe ou de tout effacer en une fois.

L'**écran de paramètres** regroupe la gestion du compte, les préférences de notifications, l'apparence en mode clair, sombre ou automatique, les préférences de langue et fuseau horaire, la confidentialité et données, les informations légales, le contact support et la déconnexion.

L'**écran de fin de défi** s'affiche à la clôture, présente le classement final, les statistiques de chacun et permet à l'administrateur de débloquer la cagnotte et au groupe de relancer un nouveau défi.

## La technologie utilisée

L'application est développée avec une stack technique moderne et éprouvée, adaptée à un développement mobile multiplateforme.

Côté application mobile, le langage principal est **TypeScript**, qui apporte la sécurité du typage statique à JavaScript. Le framework utilisé est **React Native** combiné avec **Expo**, qui permet de développer une seule fois pour iOS et Android. La navigation est gérée par **Expo Router** en mode file-based, l'interface utilisateur par **NativeWind** qui adapte Tailwind CSS pour React Native, la gestion d'état par **Zustand** pour l'état client et **TanStack Query** pour le cache des données serveur, les formulaires par **React Hook Form** avec validation **Zod**, et les icônes par **Lucide React Native**.

Côté backend, tout repose sur **Supabase**, une plateforme open source basée sur **PostgreSQL** qui offre une base de données relationnelle robuste, un système d'authentification complet avec email/password et Google OAuth, un service de stockage de fichiers pour les photos, des capacités de temps réel pour les mises à jour live, et des Edge Functions pour les tâches planifiées comme la clôture hebdomadaire automatique.

Les intégrations externes comprennent **l'API Strava** via OAuth 2.0 pour récupérer les activités sportives, et **Expo Notifications** pour les notifications push sur iOS et Android.

La base de données comporte quatorze tables principales gérant les utilisateurs, les groupes, les membres, les acceptations de règles, les séances, les preuves de séance, les votes, les excuses, les pénalités, les blâmes, les cagnottes, les transactions de cagnotte, les planifications hebdomadaires et les notifications. La sécurité est assurée par Row Level Security activée sur toutes les tables, garantissant qu'un utilisateur ne peut voir que les données des groupes auxquels il appartient.

## Direction artistique

L'application adopte une direction artistique chaleureuse et conviviale, pensée pour refléter l'esprit de défi entre amis sans tomber dans le look intimidant des applications sportives hardcore. La palette se compose d'un fond crème chaud apaisant, d'accents corail vifs pour les actions principales, et d'une teinte ambre pour les éléments liés à la cagnotte, évoquant la valeur. L'interface privilégie les coins arrondis, les espacements généreux, et une typographie lisible. Le mode sombre est supporté.

## Roadmap du projet

Le développement suit un plan en sept phases successives. Les premières phases couvrent la mise en place de l'environnement, l'authentification et les profils, la création et gestion des groupes, la déclaration de séances avec les preuves. Les phases suivantes ajoutent le système de vote complet avec excuses et blâmes, la cagnotte et la clôture hebdomadaire automatique, les notifications push, et enfin une phase finale de polish et de tests.

Au-delà de cette version initiale du MVP, plusieurs évolutions sont prévues. Une version intermédiaire enrichira l'application avec un chat interne au groupe, des intégrations avec Apple Health, Google Fit, Garmin Connect, Nike Run Club et Decathlon Coach, un système de badges et de streaks à la manière de Duolingo, des pénalités progressives en cas de récidive, et des modes défi spécial avec cagnotte boostée. Une version ultérieure intégrera les paiements réels via Mangopay ou Stripe Connect, avec dépôts effectifs sur la cagnotte et déblocage automatique en fin de défi, ce qui implique un audit de conformité bancaire. Une version finale envisage la monétisation avec une commission sur la cagnotte, un plan premium avec statistiques avancées, des partenariats avec des salles de sport et des classements inter-groupes.

## Cible et positionnement

L'application vise principalement les groupes d'amis de deux à dix personnes souhaitant maintenir une routine sportive régulière, avec un usage majoritairement mobile sur iOS et Android. Le profil type est jeune actif sportif occasionnel, qui a du mal à tenir ses bonnes résolutions sportives et qui apprécie le côté ludique et social du défi entre potes.

Le positionnement se distingue clairement des applications de sport classiques comme Strava ou Nike Run Club, qui sont centrées sur la performance individuelle. Sport Motivation App n'est pas une application de tracking sportif, c'est une application de motivation collective qui utilise le sport comme prétexte au défi et à la convivialité. L'angle financier ludique, avec une vraie cagnotte qui finance une vraie sortie, distingue également l'application de simples trackers d'habitudes comme Habitica ou Streaks.

## Conclusion

Sport Motivation App répond à un besoin réel et universel : se motiver à faire du sport régulièrement. Elle le fait en transformant une obligation individuelle en jeu collectif, où l'effort de chacun nourrit le plaisir du groupe. Le système de pénalités virtuelles puis réelles ajoute juste assez d'enjeu pour que les engagements soient pris au sérieux, sans que cela devienne pesant. Et la récompense collective en fin de défi célèbre concrètement les efforts accomplis. C'est une application simple dans son concept, riche dans ses fonctionnalités, et conçue pour transformer durablement la pratique sportive de ses utilisateurs.
