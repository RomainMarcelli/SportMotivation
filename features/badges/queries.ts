import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentUser } from "@/lib/auth-store";
import { supabase } from "@/lib/supabase";
import type { BadgeProgressContext } from "@/features/badges/badge-logic";

/**
 * Trophées du compte : badges débloqués + compteurs de progression, via la RPC
 * unique `get_my_trophies` (cf. `063_user_badges.sql`). Le client ne fait que LIRE
 * (l'attribution est serveur). `useMarkBadgesSeen` acquitte la célébration une fois.
 */
export type TrophyBadge = {
  key: string;
  unlockedAt: string;
  seenAt: string | null;
  groupId: string | null;
};

export type Trophies = {
  ctx: BadgeProgressContext;
  /** badge_key -> unlocked_at ISO */
  unlocked: Record<string, string>;
  badges: TrophyBadge[];
  /** Badges pas encore montrés (célébration à jouer). */
  unseen: TrophyBadge[];
};

type TrophiesRow = {
  validated_sessions: number | null;
  best_streak: number | null;
  badges: { key: string; unlocked_at: string; seen_at: string | null; group_id: string | null }[] | null;
};

const EMPTY: Trophies = {
  ctx: { validatedSessions: 0, bestStreak: 0 },
  unlocked: {},
  badges: [],
  unseen: [],
};

export function useTrophies() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: ["trophies", user?.id],
    enabled: !!user?.id,
    staleTime: 20_000,
    queryFn: async (): Promise<Trophies> => {
      const { data, error } = await supabase.rpc("get_my_trophies");
      if (error) throw error;
      // Retour JSONB (typé `Json`) → on projette vers notre forme locale.
      const row = (data ?? null) as unknown as TrophiesRow | null;
      if (!row) return EMPTY;
      const badges: TrophyBadge[] = (row.badges ?? []).map((b) => ({
        key: b.key,
        unlockedAt: b.unlocked_at,
        seenAt: b.seen_at,
        groupId: b.group_id,
      }));
      const unlocked: Record<string, string> = {};
      for (const b of badges) unlocked[b.key] = b.unlockedAt;
      return {
        ctx: {
          validatedSessions: row.validated_sessions ?? 0,
          bestStreak: row.best_streak ?? 0,
        },
        unlocked,
        badges,
        unseen: badges.filter((b) => b.seenAt == null),
      };
    },
  });
}

/** Acquitte des badges (célébration jouée). Sans clés = tous les non-vus. */
export function useMarkBadgesSeen() {
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  return useMutation({
    mutationFn: async (keys?: string[]) => {
      const { error } = await supabase.rpc("mark_badges_seen", {
        p_keys: keys ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trophies", user?.id] });
    },
  });
}
