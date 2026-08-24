# Étape 12 — Fin de défi : bilan + clôture (déblocage de la cagnotte)

Les **2 derniers écrans de maquette** (`sport-motiv-fin-defi.html` + `sport-motiv-cloture.html`) et
le **déblocage de la cagnotte**. C'est la dernière brique « argent » : la cagnotte se remplit
pendant le défi (clôtures 047 + blâmes 048) et se **débloque** à la fin, ici.

Front fidèle aux maquettes, **animations très présentes** (demande produit), backend minimal
côté serveur (le bilan est calculé côté client).

---

## ⚠️ SQL à exécuter — après 048

| Fichier | Rôle |
|---|---|
| [049_challenge_end.sql](../../supabase/sql/049_challenge_end.sql) | `unlock_pot` (déblocage admin) + `complete_expired_challenges` (bascule `active → completed`) + cron quotidien. Idempotent. |

**Tests manuels**
- `SELECT public.complete_expired_challenges();` → clôture les défis échus (exécutable tel quel).
- Déblocage : **depuis l'app**, bouton « Débloquer la cagnotte » en tant qu'admin (la RPC
  `unlock_pot` s'appuie sur `auth.uid()`, donc un test SQL brut renvoie `NOT_MEMBER`, attendu).

---

## Le parcours

1. **Le défi se termine** — soit le cron `complete-challenges` bascule `groups.status` à
   `completed` (le lendemain de l'échéance), soit l'écran le détecte côté client
   (`challenge_end` dépassée). Le dashboard affiche alors une **bannière « Défi terminé »** et
   son CTA de pied devient **« Voir le bilan du défi »**.
2. **Écran `fin-defi` (bilan)** — podium (top 3), classement complet (assiduité + € versés),
   « Ton bilan » chiffré, et la **cagnotte finale** avec le bouton **Débloquer** (admin/trésorier).
3. **`unlock_pot`** — passe `pots.status = 'unlocked'` + `unlocked_at`, puis navigue vers…
4. **Écran `cloture` (célébration)** — confettis, trophée qui « pop », grand montant dégradé qui
   monte, récap (semaines / séances / membres) et « qui a rempli la cagnotte ».

## Le bilan est 100 % côté client (pas de RPC de reporting)

Toute la synthèse est calculée à partir de données **déjà chargées** ailleurs
(`useGroupMembers`, `useGroupSessions`, `usePotHistory`) via un module pur et testé
[`features/challenge-end/report.ts`](../../features/challenge-end/report.ts) :

- **classement** par taux d'assiduité (juste quand les objectifs diffèrent entre membres),
- **taux** = validées / (objectif × semaines), borné 0→100,
- **meilleure série** = plus longue suite de semaines consécutives à l'objectif,
- **contributions** = ventilation des pénalités par membre (séances manquées / blâmes).

**Pourquoi pas une RPC** : je ne peux pas exécuter/tester le SQL ici ; garder le reporting en TS
pur (25 tests) évite une RPC non vérifiable, et l'écran fonctionne même avant que 046–048 soient
passés (il dégrade proprement à « aucune pénalité »). Le serveur ne porte que l'**action**
irréversible (déblocage) et la bascule d'état.

## Backend (SQL 049)

- `unlock_pot(p_group_id)` — **admin/trésorier**, défi **terminé** requis, **idempotent** (rappelé
  sur une cagnotte déjà débloquée → renvoie l'horodatage existant). Bascule aussi le groupe en
  `completed` par cohérence. Erreurs en codes courts (`NOT_MEMBER`, `NOT_ADMIN`,
  `CHALLENGE_NOT_ENDED`, `NO_POT`) mappés côté app.
- `complete_expired_challenges()` + cron quotidien — `active → completed` dès l'échéance
  strictement dépassée. **DST-safe** (comparaison de dates en heure de Paris ; le cron tourne UTC).

## Animations (demande produit — « c'est très important »)

- **Confettis** ([`Confetti.tsx`](../../components/ui/Confetti.tsx)) — pluie Reanimated au premier
  plan de la clôture, chaque pièce avec position/couleur/durée/délai aléatoires.
- **Grand nombre dégradé** ([`GradientNumber.tsx`](../../components/ui/GradientNumber.tsx)) — texte
  SVG rempli d'un dégradé coral→amber (pas de `background-clip:text` en RN, pas de masked-view
  installé), qui **compte de 0 à la valeur**.
- **« Pop »** ([`PopIn.tsx`](../../components/ui/PopIn.tsx)) — le trophée grossit avec un léger
  rebond (`Easing.back`).
- **Podium qui se dresse** — les marches montent en hauteur, échelonnées (la 1ᵉ en dernier).
- **Révélations échelonnées** (`Reveal`) section par section + **compteurs** (`CountUp`) sur toutes
  les stats.
- **Tout** respecte `prefers-reduced-motion` (réglage système **ou** Paramètres) : état final
  immédiat, confettis non rendus.

## Fichiers

**Créés** — `features/challenge-end/report.ts` (+ tests), `features/challenge-end/mutations.ts`,
`components/ui/Confetti.tsx`, `components/ui/GradientNumber.tsx`, `components/ui/PopIn.tsx`,
`app/group/[id]/fin-defi.tsx`, `app/group/[id]/cloture.tsx`, `supabase/sql/049_challenge_end.sql`.

**Modifiés** — `features/groups/queries.ts` (`usePotStatus`), `app/group/[id]/_layout.tsx` (routes),
`app/group/[id]/index.tsx` (détection « défi terminé » + entrée bilan).

## À noter / suites

- **Déblocage = irréversible** côté produit (pas de « re-verrouiller ») : cohérent avec l'idée que
  la cagnotte part en sortie de groupe. `unlock_pot` reste idempotent (re-clic sans effet).
- **« Organiser la sortie »** (clôture) mène à la **cagnotte** (suivi des règlements) : il n'existe
  pas de maquette d'un flux de dépense (`pots.usage_date`/`usage_description`) — à créer plus tard
  si besoin.
- **Semaine finale partielle** : si un défi se termine en milieu de semaine, la dernière semaine
  n'est pas « clôturée » par 047 (qui tourne le lundi suivant, hors période). Le déblocage
  fige le total du pot tel quel. Edge case assumé (forward-only), à traiter avec la résolution à
  l'échéance si on veut être exhaustif.
