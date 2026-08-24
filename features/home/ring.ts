/**
 * Géométrie de l'anneau de progression de l'accueil (pure, testable).
 *
 * L'anneau n'est PAS une jauge continue : il est découpé en autant de parts que
 * l'objectif hebdomadaire compte de séances (4 séances → 4 arcs), et chaque part
 * se remplit d'un coup. On lit sa semaine d'un coup d'œil, sans compter.
 */

export type RingSegment = {
  /** Chemin SVG de l'arc. */
  d: string;
  /** Séance déjà validée ? */
  filled: boolean;
  /** Index (sert au décalage d'animation). */
  index: number;
  /** Longueur de l'arc (px) — sert à animer le tracé via `strokeDashoffset`. */
  length: number;
};

/** Longueur d'un arc de rayon `r` couvrant `sweepDeg` degrés. */
export function arcLength(r: number, sweepDeg: number): number {
  return (Math.abs(sweepDeg) * Math.PI * r) / 180;
}

/** Point du cercle à un angle donné (0° = midi, sens horaire). */
export function polarPoint(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Arc SVG entre deux angles (degrés). */
export function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number
): string {
  const start = polarPoint(cx, cy, r, startDeg);
  const end = polarPoint(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${round(start.x)} ${round(start.y)} A ${r} ${r} 0 ${largeArc} 1 ${round(end.x)} ${round(end.y)}`;
}

/**
 * Découpe l'anneau en `total` parts séparées par un espace (`gapDeg`).
 *
 * `total = 0` (aucun objectif) renvoie une liste vide : mieux vaut un anneau nu
 * qu'une division par zéro.
 * `total` est plafonné : au-delà d'une douzaine de parts, les arcs deviennent
 * des points et l'anneau devient illisible.
 */
export function ringSegments(
  total: number,
  done: number,
  { cx = 64, cy = 64, r = 52, gapDeg = 20, maxSegments = 12 } = {}
): RingSegment[] {
  const count = Math.min(Math.max(0, Math.floor(total)), maxSegments);
  if (count === 0) return [];

  // Avec beaucoup de parts, un écart de 20° mangerait tout l'arc.
  const gap = Math.min(gapDeg, 240 / count);
  const slice = 360 / count;
  const filledCount = Math.min(Math.max(0, Math.floor(done)), count);
  const sweep = slice - gap;

  return Array.from({ length: count }, (_, i) => ({
    d: arcPath(cx, cy, r, i * slice + gap / 2, (i + 1) * slice - gap / 2),
    filled: i < filledCount,
    index: i,
    length: arcLength(r, sweep),
  }));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
