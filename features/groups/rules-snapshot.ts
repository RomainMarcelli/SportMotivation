import type { Database, Json } from "@/types/database.types";

type GroupRow = Database["public"]["Tables"]["groups"]["Row"];

/**
 * Construit le snapshot des règles d'un groupe au moment de l'acceptation.
 * Stocké dans `rule_acceptances.rules_snapshot` pour traçabilité (les règles
 * acceptées ne changent pas même si le groupe est modifié plus tard).
 */
export function buildRulesSnapshot(group: GroupRow): Json {
  return {
    name: group.name,
    challenge_start: group.challenge_start,
    challenge_end: group.challenge_end,
    penalty_amount: group.penalty_amount,
    accepted_activities: group.accepted_activities,
    min_duration_min: group.min_duration_min,
    publication_deadline: group.publication_deadline,
    vote_deadline: group.vote_deadline,
    blame_threshold: group.blame_threshold,
    max_excuses: group.max_excuses,
    snapshot_at: new Date().toISOString(),
  } as Json;
}

/** Variante du snapshot construite depuis l'aperçu (RPC) lors d'une jonction par code. */
export function buildRulesSnapshotFromPreview(preview: {
  name: string;
  challenge_start: string;
  challenge_end: string;
  penalty_amount: number;
  accepted_activities: string[];
  min_duration_min: number;
  publication_deadline: string;
  vote_deadline: string;
  blame_threshold: number;
  max_excuses: number | null;
}): Json {
  return {
    name: preview.name,
    challenge_start: preview.challenge_start,
    challenge_end: preview.challenge_end,
    penalty_amount: preview.penalty_amount,
    accepted_activities: preview.accepted_activities,
    min_duration_min: preview.min_duration_min,
    publication_deadline: preview.publication_deadline,
    vote_deadline: preview.vote_deadline,
    blame_threshold: preview.blame_threshold,
    max_excuses: preview.max_excuses,
    snapshot_at: new Date().toISOString(),
  } as Json;
}
