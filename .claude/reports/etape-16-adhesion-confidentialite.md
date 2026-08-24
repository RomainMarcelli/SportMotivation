# Étape 16 — Adhésion (fix critique), confidentialité, fiche séance, demandes admin

`npx tsc --noEmit` ✅ · `jest` **404/404** ✅ (50 suites, **+15 tests**). Aucun commit,
aucune commande git.

---

## ⚠️ SQL à exécuter — dans cet ordre

| Fichier | Rôle |
|---|---|
| [038_notification_types.sql](../../supabase/sql/038_notification_types.sql) | **D'abord** : 3 valeurs d'enum (fichier séparé, cf. piège des `ADD VALUE`) |
| [039_privacy_requests_fixes.sql](../../supabase/sql/039_privacy_requests_fixes.sql) | Fix adhésion, confidentialité, profil renvoyé, demandes à l'admin |
| [040_member_invites.sql](../../supabase/sql/040_member_invites.sql) | Inviter par pseudo ouvert à **tout membre** (décision produit) |

`038` **avant** `039` : PostgreSQL refuse d'utiliser une valeur d'enum ajoutée dans la même
transaction, et l'éditeur Supabase enveloppe un onglet dans une transaction.

---

## 🐛 Le bug critique : rejoindre par invitation était cassé

C'était **exactement le même bug que le 020**, dans l'autre fonction d'adhésion
(`accept_invitation`), au même endroit :

```sql
SELECT * INTO v_existing FROM group_members WHERE ...;   -- FOUND = adhésion existe ?
SELECT COUNT(*) INTO v_member_count FROM group_members;  -- ⚠ écrase FOUND (un COUNT
                                                         --   renvoie TOUJOURS une ligne)
IF FOUND THEN UPDATE ... WHERE id = v_existing.id;       -- v_existing.id = NULL → 0 ligne
ELSE INSERT ...;                                         -- ← jamais atteint
```

En PL/pgSQL, `FOUND` reflète la **dernière** requête. Après le `COUNT`, il est toujours vrai,
donc pour un nouveau membre on partait sur `UPDATE ... WHERE id = NULL` → **aucune adhésion
créée**. La fonction renvoyait quand même l'id du groupe : le client affichait « tu as rejoint »,
l'admin recevait sa notif d'arrivée… et l'écran du défi répondait « groupe introuvable ou tu n'y
as pas accès » (la RLS ne voyait aucune adhésion). Rejoindre **par code** marchait — c'est la
fonction corrigée par le 020.

**Deux conséquences que tu décrivais, une seule cause :**
- « groupe introuvable » à l'ouverture du défi après une invitation ;
- retomber sur « rejoins un défi » à l'accueil — normal, tu n'étais membre de rien.

**Correctif** : mémoriser l'existence dans `v_is_member` **avant** le `COUNT`. Et un **rattrapage**
(§1.b) remet en attente les invitations « acceptées » qui n'ont jamais créé d'adhésion, sinon les
joueurs concernés resteraient coincés (invitation soldée, mais pas membres).

## 🖼️ Avatar choisi à l'inscription : couleur/icône ignorées

Une photo passait, une **couleur + icône** non : il fallait aller dans « Modifier mon profil »
pour les voir apparaître. La requête « mon profil » part dès que la session existe — donc **avant**
l'écriture du profil. Invalider le cache ne l'annule pas : la réponse d'origine (avatar vide)
arrivait après et **écrasait** tout, et le `staleTime` empêchait un nouveau chargement. La photo
échappait au piège parce que son envoi au stockage laissait le temps à la 1ʳᵉ requête de retomber.

`upsert_my_profile` **v3** renvoie désormais la ligne écrite ; le client la **pose** directement
dans le cache (`setQueryData`) au lieu de la redemander. Plus de course, quel que soit le réseau.

## 🔒 Profil public / privé

