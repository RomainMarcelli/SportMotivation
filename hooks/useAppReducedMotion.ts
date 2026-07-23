import { useReducedMotion } from "react-native-reanimated";

import { useMotionStore } from "@/lib/motion-store";

/**
 * Faut-il jouer les animations ?
 *
 * Remplace `useReducedMotion()` de Reanimated partout dans l'app : le réglage
 * du système **et** celui des Paramètres comptent, et l'un ne peut pas annuler
 * l'autre — si l'appareil demande de réduire les animations, c'est un choix
 * d'accessibilité, l'app n'a pas à passer outre.
 */
export function useAppReducedMotion(): boolean {
  const system = useReducedMotion();
  const manual = useMotionStore((state) => state.reduced);
  return system || manual;
}
