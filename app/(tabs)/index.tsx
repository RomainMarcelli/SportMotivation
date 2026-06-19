import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import { AppHeader } from "@/components/home/AppHeader";
import { EmptyGroups } from "@/components/home/EmptyGroups";
import { WeekPlanner } from "@/components/home/WeekPlanner";
import { AppBackground } from "@/components/ui/AppBackground";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { TopFade } from "@/components/ui/TopFade";
import { useMyGroups } from "@/features/groups/queries";
import { pickActiveGroup } from "@/features/groups/selectors";
import { useProfile } from "@/hooks/useProfile";

export default function HomeScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: groups, isLoading } = useMyGroups();

  const firstName = profile?.first_name ?? "toi";
  const activeGroup = pickActiveGroup(groups);

  const subtitle = activeGroup
    ? "Tiens ton rythme cette semaine."
    : "Lance ton premier défi avec tes amis.";

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
              <Text className="mt-1 font-body text-[13px] text-cream-dim">{subtitle}</Text>
            </View>
          </Reveal>

          {activeGroup ? (
            <Reveal delay={90} className="mt-6">
              <WeekPlanner groupId={activeGroup.group.id} weeklyTarget={activeGroup.weeklyTarget} />
            </Reveal>
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
    </View>
  );
}
