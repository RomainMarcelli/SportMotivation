import { useQuery } from "@tanstack/react-query";

import { useCurrentUser } from "@/lib/auth-store";
import { debugError } from "@/lib/log";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

type GroupRow = Database["public"]["Tables"]["groups"]["Row"];
type MemberRole = Database["public"]["Enums"]["member_role"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];

export type MyGroup = {
  membershipId: string;
  role: MemberRole;
  weeklyTarget: number;
  group: GroupRow;
};

export type GroupMemberWithUser = {
  id: string;
  role: MemberRole;
  weeklyTarget: number;
  targetLocked: boolean;
  penaltyAmount: number | null;
  joinedAt: string;
  user: UserRow;
};

/**
 * Liste les groupes de l'utilisateur courant.
 * Passe par la RPC SECURITY DEFINER `get_my_groups` (évite toute dépendance à la RLS SELECT).
 */
export function useMyGroups() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: ["my-groups", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<MyGroup[]> => {
      const { data, error } = await supabase.rpc("get_my_groups" as never);
      if (error) {
        debugError("get_my_groups", error);
        throw error;
      }
      const rows = (data ?? []) as Record<string, unknown>[];
      return rows.map((r) => ({
        membershipId: r.membership_id as string,
        role: r.role as MemberRole,
        weeklyTarget: r.weekly_target as number,
        group: {
          id: r.group_id as string,
          name: r.name as string,
          description: (r.description as string | null) ?? null,
          photo_url: (r.photo_url as string | null) ?? null,
          challenge_start: r.challenge_start as string,
          challenge_end: r.challenge_end as string,
          penalty_amount: r.penalty_amount as number,
          status: r.status as GroupRow["status"],
          max_members: r.max_members as number,
        } as GroupRow,
      }));
    },
  });
}

/** Détail d'un groupe via la RPC `get_group_dashboard` (membre ou créateur). */
export function useGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: ["group", groupId],
    enabled: !!groupId,
    retry: false,
    queryFn: async (): Promise<GroupRow> => {
      const { data, error } = await supabase.rpc(
        "get_group_dashboard" as never,
        { p_group_id: groupId } as never
      );
      if (error) {
        debugError("get_group_dashboard", error);
        throw error;
      }
      const rows = (data ?? []) as GroupRow[];
      if (rows.length === 0) throw new Error("Groupe introuvable ou accès refusé.");
      return rows[0];
    },
  });
}

/**
 * Cagnotte du groupe (montant total). Lecture directe de `pots` (best-effort : si la RLS bloque
 * la lecture directe, on dégrade à `null` plutôt que d'échouer l'écran).
 */
export function usePot(groupId: string | undefined) {
  return useQuery({
    queryKey: ["pot", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<number | null> => {
      const { data, error } = await supabase
        .from("pots")
        .select("total_amount")
        .eq("group_id", groupId!)
        .maybeSingle();
      if (error) {
        debugError("pots.select", error);
        return null;
      }
      return data?.total_amount ?? null;
    },
  });
}

export type MemberBlames = { userId: string; count: number };

/**
 * Blâmes non réglés par membre (vue `v_member_unsettled_blames`). Best-effort : dégrade à `[]`
 * si la lecture est refusée (RLS).
 */
export function useUnsettledBlames(groupId: string | undefined) {
  return useQuery({
    queryKey: ["blames", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<MemberBlames[]> => {
      const { data, error } = await supabase
        .from("v_member_unsettled_blames")
        .select("user_id, unsettled_blame_count")
        .eq("group_id", groupId!);
      if (error) {
        debugError("v_member_unsettled_blames.select", error);
        return [];
      }
      return (data ?? []).map((r) => ({
        userId: r.user_id as string,
        count: (r.unsettled_blame_count as number | null) ?? 0,
      }));
    },
  });
}

/** Membres actifs d'un groupe avec leur profil, via la RPC `get_group_members`. */
export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: ["group-members", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<GroupMemberWithUser[]> => {
      const { data, error } = await supabase.rpc(
        "get_group_members" as never,
        { p_group_id: groupId } as never
      );
      if (error) {
        debugError("get_group_members", error);
        throw error;
      }
      const rows = (data ?? []) as Record<string, unknown>[];
      return rows.map((r) => ({
        id: r.id as string,
        role: r.role as MemberRole,
        weeklyTarget: r.weekly_target as number,
        targetLocked: r.target_locked as boolean,
        penaltyAmount: (r.penalty_amount as number | null) ?? null,
        joinedAt: r.joined_at as string,
        user: {
          id: r.user_id as string,
          first_name: (r.first_name as string | null) ?? null,
          last_name: (r.last_name as string | null) ?? null,
          username: (r.username as string | null) ?? null,
          avatar_url: (r.avatar_url as string | null) ?? null,
        } as UserRow,
      }));
    },
  });
}
