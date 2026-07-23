import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentUser } from "@/lib/auth-store";
import { supabase } from "@/lib/supabase";
import type { Database, Json } from "@/types/database.types";
import { invalidateMembership } from "./cache";

export type UserSearchResult = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  avatar_color: string | null;
  avatar_icon: string | null;
};

type DeadlineType = Database["public"]["Enums"]["deadline_type"];

export type GroupPreviewById = {
  id: string;
  name: string;
  description: string | null;
  challenge_start: string;
  challenge_end: string;
  penalty_amount: number;
  accepted_activities: string[];
  min_duration_min: number;
  publication_deadline: DeadlineType;
  vote_deadline: DeadlineType;
  blame_threshold: number;
  max_excuses: number | null;
  max_members: number;
  member_count: number;
};

export type GroupInvitation = {
  id: string;
  status: "pending" | "accepted" | "refused";
  created_at: string;
  resolved_at: string | null;
  invited_user_id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  avatar_color: string | null;
  avatar_icon: string | null;
};

export function mapInviteError(message: string): string {
  if (message.includes("NOT_MEMBER")) return "Tu dois faire partie du défi pour inviter.";
  if (message.includes("NOT_ADMIN")) return "Seul un admin peut gérer les invitations.";
  if (message.includes("ALREADY_MEMBER")) return "Ce joueur fait déjà partie du groupe.";
  if (message.includes("GROUP_NOT_FOUND")) return "Groupe introuvable.";
  if (message.includes("GROUP_FULL")) return "Le groupe est complet.";
  if (message.includes("INVITATION_RESOLVED")) return "Cette invitation a déjà été traitée.";
  return message;
}

/** Recherche d'utilisateurs par pseudo (activée à partir de 2 caractères). */
export function useSearchUsers(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["search-users", trimmed],
    enabled: trimmed.length >= 2,
    queryFn: async (): Promise<UserSearchResult[]> => {
      const { data, error } = await supabase.rpc("search_users_by_username", { p_query: trimmed });
      if (error) throw error;
      return (data ?? []) as UserSearchResult[];
    },
  });
}

/**
 * Statut de MES invitations, par identifiant.
 *
 * Sert à ne plus proposer « Voir l'invitation » sur une invitation déjà
 * acceptée ou refusée. Best-effort : `{}` si la lecture est refusée, le bouton
 * reste alors affiché — mieux qu'un état inventé.
 */
export function useMyInvitationStatuses() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: ["my-invitations", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase
        .from("group_invitations")
        .select("id, status")
        .eq("invited_user_id", user!.id);
      if (error) return {};
      const map: Record<string, string> = {};
      for (const row of data ?? []) map[row.id] = row.status;
      return map;
    },
  });
}

/**
 * Identifiants déjà invités (statut « pending ») d'un groupe — lisible par
 * **tout membre**.
 *
 * Contrairement à `useGroupInvitations` (RPC `get_group_invitations`, réservée à
 * l'admin, plus riche : avatars, renvoyer/annuler), on lit ici directement la
 * table : sa RLS autorise `invited_user_id = auth.uid() OR is_group_member(...)`.
 * Sert au bouton « Invité » de la recherche par pseudo, désormais ouverte à tous.
 * Best-effort : `Set` vide si la lecture échoue (le bouton reste « Inviter »,
 * une seconde invitation étant de toute façon idempotente côté SQL).
 */
export function useGroupPendingInvitees(groupId: string | undefined) {
  return useQuery({
    queryKey: ["group-pending-invitees", groupId],
    enabled: !!groupId,
    staleTime: 15_000,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("group_invitations")
        .select("invited_user_id, status")
        .eq("group_id", groupId!)
        .eq("status", "pending");
      if (error) return new Set();
      return new Set((data ?? []).map((r) => r.invited_user_id));
    },
  });
}

/** Invite un utilisateur dans un groupe (tout membre — cf. SQL 040). */
export function useInviteUser(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("invite_user_to_group", {
        p_group_id: groupId,
        p_user_id: userId,
      });
      if (error) throw new Error(mapInviteError(error.message));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-invitations", groupId] });
      queryClient.invalidateQueries({ queryKey: ["group-pending-invitees", groupId] });
    },
  });
}

/** Liste les invitations d'un groupe (admin uniquement, via RPC SECURITY DEFINER). */
export function useGroupInvitations(groupId: string | undefined) {
  return useQuery({
    queryKey: ["group-invitations", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<GroupInvitation[]> => {
      const { data, error } = await supabase.rpc(
        "get_group_invitations" as never,
        { p_group_id: groupId } as never
      );
      if (error) throw error;
      return (data ?? []) as GroupInvitation[];
    },
  });
}

/** Annule (supprime) une invitation en attente (admin). */
export function useCancelInvitation(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase.rpc(
        "cancel_invitation" as never,
        { p_invitation_id: invitationId } as never
      );
      if (error) throw new Error(mapInviteError(error.message));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-invitations", groupId] });
      // Le bouton « Invité » de la recherche par pseudo doit repasser à « Inviter ».
      queryClient.invalidateQueries({ queryKey: ["group-pending-invitees", groupId] });
    },
  });
}

/** Aperçu d'un groupe par id (pour accepter une invitation). */
export function useGroupPreviewById(groupId: string | undefined) {
  return useQuery({
    queryKey: ["group-preview-id", groupId],
    enabled: !!groupId,
    retry: false,
    queryFn: async (): Promise<GroupPreviewById | null> => {
      const { data, error } = await supabase.rpc("get_group_preview_by_id", {
        p_group_id: groupId!,
      });
      if (error) throw error;
      const rows = (data ?? []) as Record<string, unknown>[];
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        ...(r as unknown as GroupPreviewById),
        accepted_activities: (r.accepted_activities as string[] | null) ?? [],
        member_count: Number(r.member_count ?? 0),
      };
    },
  });
}

type AcceptArgs = {
  invitationId: string;
  weeklyTarget: number;
  penaltyAmount: number;
  rulesSnapshot: Json;
};

/** Accepte une invitation (rejoint le groupe) + enregistre l'acceptation des règles. */
export function useAcceptInvitation() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invitationId,
      weeklyTarget,
      penaltyAmount,
      rulesSnapshot,
    }: AcceptArgs): Promise<string> => {
      if (!user) throw new Error("Aucun utilisateur connecté.");
      const { data, error } = await supabase.rpc("accept_invitation", {
        p_invitation_id: invitationId,
        p_weekly_target: weeklyTarget,
        p_penalty_amount: penaltyAmount,
      });
      if (error) throw new Error(mapInviteError(error.message));
      const groupId = data as unknown as string;

      const { error: acceptanceError } = await supabase.from("rule_acceptances").upsert(
        { group_id: groupId, user_id: user.id, rules_snapshot: rulesSnapshot },
        { onConflict: "group_id,user_id" }
      );
      if (acceptanceError) throw acceptanceError;

      // Prévient le groupe de l'arrivée. Best-effort : rater la notification ne
      // doit pas faire échouer une adhésion qui, elle, a bien eu lieu.
      await supabase.rpc("notify_join_from_invitation", { p_group_id: groupId });

      return groupId;
    },
    onSuccess: (groupId) => {
      invalidateMembership(queryClient, groupId);
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
}

/** Refuse une invitation (update status). */
export function useRefuseInvitation() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from("group_invitations")
        .update({ status: "refused", resolved_at: new Date().toISOString() })
        .eq("id", invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
}
