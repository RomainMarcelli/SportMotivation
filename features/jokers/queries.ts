import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentUser } from "@/lib/auth-store";
import { supabase } from "@/lib/supabase";

import { monthStartString } from "./joker";

const JOKER_ERROR_MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: "Tu dois être connecté.",
  NOT_MEMBER: "Tu n'es pas membre de ce groupe.",
  JOKER_ALREADY_USED: "Tu as déjà utilisé ton joker ce mois-ci.",
};

export function mapJokerError(code: string): string {
  return JOKER_ERROR_MESSAGES[code] ?? code;
}

/** Le joker du mois en cours a-t-il déjà été consommé dans ce groupe ? */
export function useMonthlyJoker(groupId: string | undefined) {
  const user = useCurrentUser();
  const monthStart = monthStartString(new Date());

  return useQuery({
    queryKey: ["joker", groupId, user?.id, monthStart],
    enabled: !!groupId && !!user?.id,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from("jokers")
        .select("id")
        .eq("group_id", groupId!)
        .eq("user_id", user!.id)
        .eq("month_start", monthStart)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}

/** Consomme le joker du mois (RPC `use_joker`). Irréversible : 1 par mois. */
export function useUseJoker(groupId: string | undefined) {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const monthStart = monthStartString(new Date());

  return useMutation({
    mutationFn: async (): Promise<string> => {
      const { data, error } = await supabase.rpc("use_joker", { p_group_id: groupId! });
      if (error) throw error;
      return data as unknown as string;
    },
    onSuccess: () => {
      queryClient.setQueryData(["joker", groupId, user?.id, monthStart], true);
    },
  });
}
