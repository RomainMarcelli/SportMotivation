import { useEffect, useState } from "react";
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from "react-native-svg";

import { gradients } from "@/constants/colors";
import { fontFamily } from "@/constants/fonts";
import { countAt } from "@/lib/count-up";
import { useAppReducedMotion } from "@/hooks/useAppReducedMotion";

type Props = {
  /** Valeur cible (atteinte en fin d'animation). */
  to: number;
  /** Suffixe collé (ex. « € »). Un espace insécable est recommandé («  € »). */
  suffix?: string;
  /** Taille de police en px (défaut 62, comme la maquette). */
  fontSize?: number;
  /** Durée du comptage en ms (défaut 1400, comme la clôture). */
  duration?: number;
  /** Identifiant du dégradé SVG (unique si plusieurs instances à l'écran). */
  gradientId?: string;
};

/**
 * Grand nombre en **texte dégradé** coral→amber (maquette `sport-motiv-cloture.html` : le
 * montant de la cagnotte débloquée). RN n'a pas de « clip du dégradé sur les glyphes » natif
 * (pas de `background-clip:text`, et `@react-native-masked-view` n'est pas installé) : on passe
 * par un `<Text>` **SVG** rempli d'un `LinearGradient`, qui fonctionne iOS + Android + web.
 *
 * La valeur monte de 0 → `to` (ease-out cubic, boucle `requestAnimationFrame` en JS comme
 * `CountUp`). Respecte `prefers-reduced-motion` (valeur finale immédiate).
 */
export function GradientNumber({
  to,
  suffix = "",
  fontSize = 62,
  duration = 1400,
  gradientId = "gradient-number",
}: Props) {
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

  // Boîte serrée autour des glyphes (les chiffres n'ont pas de jambage) ; la ligne de base
  // est posée près du bas pour un centrage vertical correct sur les trois plateformes.
  const height = Math.round(fontSize * 1.14);
  const baseline = Math.round(height * 0.82);

  return (
    <Svg width="100%" height={height} accessibilityLabel={`${value}${suffix}`}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          {gradients.brand.colors.map((c, i) => (
            <Stop
              key={i}
              offset={gradients.brand.locations[i] ?? i / (gradients.brand.colors.length - 1)}
              stopColor={c}
            />
          ))}
        </LinearGradient>
      </Defs>
      <SvgText
        x="50%"
        y={baseline}
        textAnchor="middle"
        fontSize={fontSize}
        fontFamily={fontFamily.displayExtrabold}
        fill={`url(#${gradientId})`}
      >
        {value}
        {suffix}
      </SvgText>
    </Svg>
  );
}
