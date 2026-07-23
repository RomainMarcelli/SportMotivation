import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

/**
 * Compteur qui s'incrémente **à chaque arrivée** sur l'écran.
 *
 * Les onglets restent montés quand on navigue : une animation câblée sur le
 * montage (compteurs qui grimpent, anneau qui se remplit) ne se joue donc qu'une
 * seule fois, à la toute première visite. En passant cette valeur en `key`, les
 * composants animés sont remontés et rejouent leur entrée à chaque retour.
 *
 * ```tsx
 * const replay = useFocusReplay();
 * <CountUp key={replay} to={38} />
 * ```
 */
export function useFocusReplay(): number {
  const [tick, setTick] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setTick((value) => value + 1);
    }, [])
  );

  return tick;
}
