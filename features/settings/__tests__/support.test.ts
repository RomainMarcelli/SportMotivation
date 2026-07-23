import { SUPPORT_EMAIL, supportMailto, timezoneLabel } from "../support";

describe("supportMailto", () => {
  const base = { version: "1.0.0", platform: "ios", osVersion: "18.2" };

  it("vise l'adresse de support", () => {
    expect(supportMailto(base).startsWith(`mailto:${SUPPORT_EMAIL}?`)).toBe(true);
  });

  // Version et plateforme sont les deux informations qu'on redemande toujours.
  it("pré-remplit version et appareil", () => {
    const body = decodeURIComponent(supportMailto(base).split("&body=")[1]);
    expect(body).toContain("Version : 1.0.0");
    expect(body).toContain("Appareil : ios 18.2");
  });

  it("ajoute le compte quand on le connaît", () => {
    const body = decodeURIComponent(supportMailto({ ...base, account: "romz" }).split("&body=")[1]);
    expect(body).toContain("Compte : romz");
  });

  it("se passe du compte et de la version d'OS", () => {
    const body = decodeURIComponent(
      supportMailto({ version: "1.0.0", platform: "web" }).split("&body=")[1]
    );
    expect(body).toContain("Appareil : web");
    expect(body).not.toContain("Compte :");
  });

  // Un sujet non encodé casserait le lien dès le premier espace.
  it("encode le sujet", () => {
    expect(supportMailto(base)).toContain("subject=Sport%20Motiv%201.0.0");
  });
});

describe("timezoneLabel", () => {
  it("ne garde que la ville", () => {
    expect(timezoneLabel("Europe/Paris")).toBe("Paris");
    expect(timezoneLabel("America/Argentina/Buenos_Aires")).toBe("Buenos Aires");
  });

  it("laisse tel quel un identifiant sans barre", () => {
    expect(timezoneLabel("UTC")).toBe("UTC");
  });

  it("gère l'absence de fuseau", () => {
    expect(timezoneLabel(null)).toBe("—");
    expect(timezoneLabel(undefined)).toBe("—");
  });
});
