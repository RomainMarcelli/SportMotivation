# Workflow de développement - Skill

## Description
Règles de workflow et de communication entre Claude Code et l'utilisateur (Romain) pendant le développement du projet Sport Motivation App.

## Quand utiliser ce skill
À chaque interaction. Définit comment Claude Code doit communiquer, documenter et avancer.

## Principes fondamentaux

### 1. Avancer phase par phase
Le projet est découpé en **7 phases**. Ne JAMAIS sauter une phase ou en faire plusieurs simultanément.

| Phase | Objet |
|---|---|
| 0 | Setup environnement & projet |
| 1 | Authentification et profil |
| 2 | Création et gestion des groupes |
| 3 | Déclaration de séance et preuves |
| 4 | Système de vote, excuses, blâmes |
| 5 | Cagnotte et clôture hebdomadaire |
| 6 | Notifications push |
| 7 | Polish et tests |

### 2. Toujours attendre validation
À chaque étape importante : présenter ce qui va être fait, attendre le OK de Romain avant d'exécuter. Ne pas tout générer d'un coup.

### 3. Documentation continue
**À chaque fin de phase**, mettre à jour :
- `docs/PROJECT_STATUS.md` (état global)
- Créer un `docs/PHASE_X_REPORT.md` (compte-rendu détaillé de la phase)
- Mettre à jour `docs/DECISIONS.md` si des choix techniques importants ont été faits
- Mettre à jour `docs/KNOWN_ISSUES.md` si des bugs/limitations sont identifiés

**Pendant le développement** : si une décision importante est prise (choix d'une lib, contournement d'un bug, refactoring), l'ajouter immédiatement à `DECISIONS.md`.

### 4. Communication claire avec Romain

Romain n'est pas développeur professionnel. Donc :

- **Expliquer avant d'agir** : décrire ce qui va être fait et pourquoi
- **Détailler les étapes manuelles** : "ouvre Supabase Dashboard → Settings → API → copie l'URL"
- **Donner des commandes exactes** : pas de "lance la commande de migration", écrire la commande complète
- **Anticiper les erreurs** : "si tu vois ce message, c'est normal, fais X"
- **Tester ensemble** : à chaque fin de phase, donner un scénario de test concret

### 5. Format des messages de fin de phase

À chaque fin de phase, fournir :

1. **Résumé** : ce qui a été fait
2. **Fichiers créés/modifiés** : liste claire
3. **Comment tester** : étapes pour valider que ça fonctionne
4. **Points de vigilance** : ce qui pourrait casser
5. **Prochaine phase** : ce qui sera fait ensuite (sans le faire)
6. **Demande de validation** : "Tu valides ? Je passe à la phase X ?"

### 6. Gestion Git

- **Commit à chaque fin de phase** avec message clair :
  - Format : `[Phase X] Description courte`
  - Exemple : `[Phase 1] Authentification complète (email + Google)`
- **Commits intermédiaires** dans une phase si ça a du sens (genre auth séparée du profil)
- **Branche** : `main` pour le code stable, créer des branches feature uniquement si Romain le demande
- **Ne JAMAIS commit** : `.env`, `node_modules`, fichiers de build, clés API

### 7. Comptes-rendus en Markdown

Créer/mettre à jour des fichiers `.md` régulièrement pour matérialiser l'avancement :

- **PROJECT_STATUS.md** : tableau de bord global (phase en cours, % réalisé, blocages)
- **PHASE_X_REPORT.md** : un fichier par phase terminée, avec :
  - Objectifs initiaux
  - Ce qui a été fait
  - Difficultés rencontrées
  - Solutions adoptées
  - Captures d'écran si pertinent (décrire les écrans si pas de capture)
  - Métriques (nombre de fichiers, lignes de code, etc.)
- **DECISIONS.md** : journal des décisions techniques avec date et justification
- **KNOWN_ISSUES.md** : bugs connus, contournements en place, dette technique

### 8. Anticiper les questions de Romain

Romain peut demander à tout moment :
- "Où on en est ?" → renvoyer vers `PROJECT_STATUS.md`
- "Pourquoi on a fait X comme ça ?" → renvoyer vers `DECISIONS.md`
- "Qu'est-ce qui reste à faire ?" → renvoyer vers `PROJECT_STATUS.md`
- "Comment ça marche [feature] ?" → renvoyer vers le `PHASE_X_REPORT.md` correspondant

Garder ces docs à jour permet de répondre vite et bien.

### 9. Quand quelque chose ne va pas

Si une erreur survient ou un blocage :
- **Ne pas masquer** : expliquer clairement le problème à Romain
- **Proposer des options** : ne pas trancher seul sur des choix structurants
- **Documenter dans KNOWN_ISSUES.md** si le problème n'est pas résolu immédiatement

### 10. Style des messages

- **Tu** plutôt que vous, ton amical mais professionnel
- **Markdown** pour la lisibilité (gras, listes, tableaux)
- **Émojis avec parcimonie** : ✅ ❌ ⚠️ 🚀 sont utiles, le reste est souvent du bruit
- **Pas de jargon non expliqué** : si Claude Code utilise un terme technique, il l'explique