Nouveau `users.is_searchable` (**public par défaut** — une recherche où personne n'est trouvable
passerait pour cassée). En privé, on **n'apparaît plus dans la recherche par @** ; le code, le lien
et le QR d'un défi continuent de fonctionner. Réglage proposé **à l'inscription**
([PrivacyToggleCard](../../components/profile/PrivacyToggleCard.tsx), avec bulle d'explication
« ? ») **et** dans les Paramètres → section Confidentialité. La fonction SQL de recherche filtre
elle-même sur ce drapeau : un profil privé ne peut pas fuir par cette porte.

## 📇 Fiche d'une séance (clic depuis l'onglet Séances)

[SessionDetailSheet](../../components/sessions/SessionDetailSheet.tsx), en **lecture seule** (une
séance publiée est un engagement) : sport, durée, date, **preuve en grand** (photo agrandissable +
lieu/heure de capture, résumé Strava, ou lien), **vote du groupe détaillé** (qui a validé / refusé,
en croisant les votes avec les membres — la table `votes` ne laisse pas joindre les profils), et
les **autres défis** où la séance compte aussi (`shared_id`).

## 🔔 Demandes à l'admin (deux impasses débloquées)

Jusqu'ici, un joueur qui avait fait un sport hors liste, ou qui découvrait que le défi n'accepte
que « le jour même », n'avait **aucune issue** que renoncer.

| Cas | Côté joueur | Côté admin |
|---|---|---|
| Sport absent de la liste | Bouton « Prévenir l'admin » de l'avertissement (déjà là) → **fonctionne** | Notification **« Ajouter “rando” »** en **1 tap** (`add_group_activity`, idempotent) ; le demandeur est prévenu |
| Défi en « le jour même » | Encart + bouton **« Demander à l'admin d'assouplir »** sous la date | Notification → ouvre **« Modifier le défi »** (une règle vaut pour tout le monde, pas de tap magique) |

Anti-spam côté SQL : une demande par sujet et par joueur sur 7 jours. L'état « Sport ajouté »
survit au rechargement (on lit les activités réelles du défi, pas un drapeau local).

## 📨 Popup d'invitation (fin de l'ancienne page hors DA)

Le bouton « Inviter » du haut du groupe ouvrait `/group/[id]/invite`, **restée aux couleurs par
défaut** (bleu, bordures grises). Remplacée par [GroupInviteSheet](../../components/groups/GroupInviteSheet.tsx),
un panneau à la DA, en deux temps : **recherche par pseudo** d'abord (le geste courant), puis
code + QR + lien repliés, puis un accès **« Invitations envoyées »**. Le même panneau sert au
bouton du haut, à l'entrée du menu ⋮ et au raccourci de l'onglet Infos ; un non-admin n'y voit que
le bloc code/QR/lien. Ancienne page **supprimée**, `InviteSheet` devenu inutile **supprimé** aussi.

**Inviter est désormais ouvert à tout membre** (décision produit), pas seulement à l'admin : le
verrou « admin » sur la recherche par pseudo ne protégeait rien, puisqu'un membre peut déjà faire
entrer quelqu'un en partageant le code (le join par code ne demande aucune validation). On aligne
donc la recherche sur le code. L'invité doit toujours **accepter** ; seule la **gestion** des
invitations envoyées (renvoyer/annuler) reste admin. L'état « Invité » d'un membre s'appuie sur une
lecture directe de `group_invitations` (sa RLS autorise les membres), pas sur la RPC admin
`get_group_invitations`. SQL : [040_member_invites.sql](../../supabase/sql/040_member_invites.sql).

Au passage : le **cadre blanc** du champ de recherche sur le web
([web-input.ts](../../lib/web-input.ts) : neutralise l'`outline` du navigateur sans retirer notre
propre état focus), et l'input qui **se vide + reprend le focus** après chaque invitation.

## 🎯 Détails DA

- **Anneau de l'accueil** : chaque part validée se **trace** maintenant d'un bout à l'autre
  (`strokeDashoffset`) au lieu d'apparaître en fondu — c'est le fondu d'opacité qui donnait ce
  clignotement. Fond gris toujours présent pour que l'anneau ne « manque » jamais de matière.
- **Durées** : au-delà de l'heure, `1h10` / `2h05` au lieu de `70 min` / `125 min`
  ([formatDuration](../../lib/duration.ts)), partout (accueil, séances, vote, Strava).
