import { buildRulesSnapshot, buildRulesSnapshotFromPreview } from "../rules-snapshot";
import type { Database } from "@/types/database.types";

type GroupRow = Database["public"]["Tables"]["groups"]["Row"];

/**
 * Le snapshot fige les règles ACCEPTÉES par un membre au moment où il rejoint.
 * Enjeu métier : si l'admin change une règle plus tard (pénalité, seuil de
 * blâmes…), la preuve de ce que le membre a accepté ne doit pas bouger
 * rétroactivement. Ces tests garantissent qu'aucun champe important n'est oublié
 * dans la copie — un oubli passerait totalement inaperçu à l'exécution.
 */

// Seuls les champs lus par la fonction sont renseignés ; le reste de GroupRow
// n'entre pas dans le snapshot, d'où le cast (on ne teste pas la forme d'une
// ligne DB complète, juste la copie des règles).
const group = {
  name: "Défi de l'été",
  challenge_start: "2026-06-01",
  challenge_end: "2026-08-31",
  penalty_amount: 5,
  accepted_activities: ["running", "cycling"],
  min_duration_min: 30,
  publication_deadline: "same_day",
  vote_deadline: "end_of_week",
  blame_threshold: 3,
  max_excuses: 2,
} as unknown as GroupRow;

describe("buildRulesSnapshot", () => {
  it("recopie fidèlement toutes les règles du groupe", () => {
    const snap = buildRulesSnapshot(group) as Record<string, unknown>;
    expect(snap).toMatchObject({
      name: "Défi de l'été",
      challenge_start: "2026-06-01",
      challenge_end: "2026-08-31",
      penalty_amount: 5,
      accepted_activities: ["running", "cycling"],
      min_duration_min: 30,
      publication_deadline: "same_day",
      vote_deadline: "end_of_week",
      blame_threshold: 3,
      max_excuses: 2,
    });
  });

  // On horodate le snapshot mais sans en figer la valeur (dépend de l'instant) :
  // on vérifie juste que c'est un ISO 8601 valide et cohérent.
  it("horodate avec un ISO 8601 valide", () => {
    const snap = buildRulesSnapshot(group) as Record<string, unknown>;
    const iso = snap.snapshot_at as string;
    expect(typeof iso).toBe("string");
    expect(new Date(iso).toISOString()).toBe(iso);
  });
});

describe("buildRulesSnapshotFromPreview", () => {
  const preview = {
    name: "Défi rejoint par code",
    challenge_start: "2026-01-01",
    challenge_end: "2026-03-31",
    penalty_amount: 10,
    accepted_activities: ["swimming"],
    min_duration_min: 45,
    publication_deadline: "end_of_day",
    vote_deadline: "48h",
    blame_threshold: 2,
    max_excuses: null,
  };

  it("recopie les règles issues de l'aperçu (RPC)", () => {
    const snap = buildRulesSnapshotFromPreview(preview) as Record<string, unknown>;
    expect(snap).toMatchObject(preview);
  });

  // max_excuses = null (illimité) doit rester null, pas devenir 0 ou disparaître.
  it("préserve max_excuses null (illimité)", () => {
    const snap = buildRulesSnapshotFromPreview(preview) as Record<string, unknown>;
    expect(snap.max_excuses).toBeNull();
    expect("max_excuses" in snap).toBe(true);
  });

  it("horodate avec un ISO 8601 valide", () => {
    const snap = buildRulesSnapshotFromPreview(preview) as Record<string, unknown>;
    const iso = snap.snapshot_at as string;
    expect(new Date(iso).toISOString()).toBe(iso);
  });
});
