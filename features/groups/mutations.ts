import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useCurrentUser } from "@/lib/auth-store";
import { toDateOnly } from "@/lib/date";
import { supabase } from "@/lib/supabase";

import type { CreateGroupInput } from "./schemas";
import { buildRulesSnapshot } from "./rules-snapshot";

type CreateGroupArgs = CreateGroupInput & {
  weeklyTarget: number;
};

/**
 * Crée un groupe et inscrit le créateur comme admin (verrouillé), puis enregistre
 * l'acceptation des règles. Les 3 inserts sont autorisés par les policies RLS :
 * - groups : created_by = auth.uid()
 * - group_members : user_id = auth.uid()
 * - rule_acceptances : user_id = auth.uid()
 *
 * Triggers DB automatiques : génération invite_code + création de la cagnotte.
 */
export function useCreateGroup() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateGroupArgs) => {
      if (!user) throw new Error("Aucun utilisateur connecté.");

      const { data: group, error: groupError } = await supabase
        .from("groups")
        .insert({
          name: input.name,
          description: input.description?.trim() || null,
          created_by: user.id,
          challenge_start: toDateOnly(input.challengeStart),
          challenge_end: toDateOnly(input.challengeEnd),
          penalty_amount: input.penaltyAmount,
          accepted_activities: input.acceptedActivities,
          min_duration_min: input.minDurationMin,
          publication_deadline: input.publicationDeadline,
          vote_deadline: input.voteDeadline,
          blame_threshold: input.blameThreshold,
          max_excuses: input.maxExcuses,
          invite_code: "", // remplacé par le trigger generate_invite_code
        })
        .select()
        .single();
      if (groupError) throw groupError;

      const { error: memberError } = await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: user.id,
        role: "admin",
        weekly_target: input.weeklyTarget,
        target_locked: true,
      });
      if (memberError) throw memberError;

      const { error: acceptanceError } = await supabase.from("rule_acceptances").insert({
        group_id: group.id,
        user_id: user.id,
        rules_snapshot: buildRulesSnapshot(group),
      });
      if (acceptanceError) throw acceptanceError;

      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
    },
  });
}
