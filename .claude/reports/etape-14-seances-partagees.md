# Étape 14 — Une séance, plusieurs défis · Strava · Aide & légal · Groupes

`npx tsc --noEmit` ✅ · `jest` **384/384** ✅ (47 suites, **+8 tests**). Aucun commit,
aucune commande git.

---

## ⚠️ SQL à exécuter

| Fichier | Rôle |
|---|---|
| [036_shared_sessions.sql](../../supabase/sql/036_shared_sessions.sql) | Séances partagées entre défis + notification de déclaration |

Après 035. **Dépend de 006, 017, 018.**

---

## 1. 🐛 Personne n'était prévenu d'une séance déclarée

Confirmé : la notification `vote_pending_session` **n'existait nulle part**. Le type était
déclaré dans l'énumération, la page Notifications savait l'afficher, et aucune ligne de SQL ne
la créait. Les excuses en envoyaient une (SQL 024), pas les séances. Personne ne savait qu'il
avait quelque chose à voter — sauf à ouvrir le groupe par hasard.

## 2. 🔗 Une séance réelle = une séance dans tous tes défis

### Le modèle

Une ligne `sessions` **par défi**, reliées par un nouveau `shared_id`.

> L'alternative — une seule ligne + table de liaison — aurait obligé à réécrire tout ce qui lit
> `sessions.group_id` : tableau de bord, statistiques de la semaine, historique, pénalités,
> classement. Ici **la lecture ne change pas d'un octet** ; seuls la déclaration, le vote et les
> notifications évoluent.

### Ce que ça donne

