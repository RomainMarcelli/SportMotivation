# 📚 Documentation du projet — Sport Motiv App

Arborescence et rôle de chaque fichier.

## 🟢 À la racine (critique, toujours à jour)

| Fichier | Rôle |
|---|---|
| [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) | 🎯 **Point d'entrée.** État global, phase en cours, % réalisé, blocages, métriques. |
| [`SPECIFICATIONS_MVP.md`](./SPECIFICATIONS_MVP.md) | Spec fonctionnelle complète V1.1 (référence métier). |
| [`DECISIONS.md`](./DECISIONS.md) | Journal des décisions techniques (stack, libs, contournements). |
| [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md) | Bugs connus, limitations acceptées, dette technique. |
| [`SETUP.md`](./SETUP.md) | Guide d'installation pour un nouveau dev. |

## 📦 Sous-dossiers

### `phases/`
Rapports de fin de phase, un fichier par phase terminée.

- [`PHASE_0_REPORT.md`](./phases/PHASE_0_REPORT.md) — Setup environnement & projet
- _Phase 1 Report — à venir_
- _Phase 2 Report — à venir_
- _...etc_

### `guides/`
Guides de configuration pour services externes ou setups spécifiques.

- [`GOOGLE_OAUTH_SETUP.md`](./guides/GOOGLE_OAUTH_SETUP.md) — Activer la connexion Google
- [`STORAGE_POLICIES.md`](./guides/STORAGE_POLICIES.md) — Policies RLS sur les buckets Supabase Storage
- _STRAVA_SETUP.md — à venir Phase 3_
- _EAS_BUILD.md — à venir Phase 7_

### `archives/`
Documents sources que je ne touche plus, conservés pour traçabilité.

- `Specifications_MVP_SportMotivationApp.docx` — V1.0 originale
- `Specifications_MVP_SportMotivationApp_V1.1.docx` — V1.1 (source de [`SPECIFICATIONS_MVP.md`](./SPECIFICATIONS_MVP.md))

### `architecture/` (à créer)
À créer en Phase 2+ quand les patterns se stabilisent.

- `ARCHITECTURE.md` — vue d'ensemble structurelle
- `DATABASE_SCHEMA.md` — schéma DB annoté

## 🚧 Hors `docs/` mais important

- [`.claude/`](../.claude/) — Skills Claude Code (à lire en début de chaque session)
- [`work-log/`](../work-log/) — Journal détaillé des modifs par phase (gitignoré, usage interne)
