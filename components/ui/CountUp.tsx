import { useEffect, useState } from "react";
import { Text, type TextProps } from "react-native";

import { countAt } from "@/lib/count-up";
import { useAppReducedMotion } from "@/hooks/useAppReducedMotion";

type Props = TextProps & {
  /** Valeur cible (atteinte en fin d'animation). */
  to: number;
  /** Durée en ms (défaut 1100, comme la maquette). */
  duration?: number;
  /** Préfixe / suffixe collés au nombre (ex. `€`, `J-`). */
  prefix?: string;
  suffix?: string;
  className?: string;
};

/**
 * Nombre animé de 0 → `to` (ease-out cubic). Boucle `requestAnimationFrame` en JS : fonctionne
 * iOS + Android + web et reste simple (afficher du texte animé depuis le thread UI Reanimated
 * n'est pas fiable). Respecte `prefers-reduced-motion` (valeur finale immédiate).
 */
export function CountUp({ to, duration = 1100, prefix = "", suffix = "", ...rest }: Props) {
  const reduceMotion = useAppReducedMotion();
  const [value, setValue] = useState(reduceMotion ? to : 0);

  useEffect(() => {
    if (reduceMotion) {
      setValue(to);
      return;
    }
    let raf = 0;
    const start = Date.now();
    const tick = () => {
      const progress = Math.min(1, (Date.now() - start) / duration);
      setValue(countAt(to, progress));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration, reduceMotion]);

  return (
    <Text {...rest}>
      {prefix}
      {value}
      {suffix}
    </Text>
  );
}