- **« J'ai lu et j'accepte »** : la case est **centrée** verticalement (elle paraissait trop haute
  sur une phrase d'une ligne).

## 💬 Ta question — notifier l'auteur quand sa séance est validée / refusée

Tu m'as demandé mon avis **sans que je change quoi que ce soit** : je n'ai rien touché.

**Je le ferais, oui — mais seulement pour le résultat *final*, pas à chaque vote.** L'auteur a un
enjeu direct (pénalité ou pas) : lui cacher l'issue reviendrait à masquer une décision prise à son
sujet. En revanche, une notif *par vote entrant* serait du harcèlement, et prévenir « refusée »
avant la fin du délai serait faux (un dernier votant peut renverser). Le bon déclencheur, c'est la
**résolution** de la séance (`resolve_session`, quand le scrutin se ferme) → une notif
`session_validated` / `session_rejected`. Les deux types existent déjà dans l'enum, il ne manque
que leur création. Je le rattacherais à l'Étape 9 (cagnotte), parce que « refusée » et « pénalité
appliquée » se décident au même endroit. **Dis-moi si tu veux que je le fasse.**

---

## Tests ajoutés (+15)

| Fichier | Couvre |
|---|---|
| [duration.test.ts](../../lib/__tests__/duration.test.ts) | `formatDuration` : min < 1 h, `1h`, `1h05`, `2h`, valeurs nulles/négatives/décimales (+8) |
| [ring.test.ts](../../features/home/__tests__/ring.test.ts) | `arcLength` + longueur d'arc exposée par `ringSegments` (+4) |
| [privacy.test.ts](../../features/settings/__tests__/privacy.test.ts) | défaut public, libellés, lecture tolérante d'un profil indéterminé (+2) |
| [requests.test.ts](../../features/groups/__tests__/requests.test.ts) | `mapRequestError` (+1) |

## Fichiers touchés (principaux)

- **SQL / types** : `supabase/sql/038_*.sql`, `supabase/sql/039_*.sql`, `types/database.types.ts`
- **Adhésion / avatar** : `features/auth/profile-mutations.ts`, `app/(auth)/sign-up.tsx`
- **Confidentialité** : `features/settings/privacy.ts`, `components/profile/PrivacyToggleCard.tsx`,
  `app/settings.tsx`
- **Fiche séance** : `components/sessions/SessionDetailSheet.tsx`, `components/ui/BottomSheet.tsx`,
  `features/sessions/queries.ts`, `app/group/[id]/index.tsx`
- **Demandes admin** : `features/groups/requests.ts`, `app/group/[id]/declare.tsx`,
  `app/notifications.tsx`
- **Invitations** : `components/groups/GroupInviteSheet.tsx`, `components/groups/InviteByHandle.tsx`,
  `components/ui/TextField.tsx`, `lib/web-input.ts` · *(supprimés : `app/group/[id]/invite.tsx`,
  `components/groups/InviteSheet.tsx`)*
- **DA** : `components/home/ChallengeHero.tsx`, `features/home/ring.ts`, `lib/duration.ts`,
  `components/ui/CheckCard.tsx`, `components/home/RecentSessions.tsx`, `app/group/[id]/vote.tsx`

## Test rapide (après 038 puis 039)

1. **Invitation** : A invite B par pseudo → B accepte via la notif → B **ouvre bien le défi**, et
   son accueil ne montre plus « rejoins un défi ».
2. **Avatar** : nouveau compte avec une **couleur + icône** non par défaut → visibles **direct**.
3. **Confidentialité** : passe B en privé (Paramètres) → A ne le trouve plus par @ ; le code marche.
4. **Fiche séance** : onglet Séances → clic sur une séance → durée en `1h10`, preuve, votes.
5. **Sport hors liste** : déclare « padel » → « Prévenir l'admin » → l'admin a **« Ajouter padel »**.
6. **« Le jour même »** : sur un défi same_day, la date montre l'encart + « Demander à l'admin ».
7. **Popup invitation** : bouton « Inviter » → panneau DA, champ sans cadre blanc, se vide après envoi.
