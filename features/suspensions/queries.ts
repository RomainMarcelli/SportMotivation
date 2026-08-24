import { useQuery } from "@tanstack/react-query";

import { debugError } from "@/lib/log";
import { supabase } from "@/lib/supabase";

import { mapSuspension, type Suspension, type SuspensionRow } from "./suspension";

/**
 * Suspensions d'un groupe (RPC `get_group_suspensions`, SQL 052). Best-effort :
 * dégrade à `[]` si la lecture échoue (RLS / RPC pas encore déployée). La table
 * `suspensions` n'étant pas encore dans les types générés, on passe par `.rpc`
 * casté en `never` — même convention que `unlock_pot` / `remind_unpaid_members`.
 */
export function useGroupSuspensions(groupId: string | undefined) {
  return useQuery({
    queryKey: ["suspensions", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<Suspension[]> => {
      const { data, error } = await supabase.rpc(
        "get_group_suspensions" as never,
        { p_group_id: groupId } as never
      );
      if (error) {
        debugError("get_group_suspensions", error);
        return [];
      }
      return ((data as SuspensionRow[] | null) ?? []).map(mapSuspension);
    },
  });
}
