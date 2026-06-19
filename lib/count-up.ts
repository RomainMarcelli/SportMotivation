/**
 * Helpers purs pour l'animation de comptage (count-up). Pas d'import RN ici → testable
 * directement. Le composant `components/ui/CountUp.tsx` pilote la progression 0→1 et
 * affiche `countAt(to, p)`.
 */

/** Borne `t` dans [0, 1]. */
export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** Easing « ease-out cubic » (démarrage rapide, fin douce) — identique à la maquette. */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - clamp01(t), 3);
}

/** Valeur entière affichée à la progression `progress` (0→1) pour une cible `to`. */
export function countAt(to: number, progress: number): number {
  return Math.round(to * easeOutCubic(progress));
}
