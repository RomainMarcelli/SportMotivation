import Svg, { Path } from "react-native-svg";

/**
 * Logo Strava officiel (marque « swoosh » monochrome), orange de marque `#FC4C02`.
 *
 * Recréé en SVG inline plutôt qu'importé en image : react-native-svg est déjà
 * dans le projet (anneau du hero), ça reste net à toute taille, sans asset à
 * gérer par plateforme. Chemin issu des assets de marque Strava (viewBox 24×24).
 */
export function StravaLogo({ size = 18, color = "#FC4C02" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="Strava">
      <Path
        d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"
        fill={color}
      />
    </Svg>
  );
}
