import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import {
  fetchRecentStravaActivities,
  useStravaAuth,
} from "@/lib/strava";
import { formatStravaActivity, type StravaActivity } from "@/features/sessions/strava";

type Props = {
  selectedId: string | null;
  onSelect: (activity: StravaActivity) => void;
};

/**
 * Connexion Strava + sélection d'une activité récente.
 * ⚠ Ne doit être monté que si isStravaConfigured === true (useStravaAuth lève sinon).
 */
export function StravaProofPicker({ selectedId, onSelect }: Props) {
  const { connect, isPending: authPending } = useStravaAuth();
  const [activities, setActivities] = useState<StravaActivity[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onConnect = async () => {
    setError(null);
    const token = await connect();
    if (!token) return;
    setLoading(true);
    try {
      setActivities(await fetchRecentStravaActivities(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger les activités Strava.");
    } finally {
      setLoading(false);
    }
  };

  if (!activities) {
    return (
      <View className="gap-2">
        <Button variant="secondary" onPress={onConnect} loading={authPending || loading}>
          Connecter Strava
        </Button>
        {error ? <Text className="text-xs text-red-500">{error}</Text> : null}
      </View>
    );
  }

  if (loading) {
    return <ActivityIndicator color="#3b82f6" />;
  }

  if (activities.length === 0) {
    return (
      <Text className="text-sm text-neutral-500">Aucune activité Strava récente trouvée.</Text>
    );
  }

  return (
    <View className="gap-2">
      {activities.map((activity) => {
        const selected = selectedId === String(activity.id);
        return (
          <Pressable
            key={activity.id}
            onPress={() => onSelect(activity)}
            className={`rounded-xl border p-3 active:opacity-70 ${
              selected
                ? "border-primary-500 bg-primary-50 dark:bg-primary-950"
                : "border-neutral-200 dark:border-neutral-700"
            }`}
          >
            <Text className="text-sm font-medium text-neutral-900 dark:text-white">
              {formatStravaActivity(activity)}
            </Text>
          </Pressable>
        );
      })}
      {error ? <Text className="text-xs text-red-500">{error}</Text> : null}
    </View>
  );
}
