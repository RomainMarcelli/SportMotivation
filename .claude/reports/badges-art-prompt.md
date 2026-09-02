# Prompt de génération des badges — SportMotiv

But : générer un **jeu cohérent de 14 badges/trophées** (illustrations) pour remplacer les
icônes lucide actuelles. À copier tel quel dans une IA d'image (Midjourney, DALL·E,
Ideogram, Flux…). Génère‑les **dans la même session / avec la même seed** pour garder la
cohérence de série. **Aucun texte dans l'image.**

---

## 1) Direction artistique commune (à mettre en tête de CHAQUE prompt)

```
Jeu de badges de récompense pour une app mobile de sport entre amis, style medallion
moderne, semi‑3D « glossy », vue de face, emblème centré. Fond TRANSPARENT (PNG) ou
fond sombre chaud uni (#1B140D). Éclairage doux du haut, légers reflets, ombre portée
subtile, matière type émail/verre lisse avec un fin liseré métallique. Formes rondes,
géométrie nette, épaisses, lisibles à petite taille (48 px). Style illustratif chaleureux,
premium mais ludique, cohérent d'un badge à l'autre. PAS de texte, PAS de lettres, PAS de
chiffres. Carré 1:1, 1024×1024, centré, marge autour de l'emblème.

Palette (à respecter strictement) :
- Corail   #FF6A45  (énergie, action)
- Ambre    #FFB23E  (or, séries, récompense)
- Menthe   #5FE0A8  (réussite, défi)
- Crème    #FFEEDD  (highlights)
- Fond     #1B140D  (chaud très sombre)
Dégradé de marque : corail → ambre pour les accents.
```

Puis, pour chaque badge, ajouter le bloc « CONCEPT » ci‑dessous.

---

## 2) Badges — SÉANCES (accent CORAIL)

Progression de l'effort ; motif fil rouge : l'haltère / le mouvement, de plus en plus « puissant ».

1. **sessions_1 — « Premiers pas »** (1 séance)
   CONCEPT : petit haltère corail stylisé, halo léger, ambiance « départ / première fois ».
   Doux, encourageant. Accent corail sur fond sombre.

2. **sessions_10 — « Habitué »** (10 séances)
   CONCEPT : haltère corail plus affirmé, entouré d'un anneau de progression, petites
   étincelles de régularité. Sensation d'habitude installée.

3. **sessions_50 — « Machine »** (50 séances)
   CONCEPT : haltère traversé d'un éclair (énergie), effet « moteur/puissance », accents
   corail + reflets crème. Dynamique, rapide.

4. **sessions_100 — « Centurion »** (100 séances)
   CONCEPT : médaille laurée dorée (ambre) avec un haltère gravé au centre, ruban, prestige
   du cap des 100. Accent AMBRE (montée en gamme vs les corail précédents).

---

## 3) Badges — SÉRIES (accent AMBRE → CORAIL, la flamme monte)

Motif fil rouge : la **flamme**, de plus en plus intense au fil des semaines.

5. **streak_2 — « Première flamme »** (2 semaines)
   CONCEPT : petite flamme ambre unique, propre et vive, socle rond. Naissance de la série.

6. **streak_4 — « Régulier »** (4 semaines)
   CONCEPT : flamme ambre plus haute avec un anneau/orbite marquant la régularité, base stable.

7. **streak_8 — « En feu »** (8 semaines)
   CONCEPT : double flamme ambre vigoureuse, braises, sensation de chaleur qui s'installe.

8. **streak_12 — « Inarrêtable »** (12 semaines)
   CONCEPT : flamme corail‑ambre puissante en mouvement, traînée dynamique, élan
   « impossible à arrêter ». Bascule vers l'accent CORAIL.

9. **streak_26 — « Légende »** (26 semaines)
   CONCEPT : flamme entourée d'éclats/étincelles scintillantes (type « sparkles »), aura
   légendaire, corail + éclats crème. Rare et précieux.

10. **streak_52 — « Une année de feu »** (52 semaines)
    CONCEPT : grande flamme ambre couronnée d'une étoile, anneau orbital complet
    (symbole de l'année), le sommet de la série. Le plus spectaculaire des séries.

---

## 4) Badges — DÉFIS (accent MENTHE, sauf Champion en AMBRE/or)

Fin de défi ; motifs : trophée, médaille de perfection, bouclier, couronne.

11. **challenge_first — « Premier défi »** (terminer un 1er défi)
    CONCEPT : trophée coupe menthe simple et chaleureux, petit socle, ambiance « première
    victoire collective ». Accent MENTHE.

12. **challenge_perfect — « Défi parfait »** (100 % des objectifs hebdo)
    CONCEPT : médaille/rosette menthe avec une coche parfaite au centre, rayons de
    perfection, propreté irréprochable. Accent MENTHE.

13. **challenge_flawless — « Intouchable »** (0 pénalité)
    CONCEPT : bouclier menthe brillant avec une coche/étincelle, sensation de protection
    sans faille, surface lisse « intouchée ». Accent MENTHE.

14. **challenge_champion — « Champion »** (1er au classement)
    CONCEPT : couronne dorée (ambre) posée sur un socle/coussin, éclats de victoire,
    prestige maximal. Accent AMBRE/or (se distingue des 3 défis en menthe).

---

## 5) Conseils de production

- Générer les **14 dans la même passe** (même style/seed) pour l'homogénéité de la série.
- Fournir en **PNG transparent** si possible ; sinon fond `#1B140D` uni (l'app est sombre).
- Livrer chaque fichier nommé par sa **clé** (`sessions_1.png`, `streak_2.png`,
  `challenge_champion.png`…) : ces clés correspondent au catalogue `constants/badges.ts`.
- Cible d'affichage : rond, ~42–66 px dans la modale de célébration et l'écran Trophées →
  la lisibilité à petite taille prime sur le détail fin.
- Une fois les images prêtes : on les branchera via le champ `icon`/`image` du catalogue
  (l'architecture est déjà prévue pour remplacer l'icône lucide par une illustration).
