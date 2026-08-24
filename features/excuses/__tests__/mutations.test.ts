import { mapExcuseError } from "../mutations";

/**
 * `mapExcuseError` traduit les codes d'erreur métier renvoyés par la RPC
 * `submit_excuse` en messages lisibles. C'est un simple dictionnaire
 * `code -> message` avec repli sur le code brut.
 *
 * Le test verrouille la correspondance : si quelqu'un renomme une clé côté SQL
 * sans mettre à jour ce dictionnaire, l'utilisateur verrait le code technique —
 * ce test échoue avant que ça n'arrive.
 */
describe("mapExcuseError", () => {
  it("traduit les codes métier connus", () => {
    expect(mapExcuseError("NOT_AUTHENTICATED")).toMatch(/connecté/i);
    expect(mapExcuseError("NOT_MEMBER")).toMatch(/membre/i);
    expect(mapExcuseError("GROUP_NOT_FOUND")).toMatch(/introuvable/i);
    expect(mapExcuseError("GROUP_NOT_ACTIVE")).toMatch(/pas en cours/i);
    expect(mapExcuseError("REASON_REQUIRED")).toMatch(/motif/i);
  });

  it("couvre les erreurs de vote d'excuse", () => {
    expect(mapExcuseError("EXCUSE_ALREADY_EXISTS")).toMatch(/déjà une excuse/i);
    expect(mapExcuseError("CANNOT_VOTE_OWN")).toMatch(/ta propre/i);
    expect(mapExcuseError("EXCUSE_NOT_PENDING")).toMatch(/plus en attente/i);
    expect(mapExcuseError("ALREADY_VOTED")).toMatch(/déjà voté/i);
  });

  // Un message réseau ou une erreur inconnue doit rester tel quel plutôt que
  // d'être écrasé par un texte générique trompeur.
  it("laisse passer un message inconnu", () => {
    expect(mapExcuseError("Timeout")).toBe("Timeout");
  });
});
