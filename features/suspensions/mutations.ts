import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

/**
 * Mutations de SUSPENSION (RPC SQL 052). La table/les RPC ne sont pas encore dans
 * les types générés → on appelle via `.rpc(... as never)` (convention repo, cf.
 * `unlock_pot`). Toutes invalident la liste des suspensions du groupe et les
 * notifications (une notif est créée côté serveur pour chaque décision/demande).
 */

function invalidateSuspension(
  queryClient: ReturnType<typeof useQueryClient>,
  groupId: string
) {
  queryClient.invalidateQueries({ queryKey: ["suspensions", groupId] });
  queryClient.invalidateQueries({ queryKey: ["notifications"] });
}

/** L'admin suspend directement un membre (période + motif facultatif). */
export function useAdminSuspendMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      userId: string;
      startISO: string;
      endISO: string;
      reason?: string | null;
    }): Promise<string> => {
      const { data, error } = await supabase.rpc(
        "admin_suspend_member" as never,
        {
          p_group_id: groupId,
          p_user_id: args.userId,
          p_start: args.startISO,
          p_end: args.endISO,
          p_reason: args.reason ?? null,
        } as never
      );
      if (error) throw error;
      return (data as string | null) ?? "";
    },
    onSuccess: () => invalidateSuspension(queryClient, groupId),
  });
}

/** Un joueur DEMANDE une suspension (motif obligatoire côté serveur). */
export function useRequestSuspension(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      startISO: string;
      endISO: string;
      reason: string;
    }): Promise<string> => {
      const { data, error } = await supabase.rpc(
        "request_suspension" as never,
        {
          p_group_id: groupId,
          p_start: args.startISO,
          p_end: args.endISO,
          p_reason: args.reason,
        } as never
      );
      if (error) throw error;
      return (data as string | null) ?? "";
    },
    onSuccess: () => invalidateSuspension(queryClient, groupId),
  });
}

/** L'admin tranche une demande : accepte (`true`) ou refuse (`false`). */
export function useDecideSuspension(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      suspensionId: string;
      accept: boolean;
      comment?: string | null;
    }): Promise<string> => {
      const { data, error } = await supabase.rpc(
        "decide_suspension" as never,
        {
          p_suspension_id: args.suspensionId,
          p_accept: args.accept,
          p_comment: args.comment ?? null,
        } as never
      );
      if (error) throw error;
      return (data as string | null) ?? "";
    },
    onSuccess: () => invalidateSuspension(queryClient, groupId),
  });
}

/** Lève une suspension (admin) ou retire sa demande (joueur). */
export function useCancelSuspension(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (suspensionId: string): Promise<void> => {
      const { error } = await supabase.rpc(
        "cancel_suspension" as never,
        { p_suspension_id: suspensionId } as never
      );
      if (error) throw error;
    },
    onSuccess: () => invalidateSuspension(queryClient, groupId),
  });
}
