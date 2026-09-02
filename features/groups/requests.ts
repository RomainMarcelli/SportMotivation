import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/lib/auth-store";

/**
 * Demandes adressées à l'admin d'un défi + réponse de l'admin.
 *
 * Deux impasses que ces appels débloquent, côté joueur :
 *  - il a fait un sport absent de la liste → `useRequestActivity` ;
 *  - le défi n'accepte les séances que le jour même, ou une autre règle le gêne
 *    → `useRequestRuleChange`.
 * Côté admin, `useAddActivity` ajoute le sport demandé d'un seul geste depuis la
 * notification (une règle, elle, se change dans l'écran de modification : elle
 * vaut pour tout le monde).
 *
 * Toutes ces RPC sont anti-spam côté SQL (une demande par sujet et par joueur
 * sur 7 jours) et renvoient `false` quand rien n'a été envoyé.
 */

/** Règles qu'un membre peut demander à revoir (doit matcher `request_rule_change`). */
export type RequestableRule = "publication_deadline" | "min_duration" | "vote_deadline";

export function useRequestActivity(groupId: string) {
  return useMutation({
    mutationFn: async (activity: string): Promise<boolean> => {
      const { data, error } = await supabase.rpc("request_group_activity", {
        p_group_id: groupId,
        p_activity: activity,
      });
      if (error) throw error;
      return data as boolean;
    },
  });
}

export function useRequestRuleChange(groupId: string) {
  return useMutation({
    mutationFn: async (rule: RequestableRule): Promise<boolean> => {
      const { data, error } = await supabase.rpc("request_rule_change", {
        p_group_id: groupId,
        p_rule: rule,
      });
      if (error) throw error;
      return data as boolean;
    },
  });
}

