import { ENABLE_DEBUG_LOGS } from "@/constants/config";

export type GroupErrorKind = "not_found" | "access_denied" | "rpc_missing" | "network" | "unknown";

export type ClassifiedError = {
  kind: GroupErrorKind;
  /** Message destiné à l'utilisateur. */
  message: string;
  /** Détail technique (code + message Supabase), affiché seulement en mode debug. */
  technical?: string;
};

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
};

/**
 * Classe une erreur de chargement de groupe pour afficher un message utile.
 * - PGRST202 / "Could not find the function" → RPC manquante (SQL pas appliqué côté base)
 * - "introuvable" / 0 ligne → groupe introuvable ou accès refusé par la RLS
 * - erreur réseau (fetch) → problème de connexion
 */
export function classifyGroupError(error: unknown): ClassifiedError {
  const e = (error ?? {}) as SupabaseLikeError;
  const code = e.code ?? "";
  const msg = e.message ?? "";
  const technical = ENABLE_DEBUG_LOGS
    ? [code, msg].filter(Boolean).join(" — ") || undefined
    : undefined;

  // Fonction RPC absente (le SQL n'a pas été exécuté en base)
  if (code === "PGRST202" || /could not find the function|schema cache/i.test(msg)) {
    return {
      kind: "rpc_missing",
      message:
        "Une fonction serveur est manquante côté base de données. Le groupe ne peut pas être chargé tant qu'elle n'est pas installée.",
      technical,
    };
  }

  // Réseau
  if (/network request failed|fetch|timeout/i.test(msg)) {
    return {
      kind: "network",
      message: "Connexion impossible. Vérifie ta connexion internet et réessaie.",
      technical,
    };
  }

  // Introuvable / accès refusé (RLS renvoie 0 ligne, ou message explicite)
  if (/introuvable|acc[èe]s refus|permission|row-level/i.test(msg)) {
    return {
      kind: "access_denied",
      message: "Groupe introuvable ou tu n'y as pas accès.",
      technical,
    };
  }

  return {
    kind: "unknown",
    message: "Impossible de charger ce groupe pour le moment.",
    technical,
  };
}
