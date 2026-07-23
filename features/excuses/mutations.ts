import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { extFromMime, type Justification } from "./attachment";
import type { ExcuseType } from "./excuse-logic";

export type SubmitExcuseArgs = {
  groupId: string;
  excuseType: ExcuseType;
  reason: string;
  /** Justificatif optionnel : image **ou PDF**. */
  justification?: Justification | null;
};

const EXCUSE_ERROR_MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: "Tu dois être connecté.",
  NOT_MEMBER: "Tu n'es pas membre de ce groupe.",
  GROUP_NOT_FOUND: "Groupe introuvable.",
  GROUP_NOT_ACTIVE: "Le défi de ce groupe n'est pas en cours.",
  REASON_REQUIRED: "Ajoute un motif.",
  EXCUSE_ALREADY_EXISTS: "Tu as déjà une excuse en cours cette semaine.",
  EXCUSE_NOT_FOUND: "Excuse introuvable.",
  CANNOT_VOTE_OWN: "Tu ne peux pas voter ta propre excuse.",
  EXCUSE_NOT_PENDING: "Cette excuse n'est plus en attente de vote.",
  ALREADY_VOTED: "Tu as déjà voté pour cette excuse.",
};

export function mapExcuseError(code: string): string {
  return EXCUSE_ERROR_MESSAGES[code] ?? code;
}

/**
 * Soumet une excuse au vote du groupe : upload éventuel du justificatif dans le bucket privé
 * `excuse-justifications`, puis RPC `submit_excuse` (règles + anti-doublon côté serveur).
 */
export function useSubmitExcuse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: SubmitExcuseArgs): Promise<string> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("NOT_AUTHENTICATED");

      let justificationUrl: string | null = null;
      if (args.justification) {
        const { bytes, mime, name } = args.justification;
        const path = `${userId}/${args.groupId}-${Date.now()}.${extFromMime(mime, name)}`;
        const { error: uploadError } = await supabase.storage
          .from("excuse-justifications")
          .upload(path, bytes, { contentType: mime, upsert: true });
        if (uploadError) throw uploadError;
        justificationUrl = path;
      }

      const { data, error } = await supabase.rpc("submit_excuse", {
        p_group_id: args.groupId,
        p_excuse_type: args.excuseType,
        p_reason: args.reason,
        p_justification_url: justificationUrl,
      });
      if (error) throw error;
      return data as unknown as string;
    },
    onSuccess: (_id, args) => {
      queryClient.invalidateQueries({ queryKey: ["excuses", args.groupId] });
      queryClient.invalidateQueries({ queryKey: ["my-week-excuse", args.groupId] });
    },
  });
}

export type CastExcuseVoteArgs = {
  excuseId: string;
  groupId: string;
  value: boolean;
  comment?: string | null;
};

/** Vote sur une excuse via la RPC `cast_excuse_vote` (résolution majorité simple côté serveur). */
export function useCastExcuseVote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: CastExcuseVoteArgs): Promise<string> => {
      const { data, error } = await supabase.rpc("cast_excuse_vote", {
        p_excuse_id: args.excuseId,
        p_value: args.value,
        p_comment: args.comment ?? null,
      });
      if (error) throw error;
      return (data as unknown as string) ?? "pending_vote";
    },
    onSuccess: (_result, args) => {
      queryClient.invalidateQueries({ queryKey: ["excuses", args.groupId] });
      queryClient.invalidateQueries({ queryKey: ["votes", args.groupId] });
      // La notification correspondante doit basculer sur « vote enregistré ».
      queryClient.invalidateQueries({ queryKey: ["my-voted-targets"] });
    },
  });
}
