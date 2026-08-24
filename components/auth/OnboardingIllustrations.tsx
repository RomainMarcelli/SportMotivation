import { StyleSheet } from "react-native";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import { fontFamily } from "@/constants/fonts";

/** Étoile « sparkle » réutilisée (path du pictogramme étoile à 4 branches). */
const STAR =
  "M12 2.5l1.8 5.7a2 2 0 0 0 1.3 1.3l5.7 1.8-5.7 1.8a2 2 0 0 0-1.3 1.3L12 20.1l-1.8-5.7a2 2 0 0 0-1.3-1.3L3.2 11.3l5.7-1.8a2 2 0 0 0 1.3-1.3z";

/** Buste « utilisateur » (cercle tête + épaules), pour les avatars. */
function UserGlyph({ transform, stroke }: { transform: string; stroke: string }) {
  return (
    <G
      transform={transform}
      fill="none"
      stroke={stroke}
      strokeWidth={2.1}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx="12" cy="9.5" r="3.4" />
      <Path d="M5.5 19.5a6.6 6.6 0 0 1 13 0" />
    </G>
  );
}

/**
 * Falloff d'opacité multi-stops : transition étalée = pas de « banding » (cercles à bord net
 * sur Android, qui apparaît avec seulement 2 stops). Inliné via `.map` car react-native-svg
 * type les enfants de `RadialGradient` comme un tableau de `Stop`.
 */
function falloffStops(color: string, stops: readonly [number, number][]) {
  return stops.map(([offset, opacity], i) => (
    <Stop key={i} offset={offset} stopColor={color} stopOpacity={opacity} />
  ));
}

const STAGE_FALLOFF: readonly [number, number][] = [
  [0, 0.16],
  [0.2, 0.11],
  [0.4, 0.06],
  [0.6, 0.025],
  [0.8, 0.008],
  [1, 0],
];

/** Halo radial coral interne du `.stage` (haut-centre). */
export function StageGlow() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="stageGlow" cx="50%" cy="4%" r="90%">
          {falloffStops("#FF8A3D", STAGE_FALLOFF)}
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#stageGlow)" />
    </Svg>
  );
}

type IllustrationProps = { width?: number | string; height?: number | string };

/** Slide 1 — flamme + 3 avatars (engagement de groupe). */
export function EngagementIllustration({ width = "100%", height = "100%" }: IllustrationProps) {
  return (
    <Svg viewBox="0 0 280 210" width={width} height={height}>
      <Defs>
        <LinearGradient id="flame1" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FF6A45" />
          <Stop offset="1" stopColor="#FFB23E" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="140" cy="180" rx="92" ry="13" fill="rgba(255,255,255,0.04)" />
      <Circle cx="140" cy="56" r="29" fill="#FF8A3D" opacity={0.18} />
      <G transform="translate(123,30) scale(1.55)">
        <Path
          d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"
          fill="url(#flame1)"
        />
      </G>
      {/* avatar gauche (coral) */}
      <Circle cx="94" cy="130" r="31" fill="#FF6A45" stroke="#231A12" strokeWidth={4} />
      <UserGlyph transform="translate(79.6,115.6) scale(1.2)" stroke="#2a1505" />
      {/* avatar droit (mint) */}
      <Circle cx="186" cy="130" r="31" fill="#5FE0A8" stroke="#231A12" strokeWidth={4} />
      <UserGlyph transform="translate(171.6,115.6) scale(1.2)" stroke="#0c2c20" />
      {/* avatar central (amber, devant) */}
      <Circle cx="140" cy="118" r="35" fill="#FFB23E" stroke="#231A12" strokeWidth={4} />
      <UserGlyph transform="translate(123.8,101.8) scale(1.35)" stroke="#2a1505" />
      {/* étincelles */}
      <G transform="translate(196,54) scale(0.5)" fill="#FFB23E">
        <Path d={STAR} />
      </G>
      <G transform="translate(58,150) scale(0.42)" fill="#FBEEDD" opacity={0.8}>
        <Path d={STAR} />
      </G>
    </Svg>
  );
}

type CagnotteProps = IllustrationProps & {
  /** Masque la pièce qui tombe statique (remplacée par une pièce animée en overlay). */
  hideTopCoin?: boolean;
};

