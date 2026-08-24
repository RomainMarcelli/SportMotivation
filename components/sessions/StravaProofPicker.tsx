import { Activity, Check } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { GradientButton } from "@/components/ui/GradientButton";
import { colors } from "@/constants/colors";
import {
  describeStravaError,
  formatStravaActivity,
  type StravaActivity,
} from "@/features/sessions/strava";
import { fetchRecentStravaActivities, getValidStravaToken, useStravaAuth } from "@/lib/strava";

type Props = {
  selectedId: string | null;
  onSelect: (activity: StravaActivity) => void;
};

/**
 * Connexion Strava + sélection d'une activité récente (DA).
 * ⚠ Ne doit être monté que si `isStravaConfigured === true` (`useStravaAuth` lève sinon).
 */
export function StravaProofPicker({ selectedId, onSelect }: Props) {
  const { connect, isPending: authPending } = useStravaAuth();
  const [activities, setActivities] = useState<StravaActivity[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadActivities = useCallback(async (token: string) => {
    setLoading(true);
    try {
      setActivities(await fetchRecentStravaActivities(token));
    } catch (e) {
      // Message actionnable selon le statut Strava (403 = scope activités manquant,
      // 401 = app révoquée) plutôt qu'un code brut — voir describeStravaError.
      setError(describeStravaError(e instanceof Error ? e.message : ""));
    } finally {
      setLoading(false);
    }
  }, []);

  // Déjà connecté (Paramètres ou séance précédente) → on va droit aux activités.
  // Avant, la connexion n'était pas conservée : il fallait repasser par Strava à
  // chaque déclaration.
  useEffect(() => {
    let cancelled = false;
    getValidStravaToken().then((token) => {
      if (token && !cancelled) loadActivities(token);
    });
    return () => {
      cancelled = true;
    };
  }, [loadActivities]);

  const onConnect = async () => {
    setError(null);
    const { token, error: connectError } = await connect();
    if (connectError) {
      // Surfacer la raison (fonction serveur absente, pop-up bloquée…) dans le
      // message d'erreur déjà affiché sous le bouton, au lieu de ne rien dire.
      setError(connectError);
      return;
    }
    if (!token) return; // annulation volontaire
    await loadActivities(token);
  };

  // Le chargement passe AVANT le bouton : à la reprise d'une connexion mémorisée
  // on chargerait sinon les activités derrière un bouton « Connecter Strava ».
  if (loading) {
    return (
      <View className="items-center py-4">
        <ActivityIndicator color={colors.coral} />
      </View>
    );
  }

  if (!activities) {
    return (
      <View className="gap-2">
        <GradientButton onPress={onConnect} loading={authPending} icon={Activity}>
          Connecter Strava
        </GradientButton>
        {error ? <Text className="font-body text-[12px] text-red">{error}</Text> : null}
      </View>
    );
  }

  if (activities.length === 0) {
    return (
      <Text className="font-body text-[13px] text-cream-dim">
        Aucune activité Strava récente trouvée.
      </Text>
    );
  }

  return (
    <View className="gap-2.5">
      <View
        className="flex-row items-center gap-2 self-start rounded-full px-3 py-1.5"
        style={{ backgroundColor: colors.mintSoft }}
      >
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.mint }} />
        <Text className="font-body-semibold text-[11.5px] text-mint">Strava connecté</Text>
      </View>

      {activities.map((activity) => {
        const selected = selectedId === String(activity.id);
        return (
          <Pressable
            key={activity.id}
            onPress={() => onSelect(activity)}
            className="flex-row items-center gap-3 rounded-[14px] border bg-surface p-3 active:opacity-80"
            style={
              selected
                ? { backgroundColor: colors.coralSoft, borderColor: "rgba(255,106,69,0.4)" }
                : { borderColor: colors.line }
            }
          >
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-surface-2">
              <Activity size={20} color={colors.coral} />
            </View>
            <Text className="flex-1 font-body-bold text-[13.5px] text-cream" numberOfLines={2}>
              {formatStravaActivity(activity)}
            </Text>
            <View
              className="h-[22px] w-[22px] items-center justify-center rounded-full border-2"
              style={
                selected
                  ? { backgroundColor: colors.coral, borderColor: colors.coral }
                  : { borderColor: colors.line2 }
              }
            >
              {selected ? <Check size={13} color={colors.onCoral} strokeWidth={3} /> : null}
            </View>
          </Pressable>
        );
      })}
      {error ? <Text className="font-body text-[12px] text-red">{error}</Text> : null}
    </View>
  );
}
