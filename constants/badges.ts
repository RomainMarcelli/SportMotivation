import {
  Award,
  Crown,
  Dumbbell,
  Flame,
  Medal,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react-native";

import { colors } from "@/constants/colors";

/**
 * CATALOGUE CENTRAL des badges (trophées). Un badge est GLOBAL au compte et
 * DÉFINITIVEMENT acquis (même si la série retombe). L'attribution est faite CÔTÉ
 * SERVEUR (SQL, idempotent) — ce catalogue ne sert qu'au RENDU (libellés, icônes,
 * DA) et au calcul de PROGRESSION affichée.
 *
 * ⚠ Les clés (`key`) et seuils (`threshold`) DOIVENT rester synchronisés avec les
 * fonctions d'attribution SQL (`065_award_badges.sql`). Ajouter un badge = 1 entrée
 * ici + 1 seuil dans la fonction d'attribution correspondante.
 *
 * L'`icon` est une icône lucide pour cette V1 ; l'architecture (champ dédié) permet
 * de la remplacer plus tard par une illustration personnalisée sans toucher au reste.
 */
export type BadgeCategory = "sessions" | "streak" | "challenge";

export type BadgeDef = {
  key: string;
  title: string;
  /** Phrase courte : la condition de déblocage (« 50 séances validées »). */
  description: string;
  category: BadgeCategory;
  /**
   * Seuil numérique (séances validées, ou semaines de série). Absent pour les
   * badges de défi, dont la condition n'est pas un simple compteur.
   */
  threshold?: number;
  icon: LucideIcon;
  /** Teinte DA de la pastille. */
  tint: string;
};

/** Séances validées (cumul, tous défis). */
const SESSION_BADGES: BadgeDef[] = [
  { key: "sessions_1", title: "Premiers pas", description: "1 séance validée", category: "sessions", threshold: 1, icon: Dumbbell, tint: colors.coral },
  { key: "sessions_10", title: "Habitué", description: "10 séances validées", category: "sessions", threshold: 10, icon: Dumbbell, tint: colors.coral },
  { key: "sessions_50", title: "Machine", description: "50 séances validées", category: "sessions", threshold: 50, icon: Zap, tint: colors.coral },
  { key: "sessions_100", title: "Centurion", description: "100 séances validées", category: "sessions", threshold: 100, icon: Medal, tint: colors.amber },
];

/** Séries de semaines réussies (meilleur record, tous défis confondus). */
const STREAK_BADGES: BadgeDef[] = [
  { key: "streak_2", title: "Première flamme", description: "2 semaines de série", category: "streak", threshold: 2, icon: Flame, tint: colors.amber },
  { key: "streak_4", title: "Régulier", description: "4 semaines de série", category: "streak", threshold: 4, icon: Flame, tint: colors.amber },
  { key: "streak_8", title: "En feu", description: "8 semaines de série", category: "streak", threshold: 8, icon: Flame, tint: colors.amber },
  { key: "streak_12", title: "Inarrêtable", description: "12 semaines de série", category: "streak", threshold: 12, icon: Flame, tint: colors.coral },
  { key: "streak_26", title: "Légende", description: "26 semaines de série", category: "streak", threshold: 26, icon: Sparkles, tint: colors.coral },
  { key: "streak_52", title: "Une année de feu", description: "52 semaines de série", category: "streak", threshold: 52, icon: Star, tint: colors.amber },
];

/** Défis (conditions non-numériques, attribuées en fin de défi). */
const CHALLENGE_BADGES: BadgeDef[] = [
  { key: "challenge_first", title: "Premier défi", description: "Terminer un premier défi", category: "challenge", icon: Trophy, tint: colors.mint },
  { key: "challenge_perfect", title: "Défi parfait", description: "100 % des objectifs hebdo atteints sur un défi", category: "challenge", icon: Award, tint: colors.mint },
  { key: "challenge_flawless", title: "Intouchable", description: "Terminer un défi sans aucune pénalité", category: "challenge", icon: ShieldCheck, tint: colors.mint },
  { key: "challenge_champion", title: "Champion", description: "Terminer premier au classement d'un défi", category: "challenge", icon: Crown, tint: colors.amber },
];

export const BADGES: BadgeDef[] = [...SESSION_BADGES, ...STREAK_BADGES, ...CHALLENGE_BADGES];

/** Accès rapide par clé (pour afficher une notif/célébration à partir d'un `badge_key`). */
export const BADGE_BY_KEY: Record<string, BadgeDef> = Object.fromEntries(
  BADGES.map((b) => [b.key, b])
);

/** Ordre d'affichage des catégories sur l'écran Trophées. */
export const BADGE_CATEGORY_ORDER: BadgeCategory[] = ["streak", "sessions", "challenge"];

export const BADGE_CATEGORY_LABEL: Record<BadgeCategory, string> = {
  streak: "Séries",
  sessions: "Séances",
  challenge: "Défis",
};
