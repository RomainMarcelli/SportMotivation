import { useQuery } from "@tanstack/react-query";

import { useCurrentUser } from "@/lib/auth-store";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

type GroupRow = Database["public"]["Tables"]["groups"]["Row"];
type MemberRole = Database["public"]["Enums"]["member_role"];

type UserRow = Database["public"]["Tables"]["users"]["Row"];

export type MyGroup = {
  membershipId: string;
  role: MemberRole;
  weeklyTarget: number;
  group: GroupRow;
};

export type GroupMemberWithUser = {
  id: string;
  role: MemberRole;
  weeklyTarget: number;
  targetLocked: boolean;
  joinedAt: string;
  user: UserRow;
};

/**
 * Liste les groupes dont l'utilisateur courant est membre actif.
 * On passe par `group_members` (RLS : is_group_member) avec embed du groupe.
 */
export function useMyGroups() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: ["my-groups", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<MyGroup[]> => {
      const { data, error } = await supabase
        .from("group_members")
        .select("id, role, weekly_target, groups(*)")
        .eq("user_id", user!.id)
        .is("left_at", null)
        .order("joined_at", { ascending: false });
      if (error) throw error;

      return (data ?? [])
        .filter((row) => row.groups !== null)
        .map((row) => ({
          membershipId: row.id,
          role: row.role,
          weeklyTarget: row.weekly_target,
          group: row.groups as unknown as GroupRow,
        }));
    },
  });
}

/** Détail d'un groupe. RLS : lisible si membre ou créateur. */
export function useGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: ["group", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<GroupRow> => {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

/** Membres actifs d'un groupe avec leur profil. RLS : lisible si membre du groupe. */
export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: ["group-members", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<GroupMemberWithUser[]> => {
      const { data, error } = await supabase
        .from("group_members")
        .select("id, role, weekly_target, target_locked, joined_at, users(*)")
        .eq("group_id", groupId!)
        .is("left_at", null)
        .order("joined_at", { ascending: true });
      if (error) throw error;

      return (data ?? [])
        .filter((row) => row.users !== null)
        .map((row) => ({
          id: row.id,
          role: row.role,
          weeklyTarget: row.weekly_target,
          targetLocked: row.target_locked,
          joinedAt: row.joined_at,
          user: row.users as unknown as UserRow,
        }));
    },
  });
}
