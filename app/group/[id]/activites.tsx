import { useLocalSearchParams } from "expo-router";
import { Compass, ExternalLink, MapPin, Save, Star } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from "react-native";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { InterestPicker } from "@/components/groups/InterestPicker";
import { AppBackground } from "@/components/ui/AppBackground";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { colors } from "@/constants/colors";
import { DEFAULT_INTERESTS, interestIcon, interestLabel } from "@/constants/interests";
import { useSetGroupInterests } from "@/features/places/mutations";
import { useGroupPlacesPrefs, usePlaceSuggestions } from "@/features/places/queries";
import type { RankedPlace } from "@/features/places/types";
import { useGroupMembers } from "@/features/groups/queries";
import { useCurrentUser } from "@/lib/auth-store";

/**
 * « Découvrir des activités » (Phase 7) — suggestions de lieux à faire ensemble en
 * fin de défi, à partir des centres d'intérêt du groupe et de sa localisation.
 *
 * Mock-first : tant que la clé Google Places n'est pas branchée (Edge Function
 * `places-search`), les suggestions sont des données de démonstration — l'écran est
 * pleinement navigable dès maintenant. On n'invente jamais de prix (cf. `priceLabel`).
 */
export default function ActivitesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useCurrentUser();
  const { toast } = useFeedback();

  const { data: prefs } = useGroupPlacesPrefs(id);
  const { data: members } = useGroupMembers(id);
  const setInterests = useSetGroupInterests(id!);

  // Sélection locale, initialisée depuis le groupe (ou un mix par défaut) une fois
  // les préférences chargées.
  const [selected, setSelected] = useState<string[] | null>(null);
  useEffect(() => {
    if (selected === null && prefs) {
      setSelected(prefs.interests.length > 0 ? prefs.interests : [...DEFAULT_INTERESTS]);
    }
  }, [prefs, selected]);

  const interests = selected ?? [...DEFAULT_INTERESTS];
  const { data, isLoading } = usePlaceSuggestions({
    interests,
    center: prefs?.center ?? null,
    enabled: !!prefs,
  });

  const myRole = members?.find((m) => m.user.id === me?.id)?.role;
  const isAdmin = myRole === "admin";
  const savedKeys = (prefs?.interests ?? []).slice().sort().join("|");
  const currentKeys = interests.slice().sort().join("|");
  const dirty = isAdmin && savedKeys !== currentKeys && interests.length > 0;

  const onSave = () => {
    setInterests.mutate(interests, {
      onSuccess: () => toast("Centres d'intérêt enregistrés pour le groupe.", "success"),
      onError: (e) => toast(e.message, "error"),
    });
  };

  return (
    <View className="flex-1">
      <AppBackground />
      <ScreenContainer transparent>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 28, gap: 18 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Intro */}
          <View className="flex-row items-center gap-3">
            <View
              className="h-11 w-11 items-center justify-center rounded-[13px]"
              style={{ backgroundColor: colors.coralSoft }}
            >
              <Compass size={22} color={colors.coral} strokeWidth={2} />
            </View>
            <View className="flex-1">
              <Text className="font-display text-[17px] tracking-tight text-cream">
                Et si vous vous retrouviez&nbsp;?
              </Text>
              <Text className="mt-0.5 font-body text-[12px] text-cream-dim">
                Des idées de sorties près de {prefs?.locationLabel || "chez vous"}.
              </Text>
            </View>
          </View>

          {/* Centres d'intérêt */}
          <View className="gap-2.5">
            <Text className="font-body-bold text-[12px] uppercase tracking-label text-cream-dim">
              Vos envies
            </Text>
            <InterestPicker value={interests} onChange={setSelected} />
            {dirty ? (
              <Pressable
                onPress={onSave}
                disabled={setInterests.isPending}
                className="mt-1 h-11 flex-row items-center justify-center gap-2 rounded-[14px] active:opacity-90"
                style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line2 }}
              >
                <Save size={15} color={colors.cream} strokeWidth={2.2} />
                <Text className="font-body-semibold text-[13px] text-cream">
                  Enregistrer pour le groupe
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* Bandeau démo (clé Google non branchée) */}
          {data?.isMock ? (
            <View
              className="rounded-[14px] border px-3.5 py-2.5"
              style={{ backgroundColor: colors.amberSoft, borderColor: "rgba(255,178,62,0.3)" }}
            >
              <Text className="font-body text-[11.5px]" style={{ color: colors.amber }}>
                Suggestions de démonstration — la recherche réelle s&apos;activera dès que la
                localisation Google sera configurée.
              </Text>
            </View>
          ) : null}

          {/* Résultats */}
          {isLoading || !prefs ? (
            <View className="items-center py-10">
              <ActivityIndicator color={colors.coral} />
            </View>
          ) : (data?.places.length ?? 0) === 0 ? (
            <Text className="py-8 text-center font-body text-[13px] text-cream-dim">
              Choisis au moins un centre d&apos;intérêt pour voir des idées.
            </Text>
          ) : (
            <View className="gap-2.5">
              {data!.places.map((p, i) => (
                <Reveal key={p.id} delay={Math.min(i, 8) * 40}>
                  <PlaceCard place={p} />
                </Reveal>
              ))}
            </View>
          )}
        </ScrollView>
      </ScreenContainer>
    </View>
  );
}

/* --------------------------------------------------------------- carte lieu */

function PlaceCard({ place }: { place: RankedPlace }) {
  const Icon = interestIcon(place.interestKey);

  const openMaps = () => {
    // Lien Maps officiel si fourni (Places réel), sinon recherche par nom + coordonnées.
    const url =
      place.googleMapsUri ??
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}%20${place.lat},${place.lng}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View
      className="rounded-[16px] border p-3.5"
      style={{ backgroundColor: colors.surface, borderColor: colors.line2 }}
    >
      <View className="flex-row items-start gap-3">
        <View
          className="h-10 w-10 items-center justify-center rounded-[12px]"
          style={{ backgroundColor: colors.surface2 }}
        >
          {Icon ? <Icon size={19} color={colors.coral} strokeWidth={2} /> : (
            <MapPin size={19} color={colors.coral} strokeWidth={2} />
          )}
        </View>

        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="font-display text-[15px] tracking-tight text-cream">
            {place.name}
          </Text>
          <Text className="mt-0.5 font-body text-[11.5px] text-cream-dim">
            {interestLabel(place.interestKey)}
            {place.distanceKm !== null ? ` · ${formatDistance(place.distanceKm)}` : ""}
          </Text>

          <View className="mt-2 flex-row items-center gap-3">
            {place.rating !== null ? (
              <View className="flex-row items-center gap-1">
                <Star size={13} color={colors.amber} fill={colors.amber} strokeWidth={0} />
                <Text className="font-body-semibold text-[12px] text-cream">
                  {place.rating.toFixed(1)}
                </Text>
                {place.userRatingCount ? (
                  <Text className="font-body text-[11px] text-cream-dim">
                    ({place.userRatingCount})
                  </Text>
                ) : null}
              </View>
            ) : null}
            <Text className="font-body-semibold text-[12px]" style={{ color: colors.mint }}>
              {place.priceLabel}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={openMaps}
          hitSlop={8}
          accessibilityLabel="Ouvrir dans Maps"
          className="h-9 w-9 items-center justify-center rounded-[11px] border active:opacity-70"
          style={{ backgroundColor: colors.surface2, borderColor: colors.line }}
        >
          <ExternalLink size={16} color={colors.creamDim} />
        </Pressable>
      </View>
    </View>
  );
}

/** « 450 m » sous 1 km, sinon « 3.2 km ». */
function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
