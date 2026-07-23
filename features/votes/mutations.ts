import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export type CastVoteArgs = {
  sessionId: string;
  groupId: string;
  /** true = valider, false = refuser. */
  value: boolean;
  comment?: string | null;
};

/** Statut de la séance après résolution du scrutin (renvoyé par la RPC). */
export type VoteResult = "pending_vote" | "validated" | "rejected" | "expired";

const VOTE_ERROR_MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: "Tu dois être connecté pour voter.",
  SESSION_NOT_FOUND: "Séance introuvable.",
  NOT_MEMBER: "Tu n'es pas membre de ce groupe.",
  CANNOT_VOTE_OWN: "Tu ne peux pas voter ta propre séance.",
  SESSION_NOT_PENDING: "Cette séance n'est plus en attente de vote.",
  ALREADY_VOTED: "Tu as déjà voté pour cette séance.",
};

export function mapVoteError(code: string): string {
  return VOTE_ERROR_MESSAGES[code] ?? code;
}

/** Enregistre mon vote sur une séance via la RPC `cast_vote` (résout le scrutin côté serveur). */
export function useCastVote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: CastVoteArgs): Promise<VoteResult> => {
      const { data, error } = await supabase.rpc("cast_vote", {
        p_session_id: args.sessionId,
        p_value: args.value,
        p_comment: args.comment ?? null,
      });
      if (error) throw error;
      return (data as unknown as VoteResult) ?? "pending_vote";
    },
    onSuccess: () => {
      // Un vote vaut pour TOUS les défis partagés avec l'auteur (SQL 036) :
      // n'invalider que le groupe courant laissait les autres afficher une
      // séance encore « à voter » qui venait d'être tranchée.
      queryClient.invalidateQueries({ queryKey: ["votes"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      // La notification correspondante doit basculer sur « vote enregistré ».
      queryClient.invalidateQueries({ queryKey: ["my-voted-targets"] });
    },
  });
}
