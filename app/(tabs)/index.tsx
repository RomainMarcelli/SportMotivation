import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { AppHeader } from "@/components/home/AppHeader";
import { ChallengeHero } from "@/components/home/ChallengeHero";
import { DevResetTools } from "@/components/home/DevResetTools";
import { EmptyGroups } from "@/components/home/EmptyGroups";
import { GroupCarousel } from "@/components/home/GroupCarousel";
import { RecentSessions } from "@/components/home/RecentSessions";
import { SessionDetailSheet } from "@/components/sessions/SessionDetailSheet";
import { WeeklyHistory } from "@/components/home/WeeklyHistory";
import { WeekPlanner } from "@/components/home/WeekPlanner";
import { AppBackground } from "@/components/ui/AppBackground";
import { GradientButton } from "@/components/ui/GradientButton";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { TopFade } from "@/components/ui/TopFade";
import { useGroupMembers, useMyGroups, usePot, type MyGroup } from "@/features/groups/queries";
import { pickActiveGroup } from "@/features/groups/selectors";
import { historyBars, motivationLine, weekStats } from "@/features/home/home-stats";
import { useGroupSessions, type SessionWithAuthor } from "@/features/sessions/queries";
import { useFocusReplay } from "@/hooks/useFocusReplay";
import { useProfile } from "@/hooks/useProfile";
import { useCurrentUser } from "@/lib/auth-store";
import { daysUntil, weekStartString } from "@/lib/date";

/**
 * Une carte du carrousel, **autonome** : elle charge les membres, la cagnotte et
 * les séances de SON défi.
 *
 * Avant, seule la carte « courante » recevait des données et les voisines
 * affichaient 0 membre / 0 séance — un état faux qui restait affiché après un
 * glissement. Les requêtes sont mutualisées par React Query (mêmes clés que le
 * reste de l'écran), donc les cartes voisines sont déjà prêtes à l'arrivée.
 */
function HeroCard({
  item,
  meId,
  now,
  replay,
}: {
  item: MyGroup;
  meId: string | undefined;
  now: Date;
  replay: number;
}) {
  const groupId = item.group.id;
  const { data: sessions = [] } = useGroupSessions(groupId);
  const { data: members = [] } = useGroupMembers(groupId);
  const { data: potTotal } = usePot(groupId);

  const stats = useMemo(
    () => weekStats(sessions, meId, weekStartString(now), item.weeklyTarget),
    [sessions, meId, now, item.weeklyTarget]
  );

  return (
    <ChallengeHero
      groupName={item.group.name}
      challengeEnd={item.group.challenge_end}
      daysLeft={daysUntil(item.group.challenge_end, now)}
      stats={stats}
      potTotal={potTotal ?? null}
      members={members}
      replay={replay}
    />
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const me = useCurrentUser();
  const { data: profile } = useProfile();
  const { data: groups, isLoading } = useMyGroups();

  // Rejoue les compteurs et l'anneau à CHAQUE arrivée sur l'accueil : l'onglet
  // reste monté, donc sans ça l'animation ne se voit qu'une fois par session.
  const replay = useFocusReplay();

  const [index, setIndex] = useState(0);
  const list: MyGroup[] = useMemo(() => groups ?? [], [groups]);

  // Au premier chargement on se place sur le défi actif (pas forcément le 1er),
  // et on reste dans les bornes si un groupe disparaît.
  useEffect(() => {
    if (list.length === 0) return;
    setIndex((current) => {
      if (current < list.length) return current;
      return 0;
    });
  }, [list.length]);

  const [initialised, setInitialised] = useState(false);
  useEffect(() => {
    if (initialised || list.length === 0) return;
    const active = pickActiveGroup(list);
    const activeIndex = active ? list.findIndex((g) => g.group.id === active.group.id) : 0;
    setIndex(activeIndex < 0 ? 0 : activeIndex);
    setInitialised(true);
  }, [initialised, list]);

  const current = list[index];
  const groupId = current?.group.id;

  const { data: sessions = [] } = useGroupSessions(groupId);
  // Fiche détaillée d'une séance ouverte depuis « Dernières séances ».
  const [openedSession, setOpenedSession] = useState<SessionWithAuthor | null>(null);

  const firstName = profile?.first_name ?? "toi";
  const now = useMemo(() => new Date(), []);

  const stats = useMemo(
    () => weekStats(sessions, me?.id, weekStartString(now), current?.weeklyTarget ?? 0),
    [sessions, me?.id, now, current?.weeklyTarget]
  );

  const bars = useMemo(
    () => historyBars(sessions, me?.id, now, current?.weeklyTarget ?? 0),
    [sessions, me?.id, now, current?.weeklyTarget]
  );

  return (
    <View className="flex-1">
      <AppBackground />
      <TopFade />
      <ScreenContainer transparent padded={false} edges={["top"]}>
        <ScrollView
          contentContainerClassName="grow px-[18px] pb-8 pt-5"
          showsVerticalScrollIndicator={false}
        >
          {/* Header + salutation */}
          <Reveal delay={0}>
            <AppHeader />

            <View className="mt-5">
              <Text className="font-display text-[23px] tracking-tighter text-cream">
                Salut {firstName}
              </Text>
              <Text className="mt-1 font-body text-[13px] text-cream-dim">
                {current ? motivationLine(stats) : "Lance ton premier défi avec tes amis."}
              </Text>
            </View>
          </Reveal>

          {current && groupId ? (
            <>
              <Reveal delay={90} className="mt-5">
                <GroupCarousel
                  items={list}
                  index={index}
                  onIndexChange={setIndex}
                  labelFor={(item) => item.group.name}
                  renderItem={(item) => (
                    <HeroCard item={item} meId={me?.id} now={now} replay={replay} />
                  )}
                />
              </Reveal>

              <Reveal delay={150} className="mt-4">
                <GradientButton
                  icon={Plus}
                  onPress={() =>
                    router.push({
                      pathname: "/group/[id]/declare",
                      params: { id: groupId },
                    } as never)
                  }
                >
                  Déclarer une séance
                </GradientButton>
              </Reveal>

              <Reveal delay={200} className="mt-5">
                <WeekPlanner
                  key={groupId}
                  groupId={groupId}
                  weeklyTarget={current.weeklyTarget}
                  replay={replay}
                />
              </Reveal>

              <Reveal delay={250} className="mt-5">
                <RecentSessions
                  sessions={sessions}
                  meId={me?.id}
                  onOpenSession={setOpenedSession}
                  onSeeAll={() =>
                    router.push({
                      pathname: "/group/[id]",
                      params: { id: groupId, tab: "seances" },
                    } as never)
                  }
                />
              </Reveal>

              <Reveal delay={300} className="mt-5">
                <WeeklyHistory bars={bars} replay={replay} />
              </Reveal>

              <DevResetTools groupId={groupId} />
            </>
          ) : (
            // Aucun défi : bloc complet (flamme + titre + sous-titre + CTA) centré verticalement.
            // `grow` (contentContainer) + `flex-1 justify-center` = centrage fiable web + mobile.
            <View className="flex-1 justify-center">
              <EmptyGroups
                loading={isLoading}
                onCreate={() => router.push("/group/create" as never)}
                onJoin={() => router.push("/group/join" as never)}
                subtitle="Lance ton défi sportif et invite tes amis, ou rejoins le leur avec un code."
              />
            </View>
          )}
        </ScrollView>
      </ScreenContainer>

      <SessionDetailSheet session={openedSession} onClose={() => setOpenedSession(null)} />
    </View>
  );
}
