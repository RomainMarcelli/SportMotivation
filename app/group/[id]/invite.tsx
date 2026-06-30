import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { Check, ListChecks, UserPlus } from "lucide-react-native";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { InviteBlock } from "@/components/groups/InviteBlock";
import { TextField } from "@/components/ui/TextField";
import {
  useInviteUser,
  useSearchUsers,
  type UserSearchResult,
} from "@/features/groups/invitations";
import { useGroup, useGroupMembers } from "@/features/groups/queries";
import { useCurrentUser } from "@/lib/auth-store";

export default function InviteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useFeedback();
  const user = useCurrentUser();
  const { data: group, isLoading } = useGroup(id);
  const { data: members } = useGroupMembers(id);
  const [query, setQuery] = useState("");
  const { data: results, isFetching } = useSearchUsers(query);
  const inviteUser = useInviteUser(id!);
  const [invitedIds, setInvitedIds] = useState<string[]>([]);

  if (isLoading || !group) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  const isAdmin = members?.some((m) => m.user.id === user?.id && m.role === "admin") ?? false;
  const memberIds = new Set(members?.map((m) => m.user.id) ?? []);

  const onInvite = (u: UserSearchResult) => {
    inviteUser.mutate(u.id, {
      onSuccess: () => {
        setInvitedIds((prev) => [...prev, u.id]);
        toast(`Invitation envoyée à ${u.first_name ?? u.username ?? "ce joueur"}`, "success");
      },
      onError: (e) => toast(e.message, "error"),
    });
  };

  const goToInvitations = () =>
    router.push({ pathname: "/group/[id]/invitations", params: { id: id! } } as never);

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-neutral-900"
      contentContainerClassName="p-6"
      keyboardShouldPersistTaps="handled"
    >
      {isAdmin ? (
        <View className="mb-8 gap-3">
          <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Inviter par pseudo
          </Text>
          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un pseudo…"
            autoCapitalize="none"
          />
          {query.trim().length === 1 ? (
            <Text className="text-xs text-neutral-400">Tape au moins 2 caractères…</Text>
          ) : null}

          {isFetching ? <ActivityIndicator color="#3b82f6" /> : null}

          {results?.map((u) => {
            const already = memberIds.has(u.id);
            const invited = invitedIds.includes(u.id);
            return (
              <View
                key={u.id}
                className="flex-row items-center gap-3 rounded-2xl border border-neutral-200 p-3 dark:border-neutral-700"
              >
                {u.avatar_url ? (
                  <Image source={{ uri: u.avatar_url }} className="h-10 w-10 rounded-full" />
                ) : (
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-500">
                    <Text className="text-xs font-bold text-white">
                      {(u.first_name?.[0] ?? "") + (u.last_name?.[0] ?? "")}
                    </Text>
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {u.first_name} {u.last_name}
                  </Text>
                  <Text className="text-xs text-neutral-500">@{u.username}</Text>
                </View>
                {already ? (
                  <Text className="text-xs text-neutral-400">Déjà membre</Text>
                ) : invited ? (
                  <View className="flex-row items-center gap-1">
                    <Check size={16} color="#16a34a" />
                    <Text className="text-xs font-medium text-green-600">Invité</Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => onInvite(u)}
                    className="flex-row items-center gap-1 rounded-full bg-primary-500 px-3 py-2"
                  >
                    <UserPlus size={14} color="#ffffff" />
                    <Text className="text-xs font-semibold text-white">Inviter</Text>
                  </Pressable>
                )}
              </View>
            );
          })}

          <Pressable
            onPress={goToInvitations}
            className="mt-1 flex-row items-center gap-2 rounded-2xl border border-neutral-200 p-3 active:opacity-70 dark:border-neutral-700"
          >
            <ListChecks size={18} color="#3b82f6" />
            <Text className="flex-1 text-sm font-medium text-neutral-700 dark:text-neutral-200">
              Voir les invitations envoyées
            </Text>
          </Pressable>

          <View className="mt-2 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
            <Text className="text-xs text-neutral-400">ou partage le code</Text>
            <View className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
          </View>
        </View>
      ) : null}

      <InviteBlock inviteCode={group.invite_code} groupName={group.name} />
    </ScrollView>
  );
}
