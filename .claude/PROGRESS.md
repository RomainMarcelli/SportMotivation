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
| 7 | Voter | ⬜ | — |
| 8 | Excuses | ⬜ | — |
| 9 | Cagnotte (trésorier) | ⬜ | — |
| 10 | Gestion des invitations (statuts, renvoyer/annuler) | ⬜ | — |
| 11 | Notifications | ⬜ | — |
| 12 | Fin de défi / Clôture | ⬜ | — |
| 13 | Profil & Paramètres (thème verrouillé sur Sombre) | ⬜ | — |

## Notes transverses
- Convention rapports : un fichier par étape `.claude/reports/etape-NN-nom.md`.
- Vérifs avant clôture d'étape : `npx tsc --noEmit` ✅ + `jest` ✅.
- Commits faits par Romain (jamais en automatique).
