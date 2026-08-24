import { generateInviteCode, isValidInviteCode, normalizeInviteCode } from "../group-code";

describe("generateInviteCode", () => {
  it("génère toujours un code à 6 chiffres", () => {
    for (let i = 0; i < 500; i++) {
      const code = generateInviteCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it("génère des codes dans la plage 100000-999999", () => {
    for (let i = 0; i < 500; i++) {
      const n = Number(generateInviteCode());
      expect(n).toBeGreaterThanOrEqual(100000);
      expect(n).toBeLessThanOrEqual(999999);
    }
  });
});

describe("isValidInviteCode", () => {
  it("accepte un code à 6 chiffres", () => {
    expect(isValidInviteCode("123456")).toBe(true);
  });

  it("ignore les espaces autour", () => {
    expect(isValidInviteCode("  123456  ")).toBe(true);
  });

  it("rejette moins ou plus de 6 chiffres", () => {
    expect(isValidInviteCode("12345")).toBe(false);
    expect(isValidInviteCode("1234567")).toBe(false);
  });

  it("rejette les caractères non numériques", () => {
    expect(isValidInviteCode("12345a")).toBe(false);
    expect(isValidInviteCode("abcdef")).toBe(false);
  });
});

describe("normalizeInviteCode", () => {
  it("retire les caractères non numériques", () => {
    expect(normalizeInviteCode("12-34 56")).toBe("123456");
  });

  it("tronque à 6 chiffres", () => {
    expect(normalizeInviteCode("1234567890")).toBe("123456");
  });
});
