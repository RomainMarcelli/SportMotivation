import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Trash2 } from "lucide-react-native";

import { ActivityPicker } from "@/components/groups/ActivityPicker";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { Button } from "@/components/ui/Button";
import { Stepper } from "@/components/ui/Stepper";
import { TextField } from "@/components/ui/TextField";
import {
  useDeleteGroup,
  useProposePenaltyChange,
  useUpdateGroupSettings,
} from "@/features/groups/penalty-mutations";
import {
  useGroup,
  useGroupMembers,
  type GroupMemberWithUser,
} from "@/features/groups/queries";
import type { Database } from "@/types/database.types";

type GroupRow = Database["public"]["Tables"]["groups"]["Row"];

export default function EditGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: group, isLoading } = useGroup(id);
  const { data: members } = useGroupMembers(id);

  if (isLoading || !group) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  return <EditForm group={group} members={members ?? []} groupId={id!} />;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {title}
      </Text>
      {children}
    </View>
  );
}

function EditForm({
  group,
  members,
  groupId,
}: {
  group: GroupRow;
  members: GroupMemberWithUser[];
  groupId: string;
}) {
  const router = useRouter();
  const update = useUpdateGroupSettings(groupId);
  const deleteGroup = useDeleteGroup(groupId);
  const { confirm, toast } = useFeedback();

  const onDelete = async () => {
    const ok = await confirm({
      title: "Supprimer le groupe",
      message:
        "Cette action est irréversible. Toutes les données du groupe (membres, séances, cagnotte) seront supprimées.",
      confirmLabel: "Supprimer",
      destructive: true,
    });
    if (!ok) return;
    deleteGroup.mutate(undefined, {
      onSuccess: () => {
        toast("Groupe supprimé", "success");
        // Le groupe n'existe plus → on renvoie direct sur l'onglet Groupes.
        router.replace("/groups" as never);
      },
      onError: (e) => toast(e.message, "error"),
    });
  };

  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const [penalty, setPenalty] = useState(group.penalty_amount);
  const [minDuration, setMinDuration] = useState(group.min_duration_min);
  const [blameThreshold, setBlameThreshold] = useState(group.blame_threshold);
  const [activities, setActivities] = useState<string[]>(
    Array.isArray(group.accepted_activities) ? (group.accepted_activities as string[]) : []
  );

  const onSave = () => {
    if (name.trim().length < 2) {
      toast("Le nom doit faire au moins 2 caractères.", "error");
      return;
    }
    if (activities.length === 0) {
      toast("Sélectionne au moins une activité.", "error");
      return;
    }
    update.mutate(
      {
        name: name.trim(),
        description: description.trim() || null,
        penalty_amount: penalty,
        min_duration_min: minDuration,
        blame_threshold: blameThreshold,
        accepted_activities: activities,
      },
      {
        onSuccess: () => toast("Réglages du groupe mis à jour", "success"),
        onError: (e) => toast(e.message, "error"),
      }
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-neutral-900"
      contentContainerClassName="gap-7 p-6 pb-12"
      keyboardShouldPersistTaps="handled"
    >
      <Section title="Infos">
        <TextField label="Nom du groupe" value={name} onChangeText={setName} />
        <TextField
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
        />
      </Section>

      <Section title="Règles">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Pénalité par défaut
          </Text>
          <Stepper value={penalty} onChange={setPenalty} min={0} max={100} suffix="€" />
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Durée min. d'une séance
          </Text>
          <Stepper value={minDuration} onChange={setMinDuration} min={5} max={180} step={5} suffix="min" />
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Seuil de blâmes
          </Text>
          <Stepper value={blameThreshold} onChange={setBlameThreshold} min={1} max={10} />
        </View>
        <View className="gap-2">
          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Activités acceptées
          </Text>
          <ActivityPicker value={activities} onChange={setActivities} />
        </View>
        <Button onPress={onSave} loading={update.isPending}>
          Enregistrer les réglages
        </Button>
      </Section>

      <Section title="Pénalités des membres">
        <Text className="text-xs text-neutral-400">
          Proposer un changement envoie une notification au membre, qui doit l'accepter.
        </Text>
        {members.map((member) => (
          <MemberPenaltyRow
            key={member.id}
            member={member}
            groupDefault={penalty}
            groupId={groupId}
          />
        ))}
      </Section>

      <Section title="Zone de danger">
        <Pressable
          onPress={onDelete}
          disabled={deleteGroup.isPending}
          className="flex-row items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 active:opacity-70 dark:border-red-900 dark:bg-red-950"
        >
          {deleteGroup.isPending ? (
            <ActivityIndicator color="#ef4444" />
          ) : (
            <Trash2 size={18} color="#ef4444" />
          )}
          <Text className="text-base font-semibold text-red-600 dark:text-red-400">
            Supprimer le groupe
          </Text>
        </Pressable>
      </Section>
    </ScrollView>
  );
}

function MemberPenaltyRow({
  member,
  groupDefault,
  groupId,
}: {
  member: GroupMemberWithUser;
  groupDefault: number;
  groupId: string;
}) {
  const current = member.penaltyAmount ?? groupDefault;
  const [value, setValue] = useState(current);
  const propose = useProposePenaltyChange(groupId);
  const { toast } = useFeedback();

  const onPropose = () => {
    propose.mutate(
      { membershipId: member.id, newAmount: value },
      {
        onSuccess: () =>
          toast(`Proposition envoyée à ${member.user.first_name}`, "success"),
        onError: (e) => toast(e.message, "error"),
      }
    );
  };

  return (
    <View className="gap-2 rounded-2xl border border-neutral-200 p-3 dark:border-neutral-700">
      <Text className="text-sm font-semibold text-neutral-900 dark:text-white">
        {member.user.first_name} {member.user.last_name}
      </Text>
      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-neutral-400">Actuel : {current} €</Text>
        <Stepper value={value} onChange={setValue} min={0} max={100} suffix="€" />
      </View>
      {value !== current ? (
        <Button variant="secondary" onPress={onPropose} loading={propose.isPending}>
          {`Proposer ${value} €`}
        </Button>
      ) : null}
    </View>
  );
}
