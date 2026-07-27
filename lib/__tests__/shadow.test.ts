import { Platform } from "react-native";

import { glow } from "../shadow";

/**
 * `glow` produit une ombre colorée cross-platform. Le vrai piège est le WEB :
 * React Native Web ignore les props `shadow*` (dépréciées) et n'accepte que
 * `boxShadow`, une chaîne CSS. Le passage hex → rgba se fait à la main — une
 * conversion facile à casser (mauvais slice, base 16 oubliée). On la vérifie
 * donc au caractère près, et on s'assure que chaque plateforme ne renvoie QUE
 * les clés qui la concernent (toEqual, pas toMatchObject).
 *
 * On force `Platform.OS` car `glow` le lit à l'appel : c'est le seul moyen de
 * couvrir la branche web depuis l'environnement de test (natif par défaut).
 */
describe("glow", () => {
  const originalOS = Platform.OS;
  afterAll(() => {
    Platform.OS = originalOS;
  });

  describe("natif (iOS / Android)", () => {
    it("renvoie les props shadow* natives, sans boxShadow", () => {
      Platform.OS = "ios";
      expect(glow({ color: "#FF6B4A", offsetY: 16, radius: 32, opacity: 0.4, elevation: 10 })).toEqual({
        shadowColor: "#FF6B4A",
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.4,
        shadowRadius: 32,
        elevation: 10,
      });
    });

    it("applique les valeurs par défaut", () => {
      Platform.OS = "android";
      expect(glow({ color: "#000000" })).toEqual({
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 8,
      });
    });
  });

  describe("web", () => {
    it("convertit correctement hex → rgba dans boxShadow", () => {
      Platform.OS = "web";
      // #FF0080 → 255, 0, 128 ; spread négatif conservé (rendu diffus de la maquette).
      expect(glow({ color: "#FF0080", offsetY: 12, radius: 20, spread: -16, opacity: 0.5 })).toEqual({
        boxShadow: "0px 12px 20px -16px rgba(255, 0, 128, 0.5)",
      });
    });

    it("utilise les valeurs par défaut (spread 0)", () => {
      Platform.OS = "web";
      expect(glow({ color: "#0A0A0A" })).toEqual({
        boxShadow: "0px 12px 20px 0px rgba(10, 10, 10, 0.5)",
      });
    });
  });
});
