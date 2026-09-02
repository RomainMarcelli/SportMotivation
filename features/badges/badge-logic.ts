import { BADGES, BADGE_CATEGORY_ORDER, type BadgeCategory, type BadgeDef } from "@/constants/badges";

/**
 * Logique de badges PURE (rendu / progression uniquement). L'attribution réelle est
 * faite côté serveur ; ici on décide seulement, pour l'ÉCRAN Trophées : quels badges
 * sont débloqués, et quelle progression afficher pour les autres.
 */

/** Contexte de progression : les compteurs « à jour » du membre. */
export type BadgeProgressContext = {
  /** Séances validées au total (tous défis). */
  validatedSessions: number;
  /** Meilleure série jamais atteinte (record, tous défis). */
  bestStreak: number;
};

export type BadgeProgress = { current: number; target: number; ratio: number };

/**
 * Progression numérique d'un badge (séances/série). `null` pour un badge de défi,
 * dont la condition n'est pas un simple compteur (débloqué ou non, sans jauge).
 */
export function badgeProgress(badge: BadgeDef, ctx: BadgeProgressContext): BadgeProgress | null {
  if (badge.threshold == null) return null;
  const current =
    badge.category === "sessions"
      ? ctx.validatedSessions
      : badge.category === "streak"
        ? ctx.bestStreak
        : 0;
  const target = badge.threshold;
  const ratio = target > 0 ? Math.min(1, current / target) : 0;
  return { current: Math.min(current, target), target, ratio };
}

export type BadgeView = BadgeDef & {
  unlocked: boolean;
  unlockedAt: string | null;
  progress: BadgeProgress | null;
};

/**
 * Construit la liste des badges pour l'écran Trophées : fusionne le catalogue avec
 * les badges réellement débloqués (issus du serveur) et calcule la progression.
 * Débloqués d'abord (récents en tête), puis verrouillés triés par proximité.
 */
export function buildBadgeViews(
  unlocked: Record<string, string>, // badge_key -> unlocked_at ISO
  ctx: BadgeProgressContext
): BadgeView[] {
  return BADGES.map((b) => ({
    ...b,
    unlocked: b.key in unlocked,
    unlockedAt: unlocked[b.key] ?? null,
    progress: badgeProgress(b, ctx),
  }));
}

/** Regroupe les badges par catégorie, dans l'ordre d'affichage défini. */
export function groupBadgesByCategory(views: BadgeView[]): { category: BadgeCategory; badges: BadgeView[] }[] {
  return BADGE_CATEGORY_ORDER.map((category) => ({
    category,
    badges: views.filter((v) => v.category === category),
  })).filter((g) => g.badges.length > 0);
}

/** Compteurs de tête d'écran : « 7 / 14 trophées ». */
export function badgeTally(views: BadgeView[]): { unlocked: number; total: number } {
  return { unlocked: views.filter((v) => v.unlocked).length, total: views.length };
}
