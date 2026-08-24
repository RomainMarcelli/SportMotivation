import { useQuery } from "@tanstack/react-query";

import { debugError } from "@/lib/log";
import { supabase } from "@/lib/supabase";
import type { CagnotteMember, MemberRole, PenaltyHistoryItem, PenaltyType } from "./cagnotte";

/**
 * Détail de la cagnotte par membre (RPC `get_group_cagnotte`, membre du groupe).
 * Les RPC ajoutées après la génération des types passent par `as never` — même
 * convention que `get_my_groups` / `get_group_dashboard`.
 */
export function useCagnotte(groupId: string | undefined) {
  return useQuery({
    queryKey: ["cagnotte", groupId],
    enabled: !!groupId,
    // La cagnotte se remplit côté serveur (clôture hebdo / blâmes) sans passer par une
    // mutation client : sans re-fetch à l'ouverture, la page restait sur un ancien état
    // (« 0 » vu avant la clôture) alors que le dashboard affichait le bon total. On force
    // donc un re-fetch à chaque montage de l'écran. (Bug « cagnotte ne se met pas à jour ».)
    refetchOnMount: "always",
    queryFn: async (): Promise<CagnotteMember[]> => {
      const { data, error } = await supabase.rpc(
        "get_group_cagnotte" as never,
        { p_group_id: groupId } as never
      );
      if (error) {
        debugError("get_group_cagnotte", error);
        throw error;
      }
      const rows = (data ?? []) as Record<string, unknown>[];
      return rows.map((r) => ({
        userId: r.user_id as string,
        firstName: (r.first_name as string | null) ?? null,
        lastName: (r.last_name as string | null) ?? null,
        username: (r.username as string | null) ?? null,
        avatarUrl: (r.avatar_url as string | null) ?? null,
        avatarColor: (r.avatar_color as string | null) ?? null,
        avatarIcon: (r.avatar_icon as string | null) ?? null,
        role: (r.role as MemberRole | null) ?? null,
        // Postgres renvoie `count()`/`sum()` en texte (bigint/numeric) → on force en nombre.
        penaltyCount: Number(r.penalty_count ?? 0),
        totalAmount: Number(r.total_amount ?? 0),
        paidAmount: Number(r.paid_amount ?? 0),
        isPaid: !!r.is_paid,
      }));
    },
  });
}

/** Historique des pénalités du groupe (RPC `get_pot_history`, membre du groupe). */
export function usePotHistory(groupId: string | undefined) {
  return useQuery({
    queryKey: ["pot-history", groupId],
    enabled: !!groupId,
    // Même raison que `useCagnotte` : l'historique est alimenté côté serveur, on le
    // rafraîchit à l'ouverture pour éviter un affichage périmé.
    refetchOnMount: "always",
    queryFn: async (): Promise<PenaltyHistoryItem[]> => {
      const { data, error } = await supabase.rpc(
        "get_pot_history" as never,
        { p_group_id: groupId } as never
      );
      if (error) {
        debugError("get_pot_history", error);
        throw error;
      }
      const rows = (data ?? []) as Record<string, unknown>[];
      return rows.map((r) => ({
        id: r.id as string,
        userId: r.user_id as string,
        firstName: (r.first_name as string | null) ?? null,
        username: (r.username as string | null) ?? null,
        penaltyType: (r.penalty_type as PenaltyType) ?? "missed_session",
        amount: Number(r.amount ?? 0),
        weekStart: r.week_start as string,
        createdAt: r.created_at as string,
      }));
    },
  });
}
