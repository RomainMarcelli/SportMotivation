import { useRouter } from "expo-router";
import { Plus, Users } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";

import { AppHeader } from "@/components/home/AppHeader";
import { EmptyGroups } from "@/components/home/EmptyGroups";
import { GroupCard } from "@/components/home/GroupCard";
import { AppBackground } from "@/components/ui/AppBackground";
import { GradientButton } from "@/components/ui/GradientButton";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { TopFade } from "@/components/ui/TopFade";
import { colors } from "@/constants/colors";
import { useMyGroups } from "@/features/groups/queries";
import { groupsView } from "@/features/groups/selectors";

export default function GroupsScreen() {
  const router = useRouter();
  const { data: groups, isLoading } = useMyGroups();
  const view = groupsView(groups);

  // L'onglet Groupes liste TOUJOURS les défis (1 ou plusieurs). Plus de redirection auto vers
  // le détail : elle cassait la navigation du footer (l'onglet renvoyait sans cesse au groupe).
  const isList = view.kind === "list" || view.kind === "single";

  return (
    <View className="flex-1">
      <AppBackground />
      <TopFade />
      <ScreenContainer transparent padded={false} edges={["top"]}>
        <ScrollView
          contentContainerClassName="grow px-[18px] pb-8 pt-5"
          showsVerticalScrollIndicator={false}
        >
          <Reveal delay={0}>
            <AppHeader />
            <View className="mt-5">
              <Text className="font-display text-[23px] tracking-tighter text-cream">
                Mes groupes
              </Text>
              <Text className="mt-1 font-body text-[13px] text-cream-dim">
                {isList
                  ? "Tes défis et les groupes que tu as rejoints."
                  : "Crée ou rejoins un groupe pour commencer."}
              </Text>
            </View>
          </Reveal>

          {isList ? (
            <>
              <View className="mt-6 gap-3">
                {groups?.map((item, i) => (
                  <Reveal key={item.membershipId} delay={80 + i * 50}>
                    <GroupCard
                      item={item}
                      onPress={() =>
                        router.push({
                          pathname: "/group/[id]",
                          params: { id: item.group.id },
                        } as never)
                      }
                    />
                  </Reveal>
                ))}
              </View>

              <Reveal delay={120 + (groups?.length ?? 0) * 50} className="mt-6 gap-3">
                <GradientButton icon={Plus} onPress={() => router.push("/group/create" as never)}>
                  Créer un défi
                </GradientButton>
                <Pressable
                  onPress={() => router.push("/group/join" as never)}
                  className="h-[52px] flex-row items-center justify-center gap-2.5 rounded-input border border-line-2 bg-surface active:opacity-80"
                >
                  <Users size={18} color={colors.cream} />
                  <Text className="font-display text-[15px] text-cream">Rejoindre un défi</Text>
                </Pressable>
              </Reveal>
            </>
          ) : (
            // 0 défi (ou chargement) → état vide centré (identique à l'ancien état vide de l'accueil).
            <View className="flex-1 justify-center pb-12">
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