/** Slide 2 — bocal cagnotte + pièces + pièce qui tombe. */
export function CagnotteIllustration({
  width = "100%",
  height = "100%",
  hideTopCoin = false,
}: CagnotteProps) {
  return (
    <Svg viewBox="0 0 280 210" width={width} height={height}>
      <Defs>
        <LinearGradient id="coin2" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFC65C" />
          <Stop offset="1" stopColor="#FF9A42" />
        </LinearGradient>
        <ClipPath id="jarClip">
          <Rect x="96" y="72" width="88" height="112" rx="22" />
        </ClipPath>
      </Defs>
      <Ellipse cx="140" cy="186" rx="86" ry="12" fill="rgba(255,255,255,0.04)" />
      {/* pièce qui tombe + traits de mouvement (statiques) */}
      {!hideTopCoin ? (
        <G>
          <Path d="M140 10 v7" stroke="#FFB23E" strokeWidth={2.4} strokeLinecap="round" opacity={0.55} />
          <Path d="M124 16 l4 5" stroke="#FFB23E" strokeWidth={2.4} strokeLinecap="round" opacity={0.45} />
          <Path d="M156 16 l-4 5" stroke="#FFB23E" strokeWidth={2.4} strokeLinecap="round" opacity={0.45} />
          <Circle cx="140" cy="34" r="13" fill="url(#coin2)" />
          <SvgText
            x="140"
            y="39"
            textAnchor="middle"
            fontFamily={fontFamily.displayExtrabold}
            fontSize="13"
            fill="#2a1505"
          >
            €
          </SvgText>
        </G>
      ) : null}
      {/* corps du bocal */}
      <Rect
        x="96"
        y="72"
        width="88"
        height="112"
        rx="22"
        fill="rgba(255,178,62,0.10)"
        stroke="#FFB23E"
        strokeWidth={3}
      />
      <G clipPath="url(#jarClip)">
        <Rect x="96" y="134" width="88" height="50" fill="rgba(255,178,62,0.20)" />
        <Circle cx="118" cy="164" r="12" fill="#FFB23E" />
        <Circle cx="162" cy="162" r="12" fill="#FFC65C" />
        <Circle cx="130" cy="150" r="11" fill="#FF9A42" />
        <Circle cx="152" cy="150" r="11" fill="#FFB23E" />
        <Circle cx="140" cy="166" r="14" fill="url(#coin2)" />
        <SvgText
          x="140"
          y="171"
          textAnchor="middle"
          fontFamily={fontFamily.displayExtrabold}
          fontSize="15"
          fill="#2a1505"
        >
          €
        </SvgText>
      </G>
      {/* couvercle + fente */}
      <Rect x="108" y="60" width="64" height="16" rx="7" fill="#FFB23E" />
      <Rect x="128" y="64" width="24" height="4" rx="2" fill="#231A12" />
      <G transform="translate(200,70) scale(0.46)" fill="#5FE0A8">
        <Path d={STAR} />
      </G>
    </Svg>
  );
}

/** Slide 3 — 2 coupes qui trinquent + confettis. */
export function RewardIllustration({ width = "100%", height = "100%" }: IllustrationProps) {
  return (
    <Svg viewBox="0 0 280 210" width={width} height={height}>
      <Ellipse cx="140" cy="184" rx="80" ry="12" fill="rgba(255,255,255,0.04)" />
      {/* confettis */}
      <Rect x="66" y="58" width="9" height="9" rx="2" fill="#FF6A45" transform="rotate(22 70 62)" />
      <Rect x="205" y="52" width="8" height="8" rx="2" fill="#5FE0A8" transform="rotate(-26 209 56)" />
      <Rect x="44" y="104" width="7" height="7" rx="2" fill="#FFB23E" transform="rotate(14 47 107)" />
      <Rect x="226" y="108" width="9" height="9" rx="2" fill="#FBEEDD" transform="rotate(30 230 112)" />
      <Rect x="92" y="40" width="7" height="7" rx="2" fill="#FFB23E" transform="rotate(-18 95 43)" />
      <Rect x="184" y="38" width="8" height="8" rx="2" fill="#FF6A45" transform="rotate(20 188 42)" />
      <Circle cx="60" cy="74" r="3.5" fill="#5FE0A8" />
      <Circle cx="220" cy="80" r="3.5" fill="#FF6A45" />
      {/* étincelle « clink » */}
      <Path
        d="M140 50 v-9 M154 56 l7 -6 M126 56 l-7 -6"
        stroke="#FFB23E"
        strokeWidth={2.6}
        strokeLinecap="round"
      />
      <G transform="translate(132,28) scale(0.5)" fill="#FFC65C">
        <Path d={STAR} />
      </G>
      {/* coupe gauche */}
      <G transform="rotate(15 120 158)">
        <Path
          d="M98 84 L142 84 L120 112 Z"
          fill="rgba(251,238,221,0.10)"
          stroke="#FBEEDD"
          strokeWidth={2.6}
          strokeLinejoin="round"
        />
        <Path d="M105 89 L135 89 L120 99 Z" fill="#FF6A45" />
        <Path d="M120 112 L120 152" stroke="#FBEEDD" strokeWidth={2.6} strokeLinecap="round" />
        <Path d="M106 154 L134 154" stroke="#FBEEDD" strokeWidth={2.6} strokeLinecap="round" />
      </G>
      {/* coupe droite */}
      <G transform="rotate(-15 160 158)">
        <Path
          d="M138 84 L182 84 L160 112 Z"
          fill="rgba(251,238,221,0.10)"
          stroke="#FBEEDD"
          strokeWidth={2.6}
          strokeLinejoin="round"
        />
        <Path d="M145 89 L175 89 L160 99 Z" fill="#5FE0A8" />
        <Path d="M160 112 L160 152" stroke="#FBEEDD" strokeWidth={2.6} strokeLinecap="round" />
        <Path d="M146 154 L174 154" stroke="#FBEEDD" strokeWidth={2.6} strokeLinecap="round" />
      </G>
    </Svg>
  );
}
