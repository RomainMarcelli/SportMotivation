import { LinearGradient } from "expo-linear-gradient";
import { Flame, type LucideIcon } from "lucide-react-native";

import { colors, gradients } from "@/constants/colors";
import { glow as glowStyle } from "@/lib/shadow";

type Props = {
  /** Côté du badge carré arrondi (px). */
  size?: number;
  /** Taille de l'icône (défaut ≈ 47% de `size`). */
  iconSize?: number;
  /** Rayon des coins (défaut ≈ 31% de `size`). */
  radius?: number;
  /** Affiche le glow coral sous le badge (défaut true). */
  glow?: boolean;
  /** Icône affichée dans le badge (défaut : la flamme de la marque). */
  icon?: LucideIcon;
};

/**
 * Marque Sport Motiv : badge dégradé `brand` + icône Flame. Une seule source pour le
 * logo (topbar onboarding, hero sign-in/sign-up…). Ne jamais l'envelopper dans une
 * layout-animation `entering` (contient un `expo-linear-gradient`) — utiliser `Reveal`.
 */
export function BrandMark({
  size = 64,
  iconSize,
  radius,
  glow = true,
  icon: Icon = Flame,
}: Props) {
  const r = radius ?? Math.round(size * 0.31);
  const icon = iconSize ?? Math.round(size * 0.47);

  return (
    <LinearGradient
      {...gradients.brand}
      style={{
        width: size,
        height: size,
        borderRadius: r,
        alignItems: "center",
        justifyContent: "center",
        ...(glow
          ? glowStyle({
              color: colors.coral,
              offsetY: Math.round(size * 0.22),
              radius: Math.round(size * 0.32),
              opacity: 0.5,
            })
          : null),
      }}
    >
      <Icon size={icon} color={colors.onCoral} strokeWidth={2.4} />
    </LinearGradient>
  );
}
