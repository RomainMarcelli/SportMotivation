# Known Issues — Bugs connus & dette technique

> Tout bug identifié, limitation acceptée ou dette technique se note ici, même si on ne le résout pas immédiatement.
>
> Format : description, impact, workaround actuel, plan de résolution.

---

## 2026-05-20 — Trigger de cagnotte bloqué par la RLS (création de groupe)

- **Description** : le trigger `create_pot_for_group()` (script SQL d'origine) insère dans `public.pots` mais n'était pas `SECURITY DEFINER`. La table `pots` ayant la RLS activée sans policy INSERT, la création de groupe échouait : `new row violates row-level security policy for table "pots"`.
- **Impact** : bloquant — impossible de créer un groupe.
- **Workaround / fix** : passer `create_pot_for_group()` en `SECURITY DEFINER` (cf. `supabase/sql/001_fix_pot_trigger_security_definer.sql`).
- **Leçon** : tout trigger qui écrit dans une table avec RLS activée doit être `SECURITY DEFINER` (comme `handle_new_user`).
- **Statut** : ✅ corrigé via `supabase/sql/001`.

---

## 2026-05-19 — `npm install` casse les libs natives Expo

- **Description** : utiliser `npm install <pkg>` pour des libs Expo (`expo-*`, `@react-native-*`) prend la dernière version du registry, souvent incompatible avec le SDK Expo en cours. Au runtime sur Expo Go : `AsyncStorageError: Native module is null` ou erreurs similaires.
- **Impact** : crash immédiat au démarrage de l'app.
- **Workaround actuel** : utiliser **`npx expo install <pkg>`** systématiquement pour tout ce qui touche au natif (`expo-*`, `@react-native-*`, `react-native-*`). Les libs purement JS (`zustand`, `zod`, `react-hook-form`, `@tanstack/react-query`, `@hookform/resolvers`) peuvent toujours s'installer via `npm install`.
- **Plan de résolution** : règle de discipline. `npx expo install --check` permet de détecter les mismatches sans modifier le projet.
- **Statut** : ✅ accepté (règle de workflow).

---

## 2026-05-19 — npm installs en parallèle écrasent package.json

- **Description** : lancer deux `npm install` en parallèle dans un même projet provoque une race condition où le second écrit un `package.json` sans les changements du premier.
- **Impact** : gênant, dépendances perdues silencieusement.
- **Workaround actuel** : toujours chaîner les installs (`&&` / `;`) plutôt que les lancer en parallèle.
- **Plan de résolution** : pas de bug à corriger, c'est un comportement npm standard. À retenir comme règle de discipline.
- **Statut** : ✅ accepté (règle de workflow).

---

## 2026-05-19 — 4 vulnérabilités moderate dans les deps npm

- **Description** : `npm install` initial signale 4 vulnérabilités de sévérité `moderate` dans l'arbre de dépendances.
- **Impact** : faible — vulnérabilités dans des libs transitives, non exploitables dans le contexte d'une app mobile en dev.
- **Workaround actuel** : aucun, on vit avec.
- **Plan de résolution** : surveiller `npm audit` à chaque ajout de dep. NE PAS lancer `npm audit fix --force` (risque de casser des versions). Si une faille devient `high` ou `critical`, traiter au cas par cas.
- **Statut** : 🟡 surveillé.

---

## Template d'entrée (à dupliquer quand un problème apparaît)

### YYYY-MM-DD — [Titre court du problème]

- **Description** : que se passe-t-il exactement ?
- **Impact** : qui/quoi est affecté, gravité (bloquant / gênant / cosmétique).
- **Workaround actuel** : ce qu'on fait pour vivre avec en attendant.
- **Plan de résolution** : ce qu'on prévoit de faire et quand.
- **Statut** : 🔴 ouvert · 🟡 en cours · ✅ résolu (avec date).
