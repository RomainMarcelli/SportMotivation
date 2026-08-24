import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { MemberRole } from "@/constants/roles";

/**
 * Met à jour le rôle d'un membre. RLS : autorisé pour un admin du groupe
 * (policy group_members_update_self_or_admin).
 */
export function useUpdateMemberRole(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ membershipId, role }: { membershipId: string; role: MemberRole }) => {
      const { error } = await supabase
        .from("group_members")
        .update({ role })
        .eq("id", membershipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
    },
  });
}

/**
 * Exclut un membre (soft delete : left_at = now). RLS : admin du groupe.
 * Sa contribution reste dans la cagnotte par défaut (cf. spec).
 */
export function useRemoveMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase
        .from("group_members")
        .update({ left_at: new Date().toISOString() })
        .eq("id", membershipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
    },
  });
}
