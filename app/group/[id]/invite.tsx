import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Check, Copy, Share2, UserPlus } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import {
  useInviteUser,
  useSearchUsers,
  type UserSearchResult,
} from "@/features/groups/invitations";
import { useGroup, useGroupMembers } from "@/features/groups/queries";
import { useCurrentUser } from "@/lib/auth-store";
import { buildInviteLink } from "@/lib/invite-link";

export default function InviteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useCurrentUser();
  const { data: group, isLoading } = useGroup(id);
  const { data: members } = useGroupMembers(id);
  const [copied, setCopied] = useState(false);
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
  const link = buildInviteLink(group.invite_code);

  const copyCode = async () => {
    await Clipboard.setStringAsync(group.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const onShare = async () => {
    await Share.share({
      message: `Rejoins mon défi sportif "${group.name}" sur Sport Motiv !\n\nCode : ${group.invite_code}\nLien : ${link}`,
    });
  };

  const onInvite = (u: UserSearchResult) => {
    inviteUser.mutate(u.id, {
      onSuccess: () => setInvitedIds((prev) => [...prev, u.id]),
      onError: (e) => Alert.alert("Invitation impossible", e.message),
    });
  };

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

          <View className="mt-2 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
            <Text className="text-xs text-neutral-400">ou partage le code</Text>
            <View className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
          </View>
        </View>
      ) : null}

      <View className="items-center">
        <View className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <QRCode value={link} size={180} backgroundColor="#ffffff" color="#0f172a" />
        </View>

        <Text className="text-xs uppercase tracking-wide text-neutral-400">Code d'invitation</Text>
        <Pressable onPress={copyCode} className="mb-1 flex-row items-center gap-3 active:opacity-70">
          <Text className="text-4xl font-bold tracking-[8px] text-neutral-900 dark:text-white">
            {group.invite_code}
          </Text>
          {copied ? <Check size={22} color="#16a34a" /> : <Copy size={22} color="#94a3b8" />}
        </Pressable>
        <Text className="mb-6 text-xs text-neutral-400">
          {copied ? "Code copié !" : "Appuie pour copier"}
        </Text>

        <View className="w-full max-w-sm">
          <Button onPress={onShare}>Partager l'invitation</Button>
        </View>
        <View className="mt-4 flex-row items-center gap-2">
          <Share2 size={14} color="#94a3b8" />
          <Text className="text-xs text-neutral-400">SMS, WhatsApp, email…</Text>
        </View>
      </View>
    </ScrollView>
  );
}
