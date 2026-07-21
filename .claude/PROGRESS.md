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
| 9 | Cagnotte (trésorier) | ⬜ | — |
| 10 | Gestion des invitations (statuts, renvoyer/annuler) | ⬜ | — |
| 11 | Notifications | ⬜ | — |
| 12 | Fin de défi / Clôture | ⬜ | — |
| 13 | Profil (avatars, stats, mes groupes) ✅ · **Paramètres** encore pré-DA | 🔄 | [etape-08e-avatars-profil-suppression.md](reports/etape-08e-avatars-profil-suppression.md) |

## Notes transverses
- Convention rapports : un fichier par étape `.claude/reports/etape-NN-nom.md`.
- Vérifs avant clôture d'étape : `npx tsc --noEmit` ✅ + `jest` ✅.
- Commits faits par Romain (jamais en automatique).
- **SQL à jour attendu côté Supabase : jusqu'à `031_delete_account.sql`.**
