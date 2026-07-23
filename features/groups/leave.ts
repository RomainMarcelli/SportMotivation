import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { invalidateMembership } from "./cache";

const LEAVE_ERROR_MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: "Tu dois être connecté.",
  NOT_MEMBER: "Tu n'es pas membre de ce groupe.",
  LAST_MEMBER:
    "Tu es le dernier membre : supprime le groupe plutôt que de le quitter.",
};

export function mapLeaveError(code: string): string {
  for (const key of Object.keys(LEAVE_ERROR_MESSAGES)) {
    if (code.includes(key)) return LEAVE_ERROR_MESSAGES[key];
  }
  return code;
}

/**
 * Quitte le groupe via la RPC `leave_group`. Si je suis admin et qu'il reste des membres,
 * le rôle est transféré automatiquement au plus ancien — la RPC renvoie alors son prénom
 * (sinon `null`).
 */
export function useLeaveGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string): Promise<string | null> => {
      const { data, error } = await supabase.rpc("leave_group", { p_group_id: groupId });
      if (error) throw error;
      return (data as unknown as string | null) ?? null;
    },
    onSuccess: (_newAdmin, groupId) => invalidateMembership(queryClient, groupId),
  });
}
