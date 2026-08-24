import { LinearGradient } from "expo-linear-gradient";

import { colors } from "@/constants/colors";

type Props = {
  /** Hauteur du fondu (px). */
  height?: number;
};

/**
 * Fondu plein largeur `ink → transparent` ancré en haut de l'écran (comme la statusbar de la
 * maquette : `linear-gradient(ink 62%, transparent)`). Posé AU-DESSUS d'`AppBackground` mais
 * sous le contenu : il aplatit la zone du header sur de l'`ink` plein → aucun bord de halo ni
 * banding visible derrière le header, qui se fond proprement dans le fond. `pointerEvents` off.
 */
export function TopFade({ height = 168 }: Props) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[colors.ink, colors.ink, "transparent"]}
      locations={[0, 0.55, 1]}
      style={{ position: "absolute", top: 0, left: 0, right: 0, height }}
    />
  );
}
