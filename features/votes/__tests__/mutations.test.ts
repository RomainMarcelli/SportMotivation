import { mapVoteError } from "../mutations";

/**
 * `mapVoteError` traduit les codes de la RPC `cast_vote`.
 *
 * `CANNOT_VOTE_OWN` et `ALREADY_VOTED` sont les garde-fous métier importants :
 * on ne vote pas sa propre séance et on ne vote qu'une fois. Le message doit
 * l'expliquer plutôt que d'afficher un code — sinon l'utilisateur croit à un bug.
 */
describe("mapVoteError", () => {
  it("traduit les codes métier connus", () => {
    expect(mapVoteError("NOT_AUTHENTICATED")).toMatch(/connecté/i);
    expect(mapVoteError("SESSION_NOT_FOUND")).toMatch(/introuvable/i);
    expect(mapVoteError("NOT_MEMBER")).toMatch(/membre/i);
    expect(mapVoteError("CANNOT_VOTE_OWN")).toMatch(/ta propre séance/i);
    expect(mapVoteError("SESSION_NOT_PENDING")).toMatch(/plus en attente/i);
    expect(mapVoteError("ALREADY_VOTED")).toMatch(/déjà voté/i);
  });

  it("laisse passer un message inconnu", () => {
    expect(mapVoteError("500")).toBe("500");
  });
});
