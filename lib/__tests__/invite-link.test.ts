import { parseInviteData } from "../invite-link";

describe("parseInviteData", () => {
  it("extrait un code brut à 6 chiffres", () => {
    expect(parseInviteData("123456")).toBe("123456");
  });

  it("extrait le code depuis un lien avec ?code=", () => {
    expect(parseInviteData("sportmotiv://group/join-confirm?code=654321")).toBe("654321");
  });

  it("extrait le code depuis un lien exp dev", () => {
    expect(
      parseInviteData("exp://192.168.1.10:8081/--/group/join-confirm?code=111222")
    ).toBe("111222");
  });

  it("extrait le code depuis un chemin se terminant par 6 chiffres", () => {
    expect(parseInviteData("sportmotiv://join/789012")).toBe("789012");
  });

  it("ignore les espaces et tirets dans un code brut", () => {
    expect(parseInviteData("12-34 56")).toBe("123456");
  });

  it("retourne null pour une donnée sans code valide", () => {
    expect(parseInviteData("https://exemple.com/page")).toBeNull();
    expect(parseInviteData("")).toBeNull();
    expect(parseInviteData("abc")).toBeNull();
  });
});
