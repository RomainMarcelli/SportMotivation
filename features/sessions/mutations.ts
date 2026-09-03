import { decode as decodeBase64 } from "base64-arraybuffer";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { debugError } from "@/lib/log";
import { supabase } from "@/lib/supabase";
import { toDateOnly } from "@/lib/date";
import type { Json } from "@/types/database.types";
import type { ProofType } from "./schemas";

export type DeclareSessionArgs = {
  groupId: string;
  activityType: string;
  durationMin: number;
  distanceKm?: number | null;
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
  /**
   * Défis dans lesquels publier la séance. Absent = tous les défis en cours.
   * Le défi d'origine y est de toute façon (c'est là qu'elle est créée).
   */
  publishGroupIds?: string[] | null;
};

/** Défi dans lequel la séance a été publiée. */
export type PublishedGroup = { group_id: string; group_name: string; session_id: string };

export type DeclareSessionResult = {
  /** Séance créée dans le groupe d'origine. */
  id: string;
  /** Tous les défis où elle compte, celui d'origine inclus. */
  groups: PublishedGroup[];
};

/**
 * Déclare une séance : appelle la RPC `declare_session` (validation des règles côté serveur),
 * upload l'éventuelle photo dans le bucket privé `session-proofs`, insère la preuve, **recopie
 * la séance dans les autres défis** du joueur puis notifie les votants.
 */
export function useDeclareSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: DeclareSessionArgs): Promise<DeclareSessionResult> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Utilisateur non connecté");

      const { data: sessionId, error: rpcError } = await supabase.rpc("declare_session", {
        p_group_id: args.groupId,
        p_activity_type: args.activityType,
        p_duration_min: args.durationMin,
        p_performed_at: toDateOnly(args.performedAt),
        p_comment: args.comment ?? undefined,
        // `undefined` est omis du JSON : un client déployé avant 072 continue ainsi
        // à appeler sans ambiguïté l'ancienne RPC tant que la migration n'est pas posée.
        p_distance_km: args.distanceKm ?? undefined,
      });
      if (rpcError) throw rpcError;
      const id = sessionId as unknown as string;

      // Upload de la photo / capture si présente
      let mediaPath: string | null = null;
      const hasImageProof = args.proofType === "photo" || args.proofType === "external_link";
      if (hasImageProof && args.photoBase64) {
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
        external_url: args.proofType === "external_link" ? (args.externalUrl ?? null) : null,
        // Tant que 072 n'est pas déployée, les preuves photo/Strava n'envoient
        // pas cette nouvelle clé et restent testables sur le schéma précédent.
        ...(args.proofType === "external_link"
          ? { description: args.externalDescription ?? null }
          : {}),
        latitude: hasImageProof ? (args.latitude ?? null) : null,
        longitude: hasImageProof ? (args.longitude ?? null) : null,
        captured_at: hasImageProof ? (args.capturedAt ?? null) : null,
        strava_data: args.proofType === "strava" ? (args.stravaData ?? null) : null,
      });
      if (proofError) throw proofError;

      // Une séance réelle = une séance dans TOUS mes défis en cours. La copie
      // se fait après la preuve pour que chaque défi reçoive la photo, et pas
      // une séance nue.
      let groups: PublishedGroup[] = [];
      const { data: published, error: publishError } = await supabase.rpc(
        "publish_session_to_my_groups",
        { p_session_id: id, p_group_ids: args.publishGroupIds ?? undefined }
      );
      if (publishError) {
        // La séance existe déjà dans le groupe d'origine : on ne fait pas
        // échouer la déclaration pour un partage raté, on le signale.
        debugError("publish_session_to_my_groups", publishError);
      } else {
        groups = (published ?? []) as PublishedGroup[];
      }

      // Notification aux votants — une seule par personne, même si elle partage
      // plusieurs défis avec l'auteur.
      const { error: notifyError } = await supabase.rpc("notify_session_declared", {
        p_session_id: id,
      });
      if (notifyError) debugError("notify_session_declared", notifyError);

      return { id, groups };
    },
    onSuccess: (result, args) => {
      // Toutes les copies sont concernées, pas seulement le groupe d'origine.
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["votes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["sessions", args.groupId] });
    },
  });
}
