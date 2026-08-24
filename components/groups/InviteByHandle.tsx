import { AtSign, Check, Search, UserPlus, X } from "lucide-react-native";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { Avatar } from "@/components/ui/Avatar";
import { colors } from "@/constants/colors";
import {
  useGroupPendingInvitees,
  useInviteUser,
  useSearchUsers,
  type UserSearchResult,
} from "@/features/groups/invitations";
import { WEB_INPUT_RESET } from "@/lib/web-input";

type Props = {
  groupId: string;
  /** Identifiants des membres déjà dans le groupe (pour ne pas les proposer). */
  memberIds: Set<string>;
};

/**
 * Invitation par pseudo.
 *
 * Le code à 6 chiffres suppose un canal externe (message, oral). Ici l'admin
 * cherche directement quelqu'un qui a déjà l'app : la personne reçoit une
 * notification et rejoint d'un geste, sans rien recopier.
 *
 * Seuls les profils **publics** remontent (`users.is_searchable`, cf. 039) —
 * c'est la fonction SQL qui filtre, pas cet écran.
 */
export function InviteByHandle({ groupId, memberIds }: Props) {
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const { data: results, isFetching } = useSearchUsers(trimmed);
  const { data: pendingInvitees } = useGroupPendingInvitees(groupId);
  const invite = useInviteUser(groupId);
  const { toast } = useFeedback();

  const [justInvited, setJustInvited] = useState<string[]>([]);

  // Déjà invité (en attente) : reproposer créerait une seconde demande pour rien.
  const pendingIds = pendingInvitees ?? new Set<string>();

  const onInvite = (user: UserSearchResult) => {
    invite.mutate(user.id, {
      onSuccess: () => {
        setJustInvited((prev) => [...prev, user.id]);
        toast(`Invitation envoyée à ${user.first_name ?? user.username ?? "ce joueur"}.`, "success");
        // On vide le champ et on rend la main au clavier : inviter, c'est
        // rarement une seule personne. Sinon il fallait effacer à la main le
        // pseudo précédent avant de chercher le suivant.
        setQuery("");
        inputRef.current?.focus();
      },
      onError: (e) => toast(e.message, "error"),
    });
  };

  const visible = (results ?? []).filter((u) => !memberIds.has(u.id));

  return (
    <View className="gap-2.5">
      <View
        className="flex-row items-center gap-2.5 rounded-input border px-3.5"
        style={{ backgroundColor: colors.surface, borderColor: colors.line2, height: 50 }}
      >
        <AtSign size={17} color={colors.creamDim} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder="Chercher un pseudo…"
          placeholderTextColor="rgba(183,161,139,0.5)"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={[
            {
              flex: 1,
              fontFamily: "PlusJakartaSans_500Medium",
              fontSize: 14,
              color: colors.cream,
            },
            WEB_INPUT_RESET,
          ]}
        />
        {isFetching ? <ActivityIndicator size="small" color={colors.coral} /> : null}
        {!isFetching && trimmed.length > 0 ? (
          <Pressable
            onPress={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            hitSlop={10}
            accessibilityLabel="Effacer la recherche"
            className="active:opacity-70"
          >
            <X size={16} color={colors.creamDim} strokeWidth={2.4} />
          </Pressable>
        ) : null}
      </View>

      {trimmed.length > 0 && trimmed.length < 2 ? (
        <Text className="px-1 font-body text-[11.5px] text-cream-dim">
          Encore un caractère pour lancer la recherche.
        </Text>
      ) : null}

      {trimmed.length >= 2 && !isFetching && visible.length === 0 ? (
        <View className="flex-row items-center gap-2.5 px-1 py-2">
          <Search size={15} color={colors.creamDim} />
          <Text className="flex-1 font-body text-[12.5px] leading-4 text-cream-dim">
            Aucun joueur trouvé. Il a peut-être un profil privé — le code d'invitation marche
            dans tous les cas.
          </Text>
        </View>
      ) : null}

      {visible.map((user) => {
        const sent = justInvited.includes(user.id) || pendingIds.has(user.id);
        return (
          <View
            key={user.id}
            className="flex-row items-center gap-3 rounded-[14px] border p-3"
            style={{ backgroundColor: colors.surface, borderColor: colors.line }}
          >
            <Avatar
              uri={user.avatar_url}
              color={user.avatar_color}
              icon={user.avatar_icon}
              seed={user.id}
              name={`${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()}
              size={38}
            />
            <View className="flex-1">
              <Text numberOfLines={1} className="font-body-bold text-[13.5px] text-cream">
                {user.first_name || user.username || "Joueur"}
              </Text>
              {user.username ? (
                <Text numberOfLines={1} className="mt-0.5 font-body text-[11.5px] text-cream-dim">
                  @{user.username}
                </Text>
              ) : null}
            </View>

            {sent ? (
              <View
                className="flex-row items-center gap-1.5 rounded-full px-3 py-2"
                style={{ backgroundColor: colors.mintSoft }}
              >
                <Check size={13} color={colors.mint} strokeWidth={3} />
                <Text className="font-body-bold text-[12px]" style={{ color: colors.mint }}>
                  Invité
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={() => onInvite(user)}
                disabled={invite.isPending}
                className="flex-row items-center gap-1.5 rounded-full px-3.5 py-2 active:opacity-80"
                style={{ backgroundColor: colors.coral, opacity: invite.isPending ? 0.6 : 1 }}
              >
                <UserPlus size={13} color={colors.onCoral} strokeWidth={2.4} />
                <Text className="font-body-bold text-[12px]" style={{ color: colors.onCoral }}>
                  Inviter
                </Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}
