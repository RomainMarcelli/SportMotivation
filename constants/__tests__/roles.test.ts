import { roleLabel } from "../roles";

describe("roleLabel", () => {
  it("traduit chaque rôle", () => {
    expect(roleLabel("admin")).toBe("Admin");
    expect(roleLabel("treasurer")).toBe("Trésorier");
    expect(roleLabel("member")).toBe("Membre");
  });
});
