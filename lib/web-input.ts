import { Platform, type TextStyle } from "react-native";

/**
 * Neutralise l'anneau de focus du navigateur sur les champs de saisie.
 *
 * Sur le web, un `TextInput` devient un `<input>` : Chrome et Safari lui posent
 * leur propre liseré par-dessus notre bordure, un cadre blanc/bleu qui n'existe
 * sur aucune maquette et qui jure avec la DA.
 *
 * ⚠ On ne supprime pas l'indication de focus pour autant — nos champs la
 * portent déjà (bordure corail + fond plus clair). La navigation au clavier
 * reste donc lisible, ce qui serait faux avec un simple `outline: none` sur un
 * champ sans état visuel propre.
 */
export const WEB_INPUT_RESET = (Platform.OS === "web"
  ? { outlineStyle: "none", outlineWidth: 0 }
  : null) as TextStyle | null;
