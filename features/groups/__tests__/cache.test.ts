import type { QueryClient } from "@tanstack/react-query";

import { invalidateMembership } from "../cache";

/**
 * `invalidateMembership` centralise TOUTES les invalidations déclenchées quand
 * on rejoint / crée / quitte un groupe. Le bug d'origine : chaque écran câblait
 * ses invalidations dans son coin et le profil avait été oublié → un groupe
 * fraîchement rejoint restait invisible dans l'onglet Profil.
 *
 * On teste donc l'ENSEMBLE EXACT des clés invalidées, pas seulement quelques
 * unes : c'est le seul moyen d'attraper une régression « on a oublié une clé ».
 * Un faux QueryClient (juste `invalidateQueries` espionné) suffit — aucune
 * dépendance réseau.
 */

function makeSpyClient() {
  const invalidateQueries = jest.fn();
  const client = { invalidateQueries } as unknown as QueryClient;
  // Récupère la liste des queryKey passées, dans l'ordre.
  const invalidatedKeys = () =>
    invalidateQueries.mock.calls.map((c) => (c[0] as { queryKey: unknown[] }).queryKey);
  return { client, invalidateQueries, invalidatedKeys };
}

describe("invalidateMembership", () => {
  it("invalide les caches globaux liés à « mes groupes » (profil compris)", () => {
    const { client, invalidatedKeys } = makeSpyClient();
    invalidateMembership(client);

    const keys = invalidatedKeys();
    // Le profil (profile-groups / profile-stats) est le cas régressé : il DOIT y être.
    expect(keys).toEqual([
      ["my-groups"],
      ["profile-groups"],
      ["profile-stats"],
      ["my-invitations"],
    ]);
  });

  it("sans groupId, n'invalide aucun cache propre à un groupe", () => {
    const { client, invalidatedKeys } = makeSpyClient();
    invalidateMembership(client);

    const scoped = invalidatedKeys().filter((k) => k.length > 1);
    expect(scoped).toEqual([]);
  });

  it("avec groupId, ajoute les caches propres à ce groupe", () => {
    const { client, invalidateQueries, invalidatedKeys } = makeSpyClient();
    invalidateMembership(client, "grp-42");

    // 4 caches globaux + 4 caches propres au groupe.
    expect(invalidateQueries).toHaveBeenCalledTimes(8);
    expect(invalidatedKeys()).toEqual(
      expect.arrayContaining([
        ["group", "grp-42"],
        ["group-members", "grp-42"],
        ["sessions", "grp-42"],
        ["pot", "grp-42"],
      ])
    );
  });
});
