import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { MoreVertical } from "lucide-react-native";

import { roleLabel, type MemberRole } from "@/constants/roles";
import { RoleBadge } from "@/components/groups/RoleBadge";
import { useRemoveMember, useUpdateMemberRole } from "@/features/groups/member-mutations";
import { useGroupMembers, type GroupMemberWithUser } from "@/features/groups/queries";
import { useCurrentUser } from "@/lib/auth-store";

export default function MembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useCurrentUser();
  const { data: members, isLoading } = useGroupMembers(id);
  const updateRole = useUpdateMemberRole(id!);
  const removeMember = useRemoveMember(id!);

  if (isLoading || !members) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  const isAdmin = members.some((m) => m.user.id === user?.id && m.role === "admin");

  const openActions = (member: GroupMemberWithUser) => {
    if (!isAdmin || member.user.id === user?.id) return;

    const setRole = (role: MemberRole) =>
      updateRole.mutate(
        { membershipId: member.id, role },
        { onError: (e) => Alert.alert("Erreur", e.message) }
      );

    const buttons: { text: string; style?: "cancel" | "destructive"; onPress?: () => void }[] = [];
    if (member.role !== "admin")
      buttons.push({ text: "Nommer admin", onPress: () => setRole("admin") });
    if (member.role !== "treasurer")
      buttons.push({ text: "Nommer trésorier", onPress: () => setRole("treasurer") });
    if (member.role !== "member")
      buttons.push({ text: "Repasser membre", onPress: () => setRole("member") });
    buttons.push({
      text: "Exclure du groupe",
      style: "destructive",
      onPress: () =>
        Alert.alert("Exclure ce membre ?", "Sa contribution reste dans la cagnotte.", [
          { text: "Annuler", style: "cancel" },
          {
            text: "Exclure",
            style: "destructive",
            onPress: () =>
              removeMember.mutate(member.id, {
                onError: (e) => Alert.alert("Erreur", e.message),
              }),
          },
        ]),
    });
    buttons.push({ text: "Annuler", style: "cancel" });

    Alert.alert(
      `${member.user.first_name} ${member.user.last_name}`,
      `Rôle actuel : ${roleLabel(member.role)}`,
      buttons
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-neutral-900"
      contentContainerClassName="gap-2 p-6"
    >
      <Text className="mb-2 text-sm text-neutral-500 dark:text-neutral-400">
        {members.length} membre{members.length > 1 ? "s" : ""}
        {isAdmin ? " — appuie sur un membre pour gérer son rôle" : ""}
      </Text>

      {members.map((member) => {
        const isSelf = member.user.id === user?.id;
        return (
          <Pressable
            key={member.id}
            onPress={() => openActions(member)}
            disabled={!isAdmin || isSelf}
            className="flex-row items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800"
          >
            {member.user.avatar_url ? (
              <Image source={{ uri: member.user.avatar_url }} className="h-11 w-11 rounded-full" />
            ) : (
              <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-500">
                <Text className="text-sm font-bold text-white">
                  {(member.user.first_name?.[0] ?? "") + (member.user.last_name?.[0] ?? "")}
                </Text>
              </View>
            )}
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-base font-semibold text-neutral-900 dark:text-white">
                  {member.user.first_name} {member.user.last_name}
                  {isSelf ? " (toi)" : ""}
                </Text>
                <RoleBadge role={member.role} />
              </View>
              <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                {roleLabel(member.role)} · {member.weeklyTarget} séance
                {member.weeklyTarget > 1 ? "s" : ""}/sem
              </Text>
            </View>
            {isAdmin && !isSelf ? <MoreVertical size={20} color="#94a3b8" /> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
