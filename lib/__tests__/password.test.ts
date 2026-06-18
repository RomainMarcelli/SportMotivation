import { getPasswordChecks, isPasswordStrong } from "../password";

describe("getPasswordChecks", () => {
  it("détecte chaque critère indépendamment", () => {
    expect(getPasswordChecks("").checks).toEqual({
      minLength: false,
      uppercase: false,
      digit: false,
      special: false,
    });
    expect(getPasswordChecks("abcdefgh").checks.minLength).toBe(true);
    expect(getPasswordChecks("A").checks.uppercase).toBe(true);
    expect(getPasswordChecks("1").checks.digit).toBe(true);
    expect(getPasswordChecks("!").checks.special).toBe(true);
  });

  it("ne valide pas la longueur en dessous de 8", () => {
    expect(getPasswordChecks("Ab1!").checks.minLength).toBe(false);
  });

  it("calcule le nombre de critères remplis et le niveau", () => {
    expect(getPasswordChecks("")).toMatchObject({ satisfied: 0, level: 0, label: "" });
    expect(getPasswordChecks("aaaaaaaa")).toMatchObject({ satisfied: 1, level: 1, label: "Faible" });
    expect(getPasswordChecks("Aaaaaaaa")).toMatchObject({ satisfied: 2, level: 2, label: "Moyen" });
    expect(getPasswordChecks("Aaaaaaa1")).toMatchObject({ satisfied: 3, level: 3, label: "Bon" });
    expect(getPasswordChecks("Aaaaaaa1!")).toMatchObject({ satisfied: 4, level: 4, label: "Fort" });
  });

  it("compte les critères même quand la longueur n'est pas atteinte", () => {
    // majuscule + chiffre + spécial mais < 8 caractères → 3 critères
    expect(getPasswordChecks("Ab1!").satisfied).toBe(3);
  });
});

describe("isPasswordStrong", () => {
  it("exige les 4 critères", () => {
    expect(isPasswordStrong("Motdepasse1!")).toBe(true);
    expect(isPasswordStrong("motdepasse1!")).toBe(false); // pas de majuscule
    expect(isPasswordStrong("Motdepasse!")).toBe(false); // pas de chiffre
    expect(isPasswordStrong("Motdepasse1")).toBe(false); // pas de spécial
    expect(isPasswordStrong("Mdp1!")).toBe(false); // trop court
  });
});