/** L'admin ajoute le sport demandé. Rafraîchit le groupe (règles, chips d'activités). */
export function useAddActivity(groupId: string) {
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  return useMutation({
    mutationFn: async ({ activity, requesterId }: { activity: string; requesterId?: string | null }) => {
      const { error } = await supabase.rpc("add_group_activity", {
        p_group_id: groupId,
        p_activity: activity,
        p_requester_id: requesterId ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      // ⚠ Sans cette invalidation, l'écran Notifications relisait l'ancien jeu
      // d'activités et le bouton « Ajouter le sport » réapparaissait alors qu'il
      // venait d'être ajouté (c'est ce que voyait Romain au retour sur les notifs).
      queryClient.invalidateQueries({ queryKey: ["groups-activities"] });
      // Le demandeur reçoit une notification de confirmation ; la mienne (admin)
      // reste, mais son bouton doit passer à « ajouté » — d'où le rafraîchissement.
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
}

/**
 * Pour un lot de défis, l'ensemble (en minuscules) de leurs sports acceptés.
 *
 * Sert à l'écran Notifications : une demande d'ajout dont le sport figure déjà
 * dans le défi doit s'afficher « ajouté », y compris après un rechargement (l'état
 * local ne survit pas au remontage). Une seule requête pour tous les défis cités.
 */
export function useGroupsActivitySets(groupIds: string[]) {
  const key = [...new Set(groupIds)].sort();
  return useQuery({
    queryKey: ["groups-activities", key],
    enabled: key.length > 0,
    staleTime: 30_000,
    queryFn: async (): Promise<Record<string, Set<string>>> => {
      const { data, error } = await supabase
        .from("groups")
        .select("id, accepted_activities")
        .in("id", key);
      if (error) throw error;
      const map: Record<string, Set<string>> = {};
      for (const row of data ?? []) {
        const list = Array.isArray(row.accepted_activities)
          ? (row.accepted_activities as string[])
          : [];
        map[row.id] = new Set(list.map((a) => a.trim().toLowerCase()));
      }
      return map;
    },
  });
}

/** L'admin refuse l'ajout d'un sport (commentaire facultatif) → notif au demandeur. */
export function useRejectActivity(groupId: string) {
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  return useMutation({
    mutationFn: async (args: { activity: string; requesterId?: string | null; comment?: string }) => {
      const { error } = await supabase.rpc("reject_group_activity", {
        p_group_id: groupId,
        p_activity: args.activity,
        p_requester_id: args.requesterId ?? "",
        p_comment: args.comment ?? undefined,
      });
      if (error) throw new Error(mapRequestError(error.message));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
}

/** L'admin ouvre un vote de groupe pour ajouter un sport. */
export function useStartActivityVote(groupId: string) {
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  return useMutation({
    mutationFn: async (args: { activity: string; requesterId?: string | null }) => {
      const { error } = await supabase.rpc("start_activity_vote", {
        p_group_id: groupId,
        p_activity: args.activity,
        p_requester_id: args.requesterId ?? undefined,
      });
      if (error) throw new Error(mapRequestError(error.message));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
}

/** Voter oui/non sur l'ajout d'un sport (depuis la notification). */
export function useCastActivityVote() {
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  return useMutation({
    mutationFn: async ({ proposalId, value }: { proposalId: string; value: boolean }) => {
      const { data, error } = await supabase.rpc("cast_activity_vote", {
        p_proposal_id: proposalId,
        p_value: value,
      });
      if (error) throw new Error(mapRequestError(error.message));
      return data as string; // 'pending' | 'accepted' | 'rejected'
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["groups-activities"] });
      queryClient.invalidateQueries({ queryKey: ["activity-vote"] });
    },
  });
}

/**
 * Mes votes sur les propositions d'ajout de sport, par identifiant de proposition.
 * Sert à garder le bouton « Pour/Contre » sur son état « voté » après rechargement.
 */
export function useMyActivityVotes() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: ["activity-vote", "mine", user?.id],
    enabled: !!user?.id,
    staleTime: 15_000,
    queryFn: async (): Promise<Record<string, boolean>> => {
      const { data, error } = await supabase
        .from("activity_proposal_votes")
        .select("proposal_id, value")
        .eq("voter_id", user!.id);
      if (error) return {};
      const map: Record<string, boolean> = {};
      for (const row of data ?? []) map[row.proposal_id] = row.value;
      return map;
    },
  });
}

/** Le joueur demande à dépasser sa limite de séances pour un jour donné. */
export function useRequestSessionLimit(groupId: string) {
  return useMutation({
    mutationFn: async (day: string): Promise<boolean> => {
      const { data, error } = await supabase.rpc("request_session_limit", {
        p_group_id: groupId,
        p_day: day,
      });
      if (error) throw new Error(mapRequestError(error.message));
      return data as boolean;
    },
  });
}

/** L'admin accorde une séance de plus ce jour-là. */
export function useGrantSessionLimit(groupId: string) {
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  return useMutation({
    mutationFn: async ({ userId, day }: { userId: string; day: string }) => {
      const { error } = await supabase.rpc("grant_session_limit", {
        p_group_id: groupId,
        p_user_id: userId,
        p_day: day,
      });
      if (error) throw new Error(mapRequestError(error.message));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
}

export function mapRequestError(message: string): string {
  if (message.includes("NOT_MEMBER")) return "Tu n'es plus membre de ce défi.";
  if (message.includes("NOT_ADMIN")) return "Seul l'admin peut faire ça.";
  if (message.includes("ACTIVITY_REQUIRED")) return "Précise le sport concerné.";
  if (message.includes("UNKNOWN_RULE")) return "Cette règle ne peut pas être demandée.";
  if (message.includes("ALREADY_ADDED")) return "Ce sport fait déjà partie du défi.";
  if (message.includes("VOTE_ALREADY_OPEN")) return "Un vote est déjà ouvert pour ce sport.";
  if (message.includes("PROPOSAL_NOT_FOUND")) return "Ce vote n'existe plus.";
  if (message.includes("GROUP_NOT_FOUND")) return "Défi introuvable.";
  return message;
}
