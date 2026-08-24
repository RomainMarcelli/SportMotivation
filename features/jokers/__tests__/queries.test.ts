import { mapJokerError } from "../queries";

/**
 * `mapJokerError` traduit les codes de la RPC `use_joker`. Le joker mensuel a
 * peu d'échecs possibles ; le cas central est « déjà utilisé ce mois-ci », qui
 * doit être formulé clairement (l'utilisateur doit comprendre qu'il devra
 * attendre le mois suivant, pas qu'il y a un bug).
 */
describe("mapJokerError", () => {
  it("traduit les codes métier connus", () => {
    expect(mapJokerError("NOT_AUTHENTICATED")).toMatch(/connecté/i);
    expect(mapJokerError("NOT_MEMBER")).toMatch(/membre/i);
    expect(mapJokerError("JOKER_ALREADY_USED")).toMatch(/déjà utilisé ton joker/i);
  });

  it("laisse passer un message inconnu", () => {
    expect(mapJokerError("Erreur inattendue")).toBe("Erreur inattendue");
  });
});
