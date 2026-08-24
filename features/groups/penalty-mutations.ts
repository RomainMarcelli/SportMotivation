import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentUser } from "@/lib/auth-store";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

export type PenaltyChange = Database["public"]["Tables"]["member_penalty_changes"]["Row"];

/** Détail d'une demande de changement de pénalité (pour l'écran de réponse). */
export function usePenaltyChange(changeId: string | undefined) {
  return useQuery({
    queryKey: ["penalty-change", changeId],
    enabled: !!changeId,
    retry: false,
    queryFn: async (): Promise<PenaltyChange | null> => {
      const { data, error } = await supabase
        .from("member_penalty_changes")
        .select("*")
        .eq("id", changeId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Propositions de pénalité **en attente** du groupe (best-effort).
 *
 * Sert à afficher « en attente de réponse » plutôt que de laisser l'admin
 * reproposer indéfiniment le même montant. Dégrade à `[]` si la lecture est
 * refusée par la RLS : l'écran reste utilisable.
 */
export function usePendingPenaltyChanges(groupId: string | undefined) {
  return useQuery({
    queryKey: ["penalty-changes", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<PenaltyChange[]> => {
      const { data, error } = await supabase
        .from("member_penalty_changes")
        .select("*")
        .eq("group_id", groupId!)
        .eq("status", "pending");
      if (error) return [];
      return data ?? [];
    },
  });
}

/**
 * L'admin fixe SA propre pénalité, sans passer par une proposition.
 * Se demander à soi-même l'autorisation n'a pas de sens (et s'envoyait une
 * notification au passage).
 */
export function useSetMyPenalty(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (amount: number) => {
      const { error } = await supabase.rpc("set_my_penalty", {
        p_group_id: groupId,
        p_amount: amount,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
    },
  });
}

/** Admin propose un changement de pénalité pour un membre (→ notif au membre). */
export function useProposePenaltyChange(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ membershipId, newAmount }: { membershipId: string; newAmount: number }) => {
      const { error } = await supabase.rpc("propose_penalty_change", {
        p_group_member_id: membershipId,
        p_new_amount: newAmount,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
      queryClient.invalidateQueries({ queryKey: ["penalty-changes", groupId] });
    },
  });
}

/** Le membre valide ou refuse une demande de changement de pénalité. */
export function useRespondPenaltyChange() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ changeId, accept }: { changeId: string; accept: boolean }) => {
      const { error } = await supabase.rpc("respond_penalty_change", {
        p_change_id: changeId,
        p_accept: accept,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
    },
  });
}

type GroupSettings = {
  name: string;
  description: string | null;
  penalty_amount: number;
  min_duration_min: number;
  blame_threshold: number;
  accepted_activities: string[];
  /** NULL = pas de limite de séances par jour. */
  max_sessions_per_day: number | null;
};

/** Met à jour les réglages du groupe (admin). RLS : groups_update_admin. */
export function useUpdateGroupSettings(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: GroupSettings) => {
      const { error } = await supabase
        .from("groups")
        .update({
          name: settings.name,
          description: settings.description,
          penalty_amount: settings.penalty_amount,
          min_duration_min: settings.min_duration_min,
          blame_threshold: settings.blame_threshold,
          accepted_activities: settings.accepted_activities,
          max_sessions_per_day: settings.max_sessions_per_day,
        })
        .eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
    },
  });
}

/** Supprime définitivement le groupe (admin uniquement). RPC delete_group. */
export function useDeleteGroup(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("delete_group" as never, {
        p_group_id: groupId,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
    },
  });
}
