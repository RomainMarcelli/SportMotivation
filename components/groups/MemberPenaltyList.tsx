import { Check, Clock3, Coins, Send } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Stepper } from "@/components/ui/Stepper";
import { colors } from "@/constants/colors";
import {
  usePendingPenaltyChanges,
  useProposePenaltyChange,
  useSetMyPenalty,
  type PenaltyChange,
} from "@/features/groups/penalty-mutations";
import type { GroupMemberWithUser } from "@/features/groups/queries";

/** « 5 € », « 7,50 € ». */
function euros(amount: number): string {
  return Number.isInteger(amount) ? `${amount} €` : `${amount.toFixed(2).replace(".", ",")} €`;
}

type Props = {
  groupId: string;
  members: GroupMemberWithUser[];
  /** Pénalité par défaut du groupe, appliquée à qui n'a pas la sienne. */
  groupDefault: number;
  meId: string | undefined;
};

/**
 * Pénalité par membre (écran « Modifier le groupe », admin).
 *
 * Deux régimes, et c'était le nœud du problème : l'admin **s'auto-proposait**
 * un changement, avec notification à lui-même et attente d'un accord qu'il
 * n'avait qu'à se donner. Sa propre ligne applique donc directement ; celles
 * des autres restent une proposition qu'ils acceptent ou refusent.
 */
export function MemberPenaltyList({ groupId, members, groupDefault, meId }: Props) {
  const { data: pending } = usePendingPenaltyChanges(groupId);

  return (
    <View className="gap-2.5">
      <View
        className="flex-row items-start gap-2.5 rounded-[14px] border p-3.5"
        style={{ backgroundColor: colors.surface2, borderColor: colors.line }}
      >
        <Coins size={16} color={colors.amber} />
        <Text className="flex-1 font-body text-[12px] leading-[17px] text-cream-dim">
          Chaque membre peut avoir sa propre pénalité. Modifier celle d'un autre lui envoie une
          proposition : il reste libre de l'accepter.
        </Text>
      </View>

      {members.map((member) => (
        <MemberPenaltyRow
          key={member.id}
          groupId={groupId}
          member={member}
          groupDefault={groupDefault}
          isMe={member.user.id === meId}
          pending={(pending ?? []).find((c) => c.group_member_id === member.id)}
        />
      ))}
    </View>
  );
}

function MemberPenaltyRow({
  groupId,
  member,
  groupDefault,
  isMe,
  pending,
}: {
  groupId: string;
  member: GroupMemberWithUser;
  groupDefault: number;
  isMe: boolean;
  pending: PenaltyChange | undefined;
}) {
  const current = member.penaltyAmount ?? groupDefault;
  const [value, setValue] = useState(current);
  const propose = useProposePenaltyChange(groupId);
  const setMine = useSetMyPenalty(groupId);
  const { toast } = useFeedback();

  // La valeur en base peut changer sous nos pieds (le membre accepte une
  // proposition, un autre écran met à jour) : le curseur doit suivre.
  useEffect(() => setValue(current), [current]);

  const name = isMe
    ? "Toi"
    : member.user.first_name || member.user.username || "Membre";
  const changed = value !== current;
  const busy = propose.isPending || setMine.isPending;

  const onApply = () => {
    if (isMe) {
      setMine.mutate(value, {
        onSuccess: () => toast(`Ta pénalité passe à ${euros(value)}.`, "success"),
        onError: (e) => toast(e.message, "error"),
      });
      return;
    }
    propose.mutate(
      { membershipId: member.id, newAmount: value },
      {
        onSuccess: () => toast(`Proposition envoyée à ${name}.`, "success"),
        onError: (e) => toast(e.message, "error"),
      }
    );
  };

  return (
    <View
      // `testID` = ciblage E2E de la carte d'un membre (les steppers, sans nom
      // propre, se ressemblent tous à l'écran).
      testID={`penalty-row-${name}`}
      className="rounded-[16px] border p-3.5"
      style={{
        backgroundColor: colors.surface,
        borderColor: isMe ? colors.line2 : colors.line,
      }}
    >
      <View className="flex-row items-center gap-3">
        <Avatar
          uri={member.user.avatar_url}
          color={member.user.avatar_color}
          icon={member.user.avatar_icon}
          seed={member.user.id}
          name={`${member.user.first_name ?? ""} ${member.user.last_name ?? ""}`.trim()}
          size={36}
        />
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="font-body-bold text-[14px] text-cream">{name}</Text>
            {member.role === "admin" ? (
              <Text className="rounded-full bg-amber-soft px-2 py-0.5 font-body-bold text-[9.5px] uppercase tracking-label text-amber">
                Admin
              </Text>
            ) : null}
          </View>
          <Text className="mt-0.5 font-body text-[11.5px] text-cream-dim">
            Actuellement {euros(current)} par séance manquée
          </Text>
        </View>
      </View>

      {pending ? (
        <View
          className="mt-3 flex-row items-center gap-2 rounded-[12px] px-3 py-2.5"
          style={{ backgroundColor: colors.amberSoft }}
        >
          <Clock3 size={14} color={colors.amber} />
          <Text className="flex-1 font-body-semibold text-[12px]" style={{ color: colors.amber }}>
            {euros(pending.new_amount)} proposé · en attente de sa réponse
          </Text>
        </View>
      ) : (
        <>
          <View className="mt-3">
            <Stepper value={value} onChange={setValue} min={0} max={100} suffix="€" />
          </View>

          {changed ? (
            <Pressable
              onPress={onApply}
              disabled={busy}
              className="mt-2.5 flex-row items-center justify-center gap-2 rounded-input py-3 active:opacity-80"
              style={{
                backgroundColor: isMe ? colors.coral : colors.surface2,
                borderWidth: isMe ? 0 : 1,
                borderColor: colors.line2,
                opacity: busy ? 0.6 : 1,
              }}
            >
              {isMe ? (
                <Check size={15} color={colors.onCoral} strokeWidth={2.6} />
              ) : (
                <Send size={14} color={colors.cream} />
              )}
              <Text
                className="font-body-bold text-[13px]"
                style={{ color: isMe ? colors.onCoral : colors.cream }}
              >
                {isMe ? `Fixer à ${euros(value)}` : `Proposer ${euros(value)} à ${name}`}
              </Text>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
}
