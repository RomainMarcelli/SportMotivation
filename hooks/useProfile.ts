import { useQuery } from "@tanstack/react-query";

import { useCurrentUser } from "@/lib/auth-store";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

export type UserProfile = Database["public"]["Tables"]["users"]["Row"];

export function useProfile() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<UserProfile | null> => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function isProfileComplete(profile: UserProfile | null | undefined): boolean {
  return !!profile?.first_name && !!profile?.last_name;
}
