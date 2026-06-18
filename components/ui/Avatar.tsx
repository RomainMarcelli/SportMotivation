import { Image } from "expo-image";
import { Text, View } from "react-native";

import { avatarPalette, colors } from "@/constants/colors";
import { fontFamily } from "@/constants/fonts";

type Size = "sm" | "md" | "lg";

const dims: Record<Size, { box: number; font: number }> = {
  sm: { box: 30, font: 13 },
  md: { box: 40, font: 14 },
  lg: { box: 60, font: 22 },
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

type Props = {
  /** Nom utilisé pour les initiales si pas d'image */
  name?: string;
  /** URL de l'image (prioritaire sur les initiales) */
  uri?: string | null;
  /** Taille prédéfinie (`sm`/`md`/`lg`) ou diamètre en px. */
  size?: Size | number;
  /** Index pour choisir la couleur de fond (cyclique sur `avatarPalette`) */
  index?: number;
};

/** Avatar : image ou initiales sur fond coloré par index. */
export function Avatar({ name = "", uri, size = "md", index = 0 }: Props) {
  const { box, font } =
    typeof size === "number" ? { box: size, font: Math.round(size * 0.38) } : dims[size];
  const radius = box / 2;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: box, height: box, borderRadius: radius }}
        contentFit="cover"
        transition={150}
      />
    );
  }

  const bg = avatarPalette[index % avatarPalette.length];
  return (
    <View
      style={{
        width: box,
        height: box,
        borderRadius: radius,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontFamily: fontFamily.displayExtrabold, fontSize: font, color: colors.onAvatar }}>
        {initials(name)}
      </Text>
    </View>
  );
}
