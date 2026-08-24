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
  /** Membres actifs. 0 tant que le SQL 037 n'est pas passé → on masque l'info. */
  memberCount: number;
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
        memberCount: (r.member_count as number | null) ?? 0,
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
    // Juste après un join, l'adhésion peut ne pas être visible immédiatement (lag lecture/écriture)
    // → la RPC renvoie 0 ligne. On réessaie quelques fois avant d'afficher « introuvable ».
    retry: 3,
    retryDelay: (attempt) => Math.min(1500, 400 * (attempt + 1)),
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
    // Le total se met à jour côté serveur (clôture / blâmes) : re-fetch à l'ouverture
    // pour que le montant affiché (dashboard, accueil) reste aligné sur la DB.
    refetchOnMount: "always",
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

export type PotStatus = {
  /** Montant total (null si la RLS bloque la lecture directe). */
  total: number | null;
  /** État de la cagnotte : `open` (par défaut) ou `unlocked` (déblocage de fin de défi). */
  status: string | null;
  /** Horodatage de déblocage (ISO) — non nul ⇒ cagnotte débloquée. */
  unlockedAt: string | null;
};

/**
 * Statut de la cagnotte (montant + déblocage), pour les écrans de fin de défi.
 * Lecture directe de `pots` (best-effort, comme `usePot`) : dégrade proprement si la RLS
 * refuse plutôt que d'échouer l'écran. `unlockedAt` non nul ⇒ afficher la clôture.
 */
export function usePotStatus(groupId: string | undefined) {
  return useQuery({
    queryKey: ["pot-status", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<PotStatus> => {
      const { data, error } = await supabase
        .from("pots")
        .select("total_amount, status, unlocked_at")
        .eq("group_id", groupId!)
        .maybeSingle();
      if (error) {
        debugError("pots.status.select", error);
        return { total: null, status: null, unlockedAt: null };
      }
      return {
        total: data?.total_amount ?? null,
        status: (data?.status as string | null) ?? null,
        unlockedAt: (data?.unlocked_at as string | null) ?? null,
      };
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
    // L'effectif bouge sans nous prévenir (départ, suppression de compte, arrivée) :
    // rentrer dans un écran qui affiche des membres doit recharger la liste, sinon
    // on continue d'afficher quelqu'un qui n'est plus là.
    refetchOnMount: "always",
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
          avatar_color: (r.avatar_color as string | null) ?? null,
          avatar_icon: (r.avatar_icon as string | null) ?? null,
        } as UserRow,
      }));
    },
  });
}
