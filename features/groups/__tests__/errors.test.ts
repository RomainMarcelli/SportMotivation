import { classifyGroupError } from "../errors";

describe("classifyGroupError", () => {
  it("détecte une fonction RPC manquante (PGRST202)", () => {
    expect(classifyGroupError({ code: "PGRST202", message: "x" }).kind).toBe("rpc_missing");
  });
  it("détecte 'Could not find the function'", () => {
    expect(
      classifyGroupError({ message: "Could not find the function public.get_group_dashboard" }).kind
    ).toBe("rpc_missing");
  });
  it("détecte une erreur réseau", () => {
    expect(classifyGroupError({ message: "Network request failed" }).kind).toBe("network");
  });
  it("détecte un accès refusé / introuvable", () => {
    expect(classifyGroupError({ message: "Groupe introuvable ou accès refusé." }).kind).toBe(
      "access_denied"
    );
    expect(classifyGroupError({ message: "permission denied for table groups" }).kind).toBe(
      "access_denied"
    );
  });
  it("retombe sur 'unknown' sinon", () => {
    expect(classifyGroupError({ message: "boom" }).kind).toBe("unknown");
  });
  it("fournit toujours un message utilisateur non vide", () => {
    expect(classifyGroupError(null).message.length).toBeGreaterThan(0);
  });
});
