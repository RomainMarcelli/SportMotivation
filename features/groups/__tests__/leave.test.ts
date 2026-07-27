import { mapLeaveError } from "../leave";

/**
 * `mapLeaveError` traduit les codes de la RPC `leave_group`.
 *
 * Particularité VOLONTAIRE, différente des autres mappers du projet : la
 * correspondance se fait par **sous-chaîne** (`code.includes(key)`), pas par
 * égalité exacte. Supabase renvoie parfois un message enrobé
 * (`"... NOT_MEMBER ..."` plutôt que `"NOT_MEMBER"` seul) ; le match large
 * permet de reconnaître le cas quand même. Ces tests verrouillent ce contrat.
 */
describe("mapLeaveError", () => {
  it("traduit les codes métier connus (match exact)", () => {
    expect(mapLeaveError("NOT_AUTHENTICATED")).toMatch(/connecté/i);
    expect(mapLeaveError("NOT_MEMBER")).toMatch(/pas membre/i);
    expect(mapLeaveError("LAST_MEMBER")).toMatch(/dernier membre/i);
  });

  // Le point clé : un code enrobé dans un message plus long est reconnu.
  it("reconnaît un code enrobé dans un message plus long", () => {
    expect(mapLeaveError('new row violates ... "LAST_MEMBER"')).toMatch(/dernier membre/i);
    expect(mapLeaveError("Erreur: NOT_MEMBER (RPC leave_group)")).toMatch(/pas membre/i);
  });

  // Sans aucune correspondance, on renvoie le message d'origine intact.
  it("laisse passer un message sans code connu", () => {
    expect(mapLeaveError("Network request failed")).toBe("Network request failed");
  });
});
