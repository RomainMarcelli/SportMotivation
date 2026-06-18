/**
 * Sport Motiv — Typographie.
 *
 * Display = Bricolage Grotesque (titres, chiffres, libellés de boutons).
 * Body    = Plus Jakarta Sans (paragraphes, champs, labels, captions).
 *
 * Les polices personnalisées RN se gèrent **par graisse** : on choisit la
 * `fontFamily` correspondant au poids voulu et on NE met PAS `fontWeight`
 * (évite le faux-gras sur Android). Utiliser les classes Tailwind `font-display*`
 * / `font-body*` (voir `tailwind.config.js`) ou directement ces constantes.
 */

import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";

/** Map passée à `useFonts()` dans `app/_layout.tsx`. */
export const fontsToLoad = {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
};

/** Noms de familles à utiliser dans les `style={{ fontFamily }}`. */
export const fontFamily = {
  displayRegular: "BricolageGrotesque_400Regular",
  displayMedium: "BricolageGrotesque_500Medium",
  displaySemibold: "BricolageGrotesque_600SemiBold",
  displayBold: "BricolageGrotesque_700Bold",
  displayExtrabold: "BricolageGrotesque_800ExtraBold",
  bodyRegular: "PlusJakartaSans_400Regular",
  bodyMedium: "PlusJakartaSans_500Medium",
  bodySemibold: "PlusJakartaSans_600SemiBold",
  bodyBold: "PlusJakartaSans_700Bold",
  bodyExtrabold: "PlusJakartaSans_800ExtraBold",
} as const;

export type FontFamilyToken = keyof typeof fontFamily;
