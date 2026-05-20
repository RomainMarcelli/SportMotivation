import { decode as decodeBase64 } from "base64-arraybuffer";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { toDateOnly } from "@/lib/date";
import type { Json } from "@/types/database.types";
import type { ProofType } from "./schemas";

export type DeclareSessionArgs = {
  groupId: string;
  activityType: string;
  durationMin: number;
  performedAt: Date;
  comment?: string | null;
  proofType: ProofType;
  /** Photo (proof photo) ou capture d'écran (proof external_link), encodée en base64. */
  photoBase64?: string | null;
  photoMime?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capturedAt?: string | null;
  externalUrl?: string | null;
  externalDescription?: string | null;
  stravaActivityId?: string | null;
  stravaData?: Json | null;
};

/**
 * Déclare une séance : appelle la RPC `declare_session` (validation des règles côté serveur),
 * puis upload l'éventuelle photo dans le bucket privé `session-proofs` et insère la preuve.
 */
export function useDeclareSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: DeclareSessionArgs): Promise<string> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Utilisateur non connecté");

      // Pour un lien externe, la description obligatoire est stockée dans le commentaire.
      const comment =
        args.proofType === "external_link"
          ? (args.externalDescription ?? args.comment ?? null)
          : (args.comment ?? null);

      const { data: sessionId, error: rpcError } = await supabase.rpc("declare_session", {
        p_group_id: args.groupId,
        p_activity_type: args.activityType,
        p_duration_min: args.durationMin,
        p_performed_at: toDateOnly(args.performedAt),
        p_comment: comment,
      });
      if (rpcError) throw rpcError;
      const id = sessionId as unknown as string;

      // Upload de la photo / capture si présente
      let mediaPath: string | null = null;
      if (args.photoBase64) {
        const mime = args.photoMime ?? "image/jpeg";
        const ext = mime.split("/")[1] ?? "jpg";
        mediaPath = `${userId}/${id}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("session-proofs")
          .upload(mediaPath, decodeBase64(args.photoBase64), {
            contentType: mime,
            upsert: true,
          });
        if (uploadError) throw uploadError;
      }

      const { error: proofError } = await supabase.from("session_proofs").insert({
        session_id: id,
        proof_type: args.proofType,
        media_url: mediaPath,
        external_url: args.externalUrl ?? null,
        latitude: args.latitude ?? null,
        longitude: args.longitude ?? null,
        captured_at: args.capturedAt ?? null,
        strava_data: args.stravaData ?? null,
      });
      if (proofError) throw proofError;

      return id;
    },
    onSuccess: (_id, args) => {
      queryClient.invalidateQueries({ queryKey: ["sessions", args.groupId] });
    },
  });
}