| | Comportement |
|---|---|
| **Déclaration** | La séance part dans **tous** tes défis en cours (choix validé : pas de filtre sur les règles, c'est le vote qui tranche). La preuve suit — chaque défi voit la photo. |
| **Notification** | **Une seule par personne**, même si elle partage 3 défis avec toi. |
| **Vote** | Un seul vote. Il est recopié dans tous les défis que le votant partage avec l'auteur. |
| **Résultat** | **Chaque défi tranche avec ses membres et son seuil.** Un membre du Défi de l'été n'a pas à décider pour la Team Muscu, dont il n'est pas. |

### Le texte des notifications

- **Un seul défi en commun** → *« Paul a déclaré une séance de 45 min le 21/07 dans « Défi de
  l'été ». Donne ton vote. »*
- **Plusieurs** → *« Paul a déclaré une séance de 45 min le 21/07. Elle compte dans 2 de tes
  défis : un seul vote suffit pour tous. »*

La notification est rattachée à **un défi dont le destinataire est réellement membre** — sinon
le bouton « Voter » aurait ouvert un groupe où il n'a rien à faire.

### Deux garde-fous ajoutés

- `notify_session_declared` vérifie que l'appelant est **l'auteur** : la fonction est
  `SECURITY DEFINER`, sans ce contrôle n'importe qui pouvait notifier au nom de n'importe qui ;
- elle est **idempotente** (une séance ne prévient qu'une fois), tout comme la recopie — une
  reprise après coupure réseau ne crée pas de doublon.

### Côté écran

Nouveau [SharedGroupsNote.tsx](../../components/sessions/SharedGroupsNote.tsx) sur « Déclarer une
séance » : la liste des défis concernés, leur objectif, et la phrase qui évite la mauvaise
surprise — *« chaque défi vote de son côté : elle peut être validée dans l'un et refusée dans
l'autre »*. Masqué quand il n'y a qu'un défi. Le message de succès compte : *« Séance envoyée au
vote dans 2 défis »*.

## 3. 🏃 Strava

- **Popup de confirmation** après l'autorisation — on revenait de Strava sans savoir si ça avait
  marché.
- La ligne des Paramètres **change de rôle** une fois connectée : elle mène à un
  [écran Strava](../../app/account/strava.tsx) qui liste les **dernières activités**, avec le nom
  du compte, un bouton rafraîchir et la déconnexion.
- Un jeton révoqué côté Strava (401) est nommé — *« Strava a révoqué l'autorisation »* — au lieu
  d'une liste vide qui ressemble à « tu n'as rien couru ».
- Dans « Déclarer une séance », le sélecteur charge maintenant les activités **directement** si
  le compte est déjà connecté (la session est mémorisée depuis l'étape précédente).

## 4. 📖 Aide & légal, refaits

- **Centre d'aide** → **questions repliées**. On ouvre celle qui nous concerne, chevron qui
  pivote, icône colorée par thème. Deux questions ajoutées : la déclaration multi-défis et les
  moyens de prouver une séance.
- **CGU / Confidentialité** → carte **« L'ESSENTIEL »** en tête (3 points), puis des articles
  numérotés avec tuile d'icône, interligne 21 px et alternance de teintes corail/ambre/menthe.
- **Temps de lecture** annoncé en haut : « 2 min de lecture » désamorce l'effet mur.
- Le bandeau « texte provisoire » reste sur les deux documents juridiques.

## 5. Paramètres

- **Contacter le support** → grisé, badge « Bientôt » (le mailing viendra plus tard). Le
  générateur de `mailto` reste écrit et testé, prêt à rebrancher.
- **Supprimer mon compte** → un lien rouge nu au milieu de la page se cliquait par accident.
  C'est maintenant une **zone dangereuse** encadrée : titre, ce qui est détruit, ce qui est
  conservé (les sommes dues), puis un bouton bordé rouge.

## 6. Un seul défi → il s'ouvre directement

L'onglet Groupes ouvre le défi quand c'est le seul — une liste d'un élément n'ajoutait qu'un
clic.

> Cette redirection avait déjà été tentée puis **retirée** parce qu'elle cassait la navigation :
> le défi affichait une flèche de retour qui renvoyait à l'onglet, lequel rouvrait le défi. Cette
> fois le défi est ouvert avec un paramètre `solo` et **masque sa flèche** — la barre du bas
> suffit à en sortir.

Et comme « Créer » / « Rejoindre » vivaient sur cet onglet, ils sont ajoutés au **menu ⋮ du
défi**, dans une section « UN AUTRE DÉFI » séparée par un filet.

---

## Tests ajoutés (+8)

| Fichier | Couvre |
|---|---|
| [legal.test.ts](../../constants/__tests__/legal.test.ts) | document inconnu / vide, bandeau provisoire maintenu sur les textes juridiques, chaque section a titre + corps + icône, la clause « n'encaisse pas d'argent » est présente, temps de lecture crédible |

## Fichiers touchés

- **SQL / types** : `supabase/sql/036_shared_sessions.sql`, `types/database.types.ts`
- **Séances** : `features/sessions/mutations.ts`, `features/votes/mutations.ts`,
  `components/sessions/{SharedGroupsNote,StravaProofPicker}.tsx`, `app/group/[id]/declare.tsx`
- **Strava** : `app/account/strava.tsx`, `app/settings.tsx`
- **Aide & légal** : `constants/legal.ts`, `app/legal/[doc].tsx`
- **Groupes** : `app/(tabs)/groups.tsx`, `app/group/[id]/index.tsx`

## Test rapide

1. Exécuter **036**, puis `npx expo start --web --clear`.
2. Avec un 2ᵉ compte membre du **même** défi : déclarer une séance → il reçoit
   « Séance à valider » et le bouton « Voter » fonctionne.
3. Avec **2 défis en commun** : déclarer → le 2ᵉ compte reçoit **une seule** notification
   (« … dans 2 de tes défis »), et voter une fois fait disparaître la séance des deux decks.
4. Avec **1 seul défi** : l'onglet Groupes ouvre le défi sans flèche de retour ; le menu ⋮
   propose « Créer un défi » et « Rejoindre un défi ».
5. Paramètres → Strava : connecter → popup, puis la liste des dernières activités.
6. Paramètres → Centre d'aide : les questions se déplient une par une.

## Restant

- **Thème clair** : palette à valider (aucune maquette claire n'existe).
- Cagnotte, Fin de défi, Clôture : **Étape 9** d'abord.
- Notifications de **résultat** de séance (`session_validated` / `session_rejected`) : le type
  existe dans l'énumération, rien ne le crée encore — à faire avec l'Étape 9, quand le résultat
  aura des conséquences à annoncer.
- ⚠ Avant la prod : `DROP FUNCTION IF EXISTS public.dev_reset_excuse_joker(UUID);` et remplacer
  les textes légaux provisoires.
