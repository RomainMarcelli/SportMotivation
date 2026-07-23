import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Activity, ChevronLeft, Link2Off, RefreshCw, Zap } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { AppBackground } from "@/components/ui/AppBackground";
import { GradientButton } from "@/components/ui/GradientButton";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { colors } from "@/constants/colors";
import { formatStravaActivity, type StravaActivity } from "@/features/sessions/strava";
import { stravaAthleteLabel } from "@/features/settings/strava-session";
import {
  clearStravaSession,
  fetchRecentStravaActivities,
  getValidStravaToken,
  isStravaConfigured,
  STRAVA_QUERY_KEY,
  useStravaAuth,
  useStravaSession,
} from "@/lib/strava";

/**
 * Compte Strava : état de la connexion et dernières activités importables.
 *
 * L'écran ne sert pas à choisir une preuve (ça se passe dans « Déclarer une
 * séance ») — il sert à vérifier que la connexion fonctionne vraiment, ce qu'une
 * simple pastille « Connecté » ne prouve pas.
 */
export default function StravaScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { confirm, alert, toast } = useFeedback();
  const { data: session, isLoading: sessionLoading } = useStravaSession();
  const { connect, isPending: connecting } = useStravaAuth();

  const [activities, setActivities] = useState<StravaActivity[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connected = !!session;
  const athlete = stravaAthleteLabel(session ?? null);

  const load = useCallback(async () => {
    setError(null);
    const token = await getValidStravaToken();
    if (!token) {
      setActivities(null);
      return;
    }
    setLoading(true);
    try {
      setActivities(await fetchRecentStravaActivities(token));
    } catch (e) {
      // Un jeton révoqué côté Strava renvoie 401 : le dire plutôt que d'afficher
      // une liste vide qui ressemble à « tu n'as rien couru ».
      setError(
        e instanceof Error && /401/.test(e.message)
          ? "Strava a révoqué l'autorisation. Reconnecte ton compte."
          : "Impossible de charger tes activités Strava."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (connected) load();
  }, [connected, load]);

  const onConnect = async () => {
    const token = await connect();
    if (!token) return;
    await alert({
      title: "Strava connecté",
      tone: "success",
      message:
        "Tes activités récentes peuvent maintenant servir de preuve quand tu déclares une séance.",
      confirmLabel: "Parfait",
    });
    load();
  };

  const onDisconnect = async () => {
    const ok = await confirm({
      title: "Déconnecter Strava ?",
      message:
        "Tu ne pourras plus joindre une activité Strava en preuve tant que tu n'auras pas " +
        "reconnecté ton compte. Tes séances déjà déclarées ne changent pas.",
      confirmLabel: "Déconnecter",
      destructive: true,
    });
    if (!ok) return;
    await clearStravaSession();
    queryClient.invalidateQueries({ queryKey: STRAVA_QUERY_KEY });
    setActivities(null);
    toast("Strava déconnecté", "success");
  };

  return (
    <View className="flex-1">
      <AppBackground />
      <ScreenContainer transparent padded={false} edges={["top"]}>
        <View className="flex-row items-center gap-2 px-[18px] pb-3 pt-1">
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityLabel="Retour"
            className="h-10 w-10 items-center justify-center rounded-chip active:opacity-70"
          >
            <ChevronLeft size={24} color={colors.cream} strokeWidth={2.2} />
          </Pressable>
          <Text className="flex-1 font-display text-[20px] tracking-tighter text-cream">Strava</Text>
          {connected ? (
            <Pressable
              onPress={load}
              hitSlop={8}
              disabled={loading}
              accessibilityLabel="Rafraîchir"
              className="h-10 w-10 items-center justify-center rounded-chip border active:opacity-70"
              style={{ backgroundColor: colors.surface, borderColor: colors.line }}
            >
              <RefreshCw size={16} color={colors.creamDim} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {!isStravaConfigured ? (
            <Reveal delay={0}>
              <Text className="mt-8 text-center font-body text-[13.5px] leading-[20px] text-cream-dim">
                Strava n'est pas configuré sur cette installation.
              </Text>
            </Reveal>
          ) : sessionLoading ? (
            <View className="mt-10 items-center">
              <ActivityIndicator color={colors.coral} />
            </View>
          ) : !connected ? (
            <Reveal delay={0} className="mt-6 items-center gap-5 px-4">
              <View
                className="h-[72px] w-[72px] items-center justify-center rounded-full"
                style={{ backgroundColor: colors.coralSoft }}
              >
                <Zap size={32} color={colors.coral} />
              </View>
              <Text className="text-center font-display text-[19px] tracking-tight text-cream">
                Connecte ton compte Strava
              </Text>
              <Text className="text-center font-body text-[13.5px] leading-[20px] text-cream-dim">
                Tes courses, sorties vélo et natations pourront servir de preuve directement, sans
                photo. L'accès est en lecture seule, et révocable à tout moment.
              </Text>
              <View className="w-full max-w-[280px]">
                <GradientButton onPress={onConnect} loading={connecting} icon={Zap}>
                  Connecter Strava
                </GradientButton>
              </View>
            </Reveal>
          ) : (
            <>
              <Reveal delay={0}>
                <View
                  className="flex-row items-center gap-3 rounded-[16px] border p-3.5"
                  style={{ backgroundColor: colors.mintSoft, borderColor: "rgba(95,224,168,0.3)" }}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-surface">
                    <Zap size={20} color={colors.mint} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-display text-[14.5px] tracking-tight text-cream">
                      Compte connecté
                    </Text>
                    <Text className="mt-0.5 font-body text-[11.5px] text-cream-dim">
                      {athlete ? `Strava · ${athlete}` : "Autorisation en lecture seule"}
                    </Text>
                  </View>
                </View>
              </Reveal>

              <Reveal delay={60}>
                <Text className="mb-2 mt-5 px-0.5 font-body-bold text-[12px] uppercase tracking-label text-cream-dim">
                  Activités récentes
                </Text>
              </Reveal>

              {loading ? (
                <View className="mt-4 items-center">
                  <ActivityIndicator color={colors.coral} />
                </View>
              ) : error ? (
                <Reveal delay={80}>
                  <Text className="font-body text-[13px] leading-[19px] text-red">{error}</Text>
                </Reveal>
              ) : !activities || activities.length === 0 ? (
                <Reveal delay={80}>
                  <Text className="font-body text-[13px] leading-[19px] text-cream-dim">
                    Aucune activité récente sur ton compte Strava.
                  </Text>
                </Reveal>
              ) : (
                <View className="gap-2.5">
                  {activities.map((activity, index) => (
                    <Reveal key={activity.id} delay={80 + Math.min(index, 8) * 40}>
                      <View
                        className="flex-row items-center gap-3 rounded-[14px] border p-3"
                        style={{ backgroundColor: colors.surface, borderColor: colors.line }}
                      >
                        <View className="h-10 w-10 items-center justify-center rounded-xl bg-surface-2">
                          <Activity size={19} color={colors.coral} />
                        </View>
                        <Text
                          numberOfLines={2}
                          className="flex-1 font-body-bold text-[13.5px] text-cream"
                        >
                          {formatStravaActivity(activity)}
                        </Text>
                      </View>
                    </Reveal>
                  ))}
                </View>
              )}

              <Reveal delay={200}>
                <Text className="mt-5 font-body text-[12px] leading-[17px] text-cream-dim">
                  Pour joindre l'une de ces activités à une séance, passe par « Déclarer une
                  séance » et choisis la preuve Strava.
                </Text>

                <Pressable
                  onPress={onDisconnect}
                  className="mt-4 flex-row items-center justify-center gap-2 rounded-[15px] border p-3.5 active:opacity-80"
                  style={{ backgroundColor: colors.redSoft, borderColor: "rgba(242,85,74,0.32)" }}
                >
                  <Link2Off size={16} color={colors.red} strokeWidth={2.2} />
                  <Text className="font-body-bold text-[13.5px]" style={{ color: colors.red }}>
                    Déconnecter Strava
                  </Text>
                </Pressable>
              </Reveal>
            </>
          )}
        </ScrollView>
      </ScreenContainer>
    </View>
  );
}
