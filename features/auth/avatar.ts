/**
 * Résolution de l'avatar d'un utilisateur (logique pure, testable).
 *
 * Un même profil peut porter plusieurs informations d'avatar en même temps
 * (une photo ET une couleur, par exemple, si le joueur a changé d'avis). Cette
 * fonction tranche une bonne fois pour toutes ce qu'on AFFICHE, pour que la
 * bulle du profil, celle des listes de membres et celle du header soient
 * toujours identiques.
 */

import { AVATAR_COLORS } from "@/constants/avatars";

export type AvatarSource = {
  avatar_url?: string | null;
  avatar_color?: string | null;
  avatar_icon?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  id?: string | null;
};

export type ResolvedAvatar =
  | { kind: "image"; uri: string; color: string }
  | { kind: "icon"; icon: string; color: string }
  | { kind: "initials"; initials: string; color: string };

/**
 * Couleur de repli **déterministe** : le même utilisateur garde toujours la
 * même teinte, sur tous les appareils, tant qu'il n'en a pas choisi une.
 * (Un `Math.random()` ferait clignoter les listes à chaque rendu.)
 */
export function fallbackColor(key: string | null | undefined): string {
  const source = (key ?? "").trim();
  if (!source) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) % 100000;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** Nom affichable : prénom + nom, sinon pseudo, sinon rien. */
export function displayName(source: AvatarSource): string {
  const full = `${source.first_name ?? ""} ${source.last_name ?? ""}`.trim();
  if (full) return full;
  return (source.username ?? "").trim();
}

/**
 * Initiales d'un nom complet : « Romain Marcelli » → « RM », « Romain » → « RO ».
 * Beaucoup d'écrans ne disposent que d'une chaîne déjà concaténée, d'où ce cas.
 */
export function initialsFromName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** 1 à 2 lettres. Le pseudo sert de repli, puis un « ? » pour ne jamais afficher du vide. */
export function initialsFrom(source: AvatarSource): string {
  const first = (source.first_name ?? "").trim();
  const last = (source.last_name ?? "").trim();
  if (first && last) return (first[0] + last[0]).toUpperCase();
  if (first) return initialsFromName(first);

  const username = (source.username ?? "").trim();
  if (username) return username.slice(0, 2).toUpperCase();
  return "?";
}

/**
 * Ordre de priorité : image (photo ou avatar généré) → icône → initiales.
 * La couleur est toujours résolue, même pour une image : elle sert de fond
 * pendant le chargement et d'anneau autour de la bulle.
 */
export function resolveAvatar(source: AvatarSource | null | undefined): ResolvedAvatar {
  const src = source ?? {};
  const color =
    (src.avatar_color ?? "").trim() ||
    fallbackColor(src.id ?? src.username ?? displayName(src));

  const uri = (src.avatar_url ?? "").trim();
  if (uri) return { kind: "image", uri, color };

  const icon = (src.avatar_icon ?? "").trim();
  if (icon) return { kind: "icon", icon, color };

  return { kind: "initials", initials: initialsFrom(src), color };
}
