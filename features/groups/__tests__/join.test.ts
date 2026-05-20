import { mapJoinError } from "../join";

describe("mapJoinError", () => {
  it("traduit GROUP_NOT_FOUND", () => {
    expect(mapJoinError("GROUP_NOT_FOUND")).toBe("Aucun groupe trouvé avec ce code.");
  });

  it("traduit GROUP_FULL", () => {
    expect(mapJoinError("...GROUP_FULL...")).toBe("Ce groupe est complet (10 membres maximum).");
  });

  it("traduit ALREADY_MEMBER", () => {
    expect(mapJoinError("ALREADY_MEMBER")).toBe("Tu fais déjà partie de ce groupe.");
  });

  it("traduit GROUP_NOT_JOINABLE", () => {
    expect(mapJoinError("GROUP_NOT_JOINABLE")).toBe(
      "Ce groupe n'accepte plus de nouveaux membres."
    );
  });

  it("retourne le message brut si non reconnu", () => {
    expect(mapJoinError("some other error")).toBe("some other error");
  });
});
