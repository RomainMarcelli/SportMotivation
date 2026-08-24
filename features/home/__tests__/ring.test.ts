import { arcLength, arcPath, polarPoint, ringSegments } from "../ring";

describe("polarPoint", () => {
  // 0° = midi : l'anneau doit démarrer en haut, pas à 3 h comme le SVG par défaut.
  it("place 0° en haut du cercle", () => {
    const p = polarPoint(64, 64, 52, 0);
    expect(Math.round(p.x)).toBe(64);
    expect(Math.round(p.y)).toBe(12);
  });

  it("place 90° à droite", () => {
    const p = polarPoint(64, 64, 52, 90);
    expect(Math.round(p.x)).toBe(116);
    expect(Math.round(p.y)).toBe(64);
  });
});

describe("arcPath", () => {
  it("produit un chemin SVG d'arc", () => {
    expect(arcPath(64, 64, 52, 10, 80)).toMatch(/^M [\d.-]+ [\d.-]+ A 52 52 0 0 1 [\d.-]+ [\d.-]+$/);
  });

  it("marque le grand arc au-delà de 180°", () => {
    expect(arcPath(64, 64, 52, 0, 300)).toContain("A 52 52 0 1 1");
  });
});

describe("ringSegments", () => {
  it("crée une part par séance de l'objectif", () => {
    expect(ringSegments(4, 3)).toHaveLength(4);
  });

  it("remplit exactement les séances validées", () => {
    const segments = ringSegments(4, 3);
    expect(segments.map((s) => s.filled)).toEqual([true, true, true, false]);
  });

  it("ne déborde pas quand on dépasse son objectif", () => {
    expect(ringSegments(3, 7).every((s) => s.filled)).toBe(true);
  });

  it("ne remplit rien avec un compte négatif", () => {
    expect(ringSegments(3, -2).some((s) => s.filled)).toBe(false);
  });

  // Objectif à 0 : mieux vaut aucun segment qu'une division par zéro.
  it("renvoie une liste vide sans objectif", () => {
    expect(ringSegments(0, 0)).toEqual([]);
    expect(ringSegments(-4, 0)).toEqual([]);
  });

  // Au-delà d'une douzaine de parts, les arcs deviennent des points.
  it("plafonne le nombre de parts", () => {
    expect(ringSegments(40, 40)).toHaveLength(12);
  });

  it("réduit l'écart quand les parts sont nombreuses, pour ne pas manger l'arc", () => {
    // 12 parts × 20° d'écart = 240° d'espace : il ne resterait presque rien.
    const many = ringSegments(12, 12);
    expect(many).toHaveLength(12);
    expect(many.every((s) => s.d.length > 0)).toBe(true);
  });

  it("arrondit un objectif non entier", () => {
    expect(ringSegments(3.7, 1)).toHaveLength(3);
  });

  // La longueur sert à animer le tracé (strokeDashoffset) : elle doit être > 0
  // et suivre l'ouverture réelle de l'arc (une part sur 4 est plus longue qu'une sur 12).
  it("expose une longueur d'arc positive et décroissante avec le nombre de parts", () => {
    const four = ringSegments(4, 4)[0].length;
    const twelve = ringSegments(12, 12)[0].length;
    expect(four).toBeGreaterThan(0);
    expect(twelve).toBeGreaterThan(0);
    expect(four).toBeGreaterThan(twelve);
  });
});

describe("arcLength", () => {
  it("vaut le périmètre complet pour 360°", () => {
    expect(arcLength(52, 360)).toBeCloseTo(2 * Math.PI * 52, 5);
  });

  it("est proportionnelle à l'angle", () => {
    expect(arcLength(52, 90)).toBeCloseTo(arcLength(52, 45) * 2, 5);
  });

  it("traite un angle négatif comme son ouverture absolue", () => {
    expect(arcLength(52, -90)).toBeCloseTo(arcLength(52, 90), 5);
  });
});
