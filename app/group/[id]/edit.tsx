import { useLocalSearchParams, useRouter } from "expo-router";
import {
  CalendarClock,
  Coins,
  Clock,
  Tag,
  Trash2,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { ActivityPicker } from "@/components/groups/ActivityPicker";
import { MemberPenaltyList } from "@/components/groups/MemberPenaltyList";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { AppBackground } from "@/components/ui/AppBackground";
import { GradientButton } from "@/components/ui/GradientButton";
import { Reveal } from "@/components/ui/Reveal";
import { Stepper } from "@/components/ui/Stepper";
import { TextField } from "@/components/ui/TextField";
import { colors } from "@/constants/colors";
import { useDeleteGroup, useUpdateGroupSettings } from "@/features/groups/penalty-mutations";
import { useGroup, useGroupMembers, type GroupMemberWithUser } from "@/features/groups/queries";
import { useCurrentUser } from "@/lib/auth-store";
import type { Database } from "@/types/database.types";

type GroupRow = Database["public"]["Tables"]["groups"]["Row"];

export default function EditGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: group, isLoading } = useGroup(id);
  const { data: members } = useGroupMembers(id);

  if (isLoading || !group) {
    return (
      <View className="flex-1">
        <AppBackground />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.coral} />
        </View>
      </View>
    );
  }

  return <EditForm group={group} members={members ?? []} groupId={id!} />;
}

/** Entête de section DA (petit label majuscule). */
function SecHead({ title }: { title: string }) {
  return (
    <Text className="mb-2.5 px-0.5 font-body-bold text-[12px] uppercase tracking-label text-cream-dim">
      {title}
    </Text>
  );
}

/** Carte DA regroupant des lignes de réglage. */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <View
      className="rounded-[18px] border px-3.5"
      style={{ backgroundColor: colors.surface, borderColor: colors.line2 }}
    >
      {children}
    </View>
  );
}

/** Ligne « libellé + contrôle » (Stepper), séparateur bas sauf la dernière. */
function RuleRow({
  icon: Icon,
  label,
  hint,
  last,
  children,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View
      className="flex-row items-center gap-3 py-3.5"
      style={{ borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.line }}
    >
      <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-surface-2">
        <Icon size={17} color={colors.creamDim} />
      </View>
      <View className="flex-1">
        <Text className="font-body-semibold text-[13.5px] text-cream">{label}</Text>
        {hint ? (
          <Text className="mt-0.5 font-body text-[11px] text-cream-dim">{hint}</Text>
        ) : null}
      </View>
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
  const me = useCurrentUser();
  const update = useUpdateGroupSettings(groupId);
  const deleteGroup = useDeleteGroup(groupId);
  const { confirm, toast } = useFeedback();

  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const [penalty, setPenalty] = useState(group.penalty_amount);
  const [minDuration, setMinDuration] = useState(group.min_duration_min);
  const [blameThreshold, setBlameThreshold] = useState(group.blame_threshold);
  const [maxPerDay, setMaxPerDay] = useState<number | null>(group.max_sessions_per_day);
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
        max_sessions_per_day: maxPerDay,
      },
      {
        onSuccess: () => toast("Réglages du groupe mis à jour.", "success"),
        onError: (e) => toast(e.message, "error"),
      }
    );
  };

  const onDelete = async () => {
    const ok = await confirm({
      title: "Supprimer le groupe",
      message:
        "Cette action est irréversible. Toutes les données du groupe (membres, séances, cagnotte) " +
        "seront supprimées, et chaque membre en sera informé.",
      confirmLabel: "Supprimer",
      destructive: true,
    });
    if (!ok) return;
    deleteGroup.mutate(undefined, {
      onSuccess: () => {
        toast("Groupe supprimé.", "success");
        router.replace("/groups" as never);
      },
      onError: (e) => toast(e.message, "error"),
    });
  };

  return (
    <View className="flex-1">
      <AppBackground />
      <ScrollView
        contentContainerStyle={{ padding: 18, paddingBottom: 40, gap: 22 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Reveal delay={0}>
          <SecHead title="Infos" />
          <View className="gap-3">
            <TextField label="Nom du défi" value={name} onChangeText={setName} />
            <TextField
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Optionnel"
              multiline
            />
          </View>
        </Reveal>

        <Reveal delay={60}>
          <SecHead title="Règles" />
          <Card>
            <RuleRow icon={Coins} label="Pénalité par défaut" hint="À l'arrivée, chacun règle la sienne">
              <Stepper value={penalty} onChange={setPenalty} min={0} max={100} suffix="€" />
            </RuleRow>
            <RuleRow icon={Clock} label="Durée minimum">
              <Stepper
                value={minDuration}
                onChange={setMinDuration}
                min={0}
                max={180}
                step={5}
                zeroLabel="Aucun"
                suffix="min"
              />
            </RuleRow>
            <RuleRow icon={CalendarClock} label="Séances / jour max" hint="0 = sans limite">
              <Stepper
                value={maxPerDay ?? 0}
                onChange={(n) => setMaxPerDay(n === 0 ? null : n)}
                min={0}
                max={20}
                zeroLabel="∞"
              />
            </RuleRow>
            <RuleRow icon={TriangleAlert} label="Seuil de blâmes" last>
              <Stepper value={blameThreshold} onChange={setBlameThreshold} min={1} max={10} />
            </RuleRow>
          </Card>

          <View className="mt-3">
            <SecHead title="Activités acceptées" />
            <ActivityPicker value={activities} onChange={setActivities} />
          </View>

          <View className="mt-4">
            <GradientButton icon={Tag} onPress={onSave} loading={update.isPending}>
              Enregistrer les réglages
            </GradientButton>
          </View>
        </Reveal>

        <Reveal delay={120}>
          <SecHead title="Pénalités des membres" />
          <MemberPenaltyList groupId={groupId} members={members} groupDefault={penalty} meId={me?.id} />
        </Reveal>

        <Reveal delay={180}>
          <SecHead title="Zone de danger" />
          <Pressable
            onPress={onDelete}
            disabled={deleteGroup.isPending}
            className="flex-row items-center gap-3 rounded-[16px] border p-4 active:opacity-80"
            style={{ backgroundColor: colors.redSoft, borderColor: "rgba(242,85,74,0.35)" }}
          >
            <View
              className="h-10 w-10 items-center justify-center rounded-[11px]"
              style={{ backgroundColor: "rgba(242,85,74,0.15)" }}
            >
              {deleteGroup.isPending ? (
                <ActivityIndicator color={colors.red} />
              ) : (
                <Trash2 size={19} color={colors.red} />
              )}
            </View>
            <View className="flex-1">
              <Text className="font-body-bold text-[14px]" style={{ color: colors.red }}>
                Supprimer le défi
              </Text>
              <Text className="mt-0.5 font-body text-[11.5px] text-cream-dim">
                Irréversible · les membres seront prévenus
              </Text>
            </View>
          </Pressable>
        </Reveal>
      </ScrollView>
    </View>
  );
}
