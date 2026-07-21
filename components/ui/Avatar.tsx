import { Image } from "expo-image";
import { Text, View } from "react-native";

import { avatarIconFor } from "@/constants/avatars";
import { colors } from "@/constants/colors";
import { fontFamily } from "@/constants/fonts";
import { fallbackColor, resolveAvatar } from "@/features/auth/avatar";

type Size = "sm" | "md" | "lg";

const dims: Record<Size, { box: number; font: number }> = {
  sm: { box: 30, font: 13 },
  md: { box: 40, font: 14 },
  lg: { box: 60, font: 22 },
};

type Props = {
  /** Nom utilisé pour les initiales quand il n'y a ni image ni icône. */
  name?: string;
  /** Image : photo uploadée OU avatar généré. Prioritaire sur tout le reste. */
  uri?: string | null;
  /** Couleur de fond choisie par le joueur (`users.avatar_color`). */
  color?: string | null;
  /** Icône lucide choisie par le joueur (`users.avatar_icon`). */
  icon?: string | null;
  /** Taille prédéfinie (`sm`/`md`/`lg`) ou diamètre en px. */
  size?: Size | number;
  /**
   * Repli historique : couleur déduite d'un index dans une liste. Utilisé
   * uniquement si le joueur n'a PAS choisi de couleur, pour que les anciens
   * écrans gardent des bulles variées.
   */
  index?: number;
};

/**
 * Bulle d'avatar — source unique de vérité pour l'app entière.
 *
 * Trois rendus possibles, dans cet ordre : image → icône sur aplat → initiales
 * sur aplat (cf. `resolveAvatar`). Le même composant est utilisé partout
 * (profil, membres, votes, séances, header) : changer un avatar ici le change
 * dans toute l'app.
 */
export function Avatar({ name = "", uri, color, icon, size = "md", index }: Props) {
  const { box, font } =
    typeof size === "number" ? { box: size, font: Math.round(size * 0.38) } : dims[size];
  const radius = box / 2;

  const resolved = resolveAvatar({
    avatar_url: uri,
    avatar_color: color,
    avatar_icon: icon,
    first_name: name,
    id: index !== undefined ? String(index) : name,
  });

  // Sans couleur choisie, on retombe sur la teinte déterministe du nom/index.
  const bg = (color ?? "").trim() || fallbackColor(index !== undefined ? String(index) : name);

  if (resolved.kind === "image") {
    return (
      <Image
        source={{ uri: resolved.uri }}
        style={{ width: box, height: box, borderRadius: radius, backgroundColor: bg }}
        contentFit="cover"
        transition={150}
      />
    );
  }

  const Icon = resolved.kind === "icon" ? avatarIconFor(resolved.icon) : null;

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
      {Icon ? (
        <Icon size={Math.round(box * 0.5)} color={colors.onAvatar} strokeWidth={2.3} />
      ) : (
        <Text
          style={{
            fontFamily: fontFamily.displayExtrabold,
            fontSize: font,
            color: colors.onAvatar,
          }}
        >
          {resolved.kind === "initials" ? resolved.initials : ""}
        </Text>
      )}
    </View>
  );
}
