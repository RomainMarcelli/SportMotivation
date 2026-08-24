import * as ImagePicker from "expo-image-picker";
import { Camera, Check, ImageIcon, Info, Trash2, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { GradientButton } from "@/components/ui/GradientButton";
import {
  AVATAR_COLORS,
  AVATAR_ICON_KEYS,
  DICEBEAR_STYLES,
  avatarIconFor,
  dicebearSeeds,
  dicebearUrl,
  isDicebearUrl,
} from "@/constants/avatars";
import { colors } from "@/constants/colors";

/** Photo choisie sur l'appareil, pas encore envoyée au serveur. */
export type PickedPhoto = { uri: string; base64: string; mime: string };

/** Ce que le sélecteur renvoie une fois validé. */
export type AvatarSelection = {
  color: string;
  icon: string | null;
  /** Photo à uploader (null si inchangée). */
  photo: PickedPhoto | null;
  /** Avatar généré à enregistrer tel quel (null si non choisi). */
  generatedUrl: string | null;
  /** L'utilisateur est repassé en bulle couleur/icône → il faut effacer l'image en base. */
  clearImage: boolean;
};

export type AvatarValue = {
  color?: string | null;
  icon?: string | null;
  /** URL déjà enregistrée (photo uploadée ou avatar généré). */
  url?: string | null;
  /**
   * Photo choisie mais pas encore envoyée. Indispensable pour rouvrir le
   * sélecteur sans perdre le base64 (une URI locale n'est pas une URL valide
   * en base).
   */
  photo?: PickedPhoto | null;
  /** Nom pour les initiales de l'aperçu. */
  name?: string;
  /** Graine des avatars générés (pseudo ou id) — deux joueurs voient des planches différentes. */
  seed?: string;
};

type Tab = "color" | "icon" | "fun" | "photo";

// Photo en premier : c'est ce que la majorité des gens cherchent en ouvrant
// « mon avatar ». Le reste suit dans l'ordre du plus simple au plus fantaisiste.
const TABS: { key: Tab; label: string }[] = [
  { key: "photo", label: "Photo" },
  { key: "color", label: "Couleur" },
  { key: "icon", label: "Icône" },
  { key: "fun", label: "Fun" },
];

/**
 * Sélecteur d'avatar — couleur, icône, avatar généré ou photo perso.
 *
 * Tout se joue sur un BROUILLON local : rien n'est envoyé avant « Valider »,
 * donc essayer une couleur alors qu'on a une photo n'est jamais destructif.
 * Choisir une couleur ou une icône retire l'image (c'est le seul moyen de
 * revoir la bulle), choisir Fun ou Photo remet une image.
 */
export function AvatarPicker({
  visible,
  onClose,
  onSelect,
  value,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (selection: AvatarSelection) => void;
  value: AvatarValue;
}) {
  const [tab, setTab] = useState<Tab>("color");
  const [color, setColor] = useState<string>(value.color ?? AVATAR_COLORS[0]);
  const [icon, setIcon] = useState<string | null>(value.icon ?? null);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [keptUrl, setKeptUrl] = useState<string | null>(value.url ?? null);
  const [style, setStyle] = useState<string>(DICEBEAR_STYLES[0].key);
  const [error, setError] = useState<string | null>(null);

  // Réinitialise le brouillon à chaque ouverture : on repart toujours de l'état réel.
  useEffect(() => {
    if (!visible) return;
    setColor(value.color ?? AVATAR_COLORS[0]);
    setIcon(value.icon ?? null);
    setPhoto(value.photo ?? null);
    setGeneratedUrl(isDicebearUrl(value.url) ? value.url! : null);
    setKeptUrl(isDicebearUrl(value.url) ? null : value.url ?? null);
    // On rouvre sur l'onglet qui correspond à l'avatar actuel.
    setTab(isDicebearUrl(value.url) ? "fun" : value.icon && !value.url ? "icon" : "photo");
    setError(null);
  }, [visible, value.color, value.icon, value.url, value.photo]);

  const seeds = useMemo(() => dicebearSeeds(value.seed ?? value.name ?? "sportmotiv"), [
    value.seed,
    value.name,
  ]);

  const previewUri = photo?.uri ?? generatedUrl ?? keptUrl;

  // ⚠ Choisir une couleur ou une icône ne supprime PLUS l'image : perdre sa photo
  // en tapant une pastille était une mauvaise surprise. L'image reste prioritaire à
  // l'affichage, la couleur/icône sont mémorisées pour le jour où on la retirera —
  // et un bandeau l'explique dans les onglets concernés.
  const chooseColor = (next: string) => setColor(next);
  const chooseIcon = (next: string | null) => setIcon(next);

  const chooseGenerated = (url: string) => {
    setGeneratedUrl(url);
    setPhoto(null);
    setKeptUrl(null);
  };

  const pickFrom = async (source: "library" | "camera") => {
    setError(null);
    try {
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(
          source === "camera"
            ? "Autorise l'accès à l'appareil photo dans les réglages."
            : "Autorise l'accès aux photos dans les réglages."
        );
        return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      };
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);

      if (result.canceled || !result.assets[0]?.base64) return;
      const asset = result.assets[0];
      setPhoto({
        uri: asset.uri,
        base64: asset.base64!,
        mime: asset.mimeType ?? "image/jpeg",
      });
      setGeneratedUrl(null);
      setKeptUrl(null);
    } catch {
      setError("Impossible d'ouvrir la photothèque. Réessaie.");
    }
  };

  // On reste sur l'onglet courant : être renvoyé ailleurs après un simple
  // « retirer » donnait l'impression d'avoir changé de mode sans le vouloir.
  const removeImage = () => {
    setPhoto(null);
    setGeneratedUrl(null);
    setKeptUrl(null);
  };

  const validate = () => {
    onSelect({
      color,
      // L'icône reste mémorisée même quand une image la masque : si le joueur
      // retire sa photo plus tard, il retrouve l'icône qu'il avait choisie.
      icon,
      photo,
      generatedUrl,
      clearImage: !previewUri,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
        <Pressable className="flex-1" onPress={onClose} />
        <View
          className="rounded-t-[28px] border-x border-t px-5 pb-8 pt-5"
          style={{ backgroundColor: colors.surface, borderColor: colors.line2, maxHeight: "90%" }}
        >
          <View
            className="mb-4 h-1 w-10 self-center rounded-full"
            style={{ backgroundColor: colors.line2 }}
          />

          <View className="mb-4 flex-row items-start gap-3">
            <View className="flex-1">
              <Text className="font-display text-[19px] tracking-tight text-cream">
                Mon avatar
              </Text>
              <Text className="mt-0.5 font-body text-[12px] text-cream-dim">
                Une couleur, une icône, un avatar rigolo ou ta photo.
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityLabel="Fermer"
              className="h-9 w-9 items-center justify-center rounded-full active:opacity-80"
              style={{ backgroundColor: colors.surface2 }}
            >
              <X size={17} color={colors.creamDim} strokeWidth={2.4} />
            </Pressable>
          </View>

          {/* Aperçu — pas d'anneau quand il y a une image : on ne doit voir QUE la photo. */}
          <View className="mb-4 items-center">
            <Avatar
              uri={previewUri}
              color={color}
              icon={previewUri ? null : icon}
              name={value.name ?? ""}
              size={90}
            />
          </View>

          {/* Onglets */}
          <View
            className="mb-4 flex-row rounded-chip p-1"
            style={{ backgroundColor: colors.ink2 }}
          >
            {TABS.map((t) => {
              const on = t.key === tab;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  className="flex-1 items-center rounded-[9px] py-2 active:opacity-80"
                  style={{ backgroundColor: on ? colors.surface2 : "transparent" }}
                >
                  <Text
                    className="font-body-semibold text-[12.5px]"
                    style={{ color: on ? colors.cream : colors.creamDim }}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 300 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Une image masque la bulle : on le dit, au lieu de supprimer la photo
                dans le dos de l'utilisateur quand il touche une couleur/icône. */}
            {previewUri && (tab === "color" || tab === "icon") ? (
              <Pressable
                onPress={removeImage}
                className="mb-3 flex-row items-center gap-2.5 rounded-input border px-3 py-2.5 active:opacity-80"
                style={{ backgroundColor: colors.amberSoft, borderColor: colors.amber }}
              >
                <Info size={15} color={colors.amber} />
                <Text className="flex-1 font-body text-[11.5px] leading-4 text-cream">
                  Ta photo masque la bulle. <Text className="font-body-bold">Retirer l'image</Text>{" "}
                  pour la voir.
                </Text>
              </Pressable>
            ) : null}

            {tab === "color" ? (
              <View className="flex-row flex-wrap gap-3">
                {AVATAR_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => chooseColor(c)}
                    accessibilityLabel={`Couleur ${c}`}
                    className="items-center justify-center active:opacity-80"
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      backgroundColor: c,
                      borderWidth: color === c ? 3 : 0,
                      borderColor: colors.cream,
                    }}
                  >
                    {color === c ? (
                      <Check size={20} color={colors.onAvatar} strokeWidth={3} />
                    ) : null}
                  </Pressable>
                ))}
              </View>
            ) : null}

            {tab === "icon" ? (
              <View className="flex-row flex-wrap gap-3">
                <Pressable
                  onPress={() => chooseIcon(null)}
                  accessibilityLabel="Mes initiales"
                  className="items-center justify-center active:opacity-80"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    backgroundColor: colors.surface2,
                    borderWidth: icon === null ? 2 : 1,
                    borderColor: icon === null ? colors.coral : colors.line,
                  }}
                >
                  <Text className="font-display text-[14px] text-cream">Aa</Text>
                </Pressable>
                {AVATAR_ICON_KEYS.map((key) => {
                  const Icon = avatarIconFor(key);
                  if (!Icon) return null;
                  const on = icon === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => chooseIcon(key)}
                      accessibilityLabel={`Icône ${key}`}
                      className="items-center justify-center active:opacity-80"
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 16,
                        backgroundColor: on ? color : colors.surface2,
                        borderWidth: on ? 2 : 1,
                        borderColor: on ? colors.cream : colors.line,
                      }}
                    >
                      <Icon
                        size={22}
                        color={on ? colors.onAvatar : colors.creamDim}
                        strokeWidth={2.2}
                      />
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {tab === "fun" ? (
              <View className="gap-3">
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {DICEBEAR_STYLES.map((s) => {
                    const on = s.key === style;
                    return (
                      <Pressable
                        key={s.key}
                        onPress={() => setStyle(s.key)}
                        className="rounded-chip border px-3 py-2 active:opacity-80"
                        style={{
                          backgroundColor: on ? colors.coralSoft : colors.surface2,
                          borderColor: on ? colors.coral : colors.line,
                        }}
                      >
                        <Text
                          className="font-body-semibold text-[12px]"
                          style={{ color: on ? colors.coral : colors.creamDim }}
                        >
                          {s.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <View className="flex-row flex-wrap gap-3">
                  {seeds.map((seed) => {
                    const url = dicebearUrl(style, seed);
                    const on = generatedUrl === url;
                    return (
                      <Pressable
                        key={seed}
                        onPress={() => chooseGenerated(url)}
                        accessibilityLabel={`Avatar ${seed}`}
                        className="active:opacity-80"
                        style={{
                          borderRadius: 999,
                          padding: 2,
                          borderWidth: on ? 2 : 0,
                          borderColor: colors.coral,
                        }}
                      >
                        <Avatar uri={url} color={color} size={52} />
                      </Pressable>
                    );
                  })}
                </View>

                <Text className="font-body text-[11px] leading-4 text-cream-dim">
                  Avatars générés par DiceBear. Ils ont besoin d'une connexion la première fois,
                  ensuite ils sont mis en cache.
                </Text>
              </View>
            ) : null}

            {tab === "photo" ? (
              <View className="gap-3">
                <View className="flex-row gap-3">
                  {Platform.OS !== "web" ? (
                    <Pressable
                      onPress={() => pickFrom("camera")}
                      className="flex-1 flex-row items-center justify-center gap-2 rounded-input border py-3.5 active:opacity-80"
                      style={{ backgroundColor: colors.surface2, borderColor: colors.line }}
                    >
                      <Camera size={17} color={colors.cream} />
                      <Text className="font-body-semibold text-[13px] text-cream">
                        Appareil photo
                      </Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() => pickFrom("library")}
                    className="flex-1 flex-row items-center justify-center gap-2 rounded-input border py-3.5 active:opacity-80"
                    style={{ backgroundColor: colors.surface2, borderColor: colors.line }}
                  >
                    <ImageIcon size={17} color={colors.cream} />
                    <Text className="font-body-semibold text-[13px] text-cream">Mes photos</Text>
                  </Pressable>
                </View>

                {previewUri ? (
                  <Pressable
                    onPress={removeImage}
                    className="flex-row items-center justify-center gap-2 rounded-input border py-3 active:opacity-80"
                    style={{ backgroundColor: colors.redSoft, borderColor: colors.red }}
                  >
                    <Trash2 size={16} color={colors.red} />
                    <Text className="font-body-semibold text-[13px] text-red">
                      Retirer l'image
                    </Text>
                  </Pressable>
                ) : null}

                <Text className="font-body text-[11px] leading-4 text-cream-dim">
                  Ta photo remplace la bulle colorée partout : profil, listes de membres, votes.
                </Text>
              </View>
            ) : null}

            {error ? (
              <Text className="mt-3 font-body-medium text-[12px] text-red">{error}</Text>
            ) : null}
          </ScrollView>

          <View className="mt-4">
            <GradientButton onPress={validate}>Valider</GradientButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}
