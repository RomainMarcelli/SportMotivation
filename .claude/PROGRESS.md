# Sport Motiv — PROGRESS (tableau de bord)

Statut : ✅ fait · 🔄 en cours · ⬜ à faire
Rapports détaillés par étape dans `.claude/reports/`.

| # | Étape | Statut | Rapport |
|---|-------|--------|---------|
| 0 | Design system | ✅ | [etape-00-setup-da.md](reports/etape-00-setup-da.md) |
| 1 | Auth (onboarding, sign-in, **inscription en un écran** : photo/prénom/pseudo/e-mail/mdp) | ✅ | [etape-01-auth.md](reports/etape-01-auth.md) |
| 2 | ~~Setup profil post-inscription~~ → **fusionné dans l'inscription (Étape 1)**, `(setup)` supprimé | ✅ | [etape-02-setup.md](reports/etape-02-setup.md) *(superseded)* |
| 3 | Home (accueil = salutation + **Ma semaine**) + onglet **Groupes** adaptatif (0/1/2+) | ✅ | [etape-03-accueil.md](reports/etape-03-accueil.md) |
| 4 | Création & adhésion (create, join, join-confirm, scan, accept-invite) | ✅ | [etape-04-creation-adhesion.md](reports/etape-04-creation-adhesion.md) |
| 5 | Groupe dashboard (Infos/Séances, membres, classement, blâmes) | ✅ | [etape-05-groupe.md](reports/etape-05-groupe.md) |
| 6 | Déclarer une séance | ✅ | [etape-06-declarer.md](reports/etape-06-declarer.md) |
| 7 | Voter (scrutin séances : deck, vote, résolution) | ✅ | [etape-07-voter.md](reports/etape-07-voter.md) |
| 8 | Excuses (déclaration au vote du groupe + joker mensuel) | ✅ | [etape-08-excuses.md](reports/etape-08-excuses.md) |
| 9 | Cagnotte (trésorier) — **écran à créer** | ⬜ | — |
| 10 | Gestion des invitations (statuts, renvoyer/annuler) | ✅ | [etape-08c-notifications-quitter-filtres.md](reports/etape-08c-notifications-quitter-filtres.md) |
| 11 | Notifications in-app (liste à la DA) ✅ · temps réel / push ⬜ | 🔄 | [etape-08i-carrousel-notifs-regles.md](reports/etape-08i-carrousel-notifs-regles.md) |
| 12 | Fin de défi / Clôture — **2 écrans à créer** | ⬜ | — |
| 13 | Profil (avatars, stats, mes groupes) · **Paramètres** (notifs, mot de passe, e-mail, Strava, légal) | ✅ | [etape-13-parametres.md](reports/etape-13-parametres.md) |
| 14 | Séances partagées entre défis · Strava · Aide & légal · Groupes | ✅ | [etape-14-seances-partagees.md](reports/etape-14-seances-partagees.md) |
| 15 | Navigation, vote, Strava, invitations par pseudo, pénalités | ✅ | [etape-15-corrections-groupes.md](reports/etape-15-corrections-groupes.md) |
| 16 | Adhésion (fix), confidentialité, fiche séance, demandes admin, popup invit. | ✅ | [etape-16-adhesion-confidentialite.md](reports/etape-16-adhesion-confidentialite.md) |
| 17 | Sports (refus/vote), limite séances/jour, notifs de résultat, édition groupe DA | ✅ | [etape-17-sports-limite-notifs.md](reports/etape-17-sports-limite-notifs.md) |
| 18 | **Système d'amis** (ajouter en ami, inviter ses amis) | ⬜ | — |
| 19 | **Thème clair** — palette à valider (aucune maquette claire n'existe) | ⬜ | — |
| 20 | **Écran Statistiques** (séances/semaine, sport favori, cadence…) | ⬜ | — |

## Écrans restants (maquettes `maquette/V3/`)

| Maquette | Écran | État |
|---|---|---|
| `sport-motiv-cagnotte.html` | Cagnotte / vue trésorier | ⬜ à créer (Étape 9) |
| `sport-motiv-cloture.html` | Clôture du défi | ⬜ à créer (Étape 12) |
| `sport-motiv-fin-defi.html` | Bilan de fin de défi | ⬜ à créer (Étape 12) |
| `sport-motiv-parametres.html` | `app/settings.tsx` | ✅ fait |

Les 14 autres maquettes ont leur écran (`sport-motiv-maquettes.html` est l'index, pas un écran).
**3 écrans restants**, tous dépendants de la cagnotte (Étape 9).

## Notes transverses
- Convention rapports : un fichier par étape `.claude/reports/etape-NN-nom.md`.
- Vérifs avant clôture d'étape : `npx tsc --noEmit` ✅ + `jest` ✅.
- **Passe qualité (17b)** : couverture unitaire de **toute la logique pure** exportée
  (`features/`, `lib/`, `constants/`) — **464 tests / 58 suites** (pilotée par `jest --coverage`).
  Aucun code de prod modifié. Rapport [etape-17b-tests-et-couverture.md](reports/etape-17b-tests-et-couverture.md).
  Reste hors périmètre unitaire (convention) : hooks/queries/mutations à effets de bord.
- **Lot accueil/Strava/rappels (18b)** : « Ma semaine » superpose les séances réelles au planning ;
  historique borné au défi + filtre Jour/Semaine/Mois + scroll ; rappel week-end (SQL 045, pg_cron) ;
  page « Organiser l'accueil » (ordre des défis + infos affichées, **préférences locales**) ;
  commentaires de refus dans la fiche séance ; **Strava — erreur de connexion enfin visible**
  (connexion effective = déployer l'Edge Function `strava-token`) ; logo Strava ; icônes de réglages
  colorées. **479 tests / 59 suites**. Rapport [etape-18b-accueil-strava-rappels.md](reports/etape-18b-accueil-strava-rappels.md).
- Commits faits par Romain (jamais en automatique).
- **SQL à jour attendu côté Supabase : jusqu'à `045_weekly_reminder.sql`**
  (exécuter les fichiers d'enum **avant** ceux qui les utilisent : `038` avant 039, `042` avant 043/044).
  `045` (rappel week-end) **nécessite l'extension `pg_cron`** et s'exécute après 044.
- Décision produit : **inviter par pseudo est ouvert à tout membre** (SQL 040) ; seule la gestion
  des invitations (renvoyer/annuler) reste admin.
- **Étape 18 (amis) — nuance à retenir** : une fois le système d'amis en place, le mode **privé**
  (`users.is_searchable = false`) devra rester **trouvable par ses amis** (aujourd'hui privé =
  invisible pour tous dans la recherche). C'est la finalité du réglage confidentialité.
- **Demandé, à planifier** : système d'amis (Étape 18) — ajouter quelqu'un en ami puis l'inviter
  d'un geste depuis sa liste, au lieu de le rechercher par pseudo à chaque défi.
- **Demandé, à planifier** : écran Statistiques (Étape 20) — nb de séances/semaine, sport favori,
  cadence dans le temps, etc. Idée notée par Romain « pour plus tard ».
- **Question ouverte (Romain décide)** : envoyer une notification à l'auteur quand sa séance est
  validée / refusée par le groupe (types `session_validated` / `session_rejected` déjà dans l'enum,
  rien ne les crée encore). Mon avis dans le rapport d'étape 16.
