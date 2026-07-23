# Étape 13 — Page Paramètres à la DA + fonctions du compte

`npx tsc --noEmit` ✅ · `jest` **376/376** ✅ (46 suites, **+44 tests**). Aucun commit,
aucune commande git.

---

## ⚠️ SQL à exécuter

| Fichier | Rôle |
|---|---|
| [035_notification_prefs.sql](../../supabase/sql/035_notification_prefs.sql) | Préférences de notification + filtre à la source |

Après 030 → 034. **Dépend de 033** (valeur d'enum `member_left`).

---

## 1. L'écran

Refait entièrement d'après `sport-motiv-parametres.html` — c'était le dernier écran en fond
blanc. Carte de profil cliquable en tête, puis **Compte · Notifications · Apparence · Langue &
région · Aide & légal**, et en bas déconnexion / suppression / version.

Deux composants nés ici :

- [Toggle.tsx](../../components/ui/Toggle.tsx) — l'interrupteur de la maquette, écrit à la main.
  Le `Switch` de React Native prend l'apparence du système : bleu sur iOS, vert sur Android,
  **case à cocher sur le web**. Il n'aurait été juste sur aucune des trois.
- `SegmentedControl` accepte un segment `disabled` (pour « Clair », cf. §6).

## 2. 🔔 Notifications : les 5 réglages, filtrés **à la source**

Les préférences vivent dans `users.notification_prefs` (jsonb) et sont appliquées par un
**trigger `BEFORE INSERT` sur `notifications`** : une notification refusée n'est jamais créée.

> **Pourquoi un trigger** — une douzaine de fonctions insèrent dans `notifications`
> (invitations, votes, excuses, arrivées, départs, transfert d'admin…). Les reprendre une par
> une, c'était douze occasions de casser une fonction qui marche, et chaque notification écrite
> plus tard aurait oublié le filtre. Le trigger couvre tout ce qui existe **et** ce qui viendra.

**Ce qui n'est jamais filtrable** : invitation reçue, résultat du vote sur *ta* séance ou *ton*
excuse, pénalité appliquée, demande de changement de pénalité. Ce ne sont pas des notifications
d'ambiance — les couper reviendrait à cacher à quelqu'un une décision prise à son sujet.

Deux catégories agissent **dès maintenant** (« Votes à donner », « Activité du groupe »). Les
trois autres — rappels de séance, récap du dimanche, fin de défi — attendent un planificateur
côté serveur ; leur réglage est enregistré et sera honoré le jour où elles existeront. Le
sous-titre le dit : *« … · dès leur mise en service »*.

Bascule **optimiste** : l'interrupteur bouge tout de suite et revient en arrière si le serveur
refuse — un interrupteur qui « colle » une demi-seconde donne l'impression d'un bug.

## 3. 🔑 Mot de passe

Nouvel écran `/account/password`. Supabase n'exige **pas** l'ancien mot de passe pour
`updateUser` : une session ouverte suffit. On le demande quand même **et on le vérifie** —
sinon un téléphone déverrouillé laissé sur une table suffit à se faire voler son compte.

Jauge de robustesse, confirmation, et refus explicite de reprendre le mot de passe actuel (sinon
l'écran annonce « modifié » alors que rien n'a bougé). Messages d'erreur traduits, pas de
« une erreur est survenue ».

## 4. ✉️ Adresse e-mail

Nouvel écran `/account/email`. L'écran se termine sur un **accusé de demande**, pas sur une
confirmation de changement : tant que le lien envoyé à la nouvelle adresse n'est pas ouvert, la
connexion se fait toujours avec l'ancienne. Annoncer « adresse modifiée » ici, c'était promettre
une déconnexion incompréhensible au prochain lancement.

## 5. 🏃 Strava enfin **mémorisé**

Le code OAuth existait mais le jeton ne vivait que dans l'état d'un composant : il fallait
reconnecter Strava **à chaque déclaration de séance**. Désormais la session est conservée
(jeton, jeton de rafraîchissement, expiration, athlète) et **rafraîchie automatiquement** quand
elle expire, via l'Edge Function `strava-token` (qui supportait déjà `action: "refresh"`).

- Paramètres → pastille verte « Connecté · Romain M. », toucher pour déconnecter.
- Déclarer une séance → les activités se chargent **directement**, sans repasser par Strava.

> ⚠ Stockage en clair (AsyncStorage), pas dans le trousseau : ce jeton n'ouvre qu'un accès **en
> lecture** aux activités et expire en quelques heures. Le jour où on y met autre chose, passer à
> `expo-secure-store` — qui n'existe pas sur le web, il faudra un repli.

## 6. 🎨 Thème : le clair n'est pas encore peint

Tu as demandé de l'implémenter. C'est un chantier à part entière, et il est **bloqué sur une
décision qui t'appartient** :

- **593 usages de couleurs en dur** répartis dans **58 fichiers** (`colors.ink`, `colors.surface`…
  dans des styles en ligne, qui ne changent pas tout seuls) ;
- `AppBackground` (les halos corail/ambre) est dessiné en dur ;
- **et surtout : il n'existe aucune maquette claire.** Inventer une palette claire sans référence
  irait contre ta règle « l'UI vient à 100 % des maquettes ».

En attendant, « Clair » et « Auto » sont **visibles mais désactivés**, avec une phrase qui
l'explique. Un bouton qui ne fait rien vaut mieux qu'un écran à moitié cassé.

**Prochaine étape proposée** : je te fabrique une proposition de palette claire (fond, surfaces,
lignes, corail/ambre retravaillés pour rester lisibles sur clair), tu la valides, puis je repeins
les 58 fichiers en une passe.

## 7. Réduire les animations

Nouveau `lib/motion-store.ts` + hook `useAppReducedMotion()`, substitué à `useReducedMotion()` de
Reanimated dans les **10 composants animés**. Le réglage **s'ajoute** à celui du système : on peut
couper les animations dans l'app sans les couper partout sur son téléphone. L'inverse est
impossible — si l'appareil demande de les réduire, c'est un choix d'accessibilité, l'app n'a pas
à passer outre.

## 8. Ce que j'ai retiré de la maquette, et pourquoi

| Ligne | Décision |
|---|---|
| **Langue** | Affichée en lecture seule (« Français »). L'app n'est pas traduite : un sélecteur ne changerait rien. |
| **Fuseau horaire** | Lecture seule, **détecté** sur l'appareil. Le changer supposerait de recalculer les semaines côté serveur. |
| **Confidentialité du profil** | Retirée : la notion n'existe pas en base. La visibilité est déjà « membres du groupe » et rien d'autre. |
| **Exporter mes données** | Retirée à ta demande. |

## 9. Aide & légal

Un seul écran paramétré `/legal/[doc]` pour les trois documents — même forme, trois fichiers
auraient été trois fois le même code. **Centre d'aide** (6 questions réelles sur le
fonctionnement des défis), **Conditions d'utilisation**, **Politique de confidentialité**.

> Les deux textes légaux portent un **bandeau ambre « texte provisoire »**. Ils sont écrits pour
> que l'app soit navigable, pas relus par un juriste : à remplacer avant toute mise en ligne.
> Le point le plus sensible y est déjà dit — *Sport Motiv n'encaisse, ne détient et ne transfère
> aucune somme d'argent*.

« Contacter le support » ouvre un mail **pré-rempli** avec la version, l'appareil et le pseudo :
les trois informations qu'on redemande systématiquement et que personne ne donne spontanément.
Adresse dans `SUPPORT_EMAIL` (`features/settings/support.ts`), une seule ligne à changer.

---

## Tests ajoutés (+44)

| Fichier | Couvre |
|---|---|
| [notification-prefs.test.ts](../../features/settings/__tests__/notification-prefs.test.ts) | colonne absente / nulle / corrompue, clés inconnues, seul `false` coupe, résumé et pluriels |
| [strava-session.test.ts](../../features/settings/__tests__/strava-session.test.ts) | stockage corrompu, session sans athlète, expiration (marge de 2 min, date inconnue = périmée), abréviation du nom |
| [support.test.ts](../../features/settings/__tests__/support.test.ts) | `mailto` encodé, corps pré-rempli, champs facultatifs, `Europe/Paris → Paris` |
| [security.test.ts](../../features/auth/__tests__/security.test.ts) | schémas mot de passe / e-mail, refus du même mot de passe, traduction des erreurs Supabase |
| BottomNav | `/account/*` et `/legal/*` gardent l'onglet Profil allumé |

## Fichiers touchés

- **Écrans** : `app/settings.tsx` (réécrit), `app/account/{_layout,password,email}.tsx`,
  `app/legal/{_layout,[doc]}.tsx`, `app/_layout.tsx`
- **Features** : `features/settings/{notification-prefs,strava-session,support}.ts`,
  `features/auth/security.ts`
- **UI** : `components/ui/{Toggle,SegmentedControl,BottomNav}.tsx`,
  `components/sessions/StravaProofPicker.tsx`
- **Lib** : `lib/{motion-store,strava}.ts`, `hooks/useAppReducedMotion.ts` + 10 composants animés
- **SQL / types** : `supabase/sql/035_notification_prefs.sql`, `types/database.types.ts`

## Test rapide

1. Exécuter **035**, puis `npx expo start --web --clear`.
2. Profil → Paramètres : la carte du haut ouvre la modification du profil.
3. Couper « Activité du groupe », puis faire rejoindre un 2ᵉ compte → **aucune notification**
   n'arrive. La réactiver → elle revient.
4. Mot de passe : saisir un mauvais mot de passe actuel → « Mot de passe actuel incorrect. »
5. « Réduire les animations » → les entrées d'écran ne glissent plus.
6. Strava (si configuré) : connecter, quitter l'app, revenir → toujours « Connecté », et la
   déclaration de séance charge les activités sans redemander l'autorisation.

## Restant

- **Thème clair** : palette à valider (§6).
- Cagnotte, Fin de défi, Clôture : **Étape 9** d'abord.
- ⚠ Avant la prod : `DROP FUNCTION IF EXISTS public.dev_reset_excuse_joker(UUID);` et remplacer
  les textes légaux provisoires.
