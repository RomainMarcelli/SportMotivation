import { useLocalSearchParams } from "expo-router";
import { Check, PauseCircle, UserMinus, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { AppBackground } from "@/components/ui/AppBackground";
import { Avatar } from "@/components/ui/Avatar";
import { DateField } from "@/components/ui/DateField";
import { GradientButton } from "@/components/ui/GradientButton";
import { Reveal } from "@/components/ui/Reveal";
import { TextField } from "@/components/ui/TextField";
import { colors } from "@/constants/colors";
import { useGroup, useGroupMembers, type GroupMemberWithUser } from "@/features/groups/queries";
import {
  useAdminSuspendMember,
  useCancelSuspension,
  useDecideSuspension,
  useRequestSuspension,
} from "@/features/suspensions/mutations";
import { useGroupSuspensions } from "@/features/suspensions/queries";
import {
  mapSuspensionError,
  suspensionRequestError,
  suspensionShortRange,
  suspensionStatusLabel,
  type Suspension,
} from "@/features/suspensions/suspension";
import { useCurrentUser } from "@/lib/auth-store";
import { toDateOnly } from "@/lib/date";

export default function SuspensionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: group, isLoading } = useGroup(id);
  const { data: members } = useGroupMembers(id);
  const { data: suspensions } = useGroupSuspensions(id);

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

  return (
    <SuspensionsView
      groupId={id!}
      challengeEnd={group.challenge_end}
      members={members ?? []}
      suspensions={suspensions ?? []}
    />
  );
}

function SecHead({ title }: { title: string }) {
  return (
    <Text className="mb-2.5 px-0.5 font-body-bold text-[12px] uppercase tracking-label text-cream-dim">
      {title}
    </Text>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View
      className="rounded-[18px] border p-3.5"
      style={{ backgroundColor: colors.surface, borderColor: colors.line2 }}
    >
      {children}
    </View>
  );
}

function SuspensionsView({
  groupId,
  challengeEnd,
  members,
  suspensions,
}: {
  groupId: string;
  challengeEnd: string;
  members: GroupMemberWithUser[];
  suspensions: Suspension[];
}) {
  const me = useCurrentUser();
  const meId = me?.id;
  const { toast } = useFeedback();

  const isAdmin = members.some((m) => m.user.id === meId && m.role === "admin");

  const adminSuspend = useAdminSuspendMember(groupId);
  const requestSuspension = useRequestSuspension(groupId);
  const decide = useDecideSuspension(groupId);
  const cancel = useCancelSuspension(groupId);

  // Formulaire (admin = suspendre un membre ; joueur = demander).
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [start, setStart] = useState<Date | undefined>(undefined);
  const [end, setEnd] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const nameOf = (userId: string) => {
    const m = members.find((mm) => mm.user.id === userId);
    return m ? m.user.first_name || m.user.username || "Membre" : "Membre";
  };

  const pending = suspensions.filter((s) => s.status === "pending");
  const active = suspensions.filter((s) => s.status === "active");
  const myPending = pending.filter((s) => s.userId === meId);

  const endMax = useMemo(() => {
    const [y, m, d] = challengeEnd.slice(0, 10).split("-").map(Number);
    return y && m && d ? new Date(y, m - 1, d) : undefined;
  }, [challengeEnd]);
  const today = useMemo(() => new Date(), []);

  const resetForm = () => {
    setSelectedMember(null);
    setStart(undefined);
    setEnd(undefined);
    setReason("");
    setFormError(null);
  };

  const onSubmit = () => {
    setFormError(null);
    const startISO = start ? toDateOnly(start) : "";
    const endISO = end ? toDateOnly(end) : "";

    if (isAdmin) {
      // Admin : membre + dates obligatoires, motif facultatif.
      if (!selectedMember) return setFormError("Choisis le membre à suspendre.");
      if (!startISO || !endISO) return setFormError("Choisis une date de début et de fin.");
      if (endISO < startISO) return setFormError("La date de fin doit être après le début.");
      adminSuspend.mutate(
        { userId: selectedMember, startISO, endISO, reason: reason.trim() || null },
        {
          onSuccess: () => {
            toast(`${nameOf(selectedMember)} est suspendu ${suspensionShortRange(startISO, endISO)}.`, "success");
            resetForm();
          },
          onError: (e) => setFormError(mapSuspensionError(e.message)),
        }
      );
      return;
    }

    // Joueur : dates + motif obligatoires (validé comme le serveur).
    const err = suspensionRequestError({ startISO, endISO, reason });
    if (err) return setFormError(err);
    requestSuspension.mutate(
      { startISO, endISO, reason: reason.trim() },
      {
        onSuccess: () => {
          toast("Demande envoyée. L'admin va statuer.", "success");
          resetForm();
        },
        onError: (e) => setFormError(mapSuspensionError(e.message)),
      }
    );
  };

  const onDecide = (s: Suspension, accept: boolean) => {
    decide.mutate(
      { suspensionId: s.id, accept },
      {
        onSuccess: () =>
          toast(accept ? "Suspension accordée." : "Demande refusée.", "success"),
        onError: (e) => toast(mapSuspensionError(e.message), "error"),
      }
    );
  };

  const onCancel = (s: Suspension) => {
    cancel.mutate(s.id, {
      onSuccess: () => toast(s.status === "pending" ? "Demande retirée." : "Suspension levée.", "success"),
      onError: (e) => toast(mapSuspensionError(e.message), "error"),
    });
  };

  const submitting = adminSuspend.isPending || requestSuspension.isPending;
  const selectableMembers = members.filter((m) => m.user.id !== meId);

  return (
    <View className="flex-1">
      <AppBackground />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-4 px-0.5 font-body text-[12.5px] leading-[18px] text-cream-dim">
          Un membre suspendu est exonéré de tout (blâmes et pénalités « séance manquée ») sur la
          période choisie.{" "}
          {isAdmin
            ? "Suspends un membre, ou traite les demandes."
            : "Fais une demande à l'admin, avec un motif."}
        </Text>

        {/* Demandes en attente (admin) ------------------------------------- */}
        {isAdmin && pending.length > 0 ? (
          <Reveal className="mb-5">
            <SecHead title="Demandes en attente" />
            <View className="gap-2">
              {pending.map((s) => (
                <Card key={s.id}>
                  <SuspensionHeader name={nameOf(s.userId)} range={suspensionShortRange(s.startDate, s.endDate)} avatar={memberOf(members, s.userId)} />
                  {s.reason ? (
                    <Text className="mt-2 font-body text-[12.5px] italic leading-[17px] text-cream">
                      « {s.reason} »
                    </Text>
                  ) : null}
                  <View className="mt-3 flex-row gap-2.5">
                    <Pressable
                      onPress={() => onDecide(s, false)}
                      disabled={decide.isPending}
                      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-full border py-2.5 active:opacity-80"
                      style={{ borderColor: colors.line2, backgroundColor: colors.surface2 }}
                    >
                      <X size={15} color={colors.red} strokeWidth={2.6} />
                      <Text className="font-body-semibold text-[13px] text-cream">Refuser</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => onDecide(s, true)}
                      disabled={decide.isPending}
                      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-full py-2.5 active:opacity-80"
                      style={{ backgroundColor: colors.mint }}
                    >
                      <Check size={15} color={colors.onMint} strokeWidth={2.8} />
                      <Text className="font-body-bold text-[13px]" style={{ color: colors.onMint }}>
                        Accepter
                      </Text>
                    </Pressable>
                  </View>
                </Card>
              ))}
            </View>
          </Reveal>
        ) : null}

        {/* Suspensions en cours -------------------------------------------- */}
        {active.length > 0 ? (
          <Reveal className="mb-5">
            <SecHead title="En cours" />
            <View className="gap-2">
              {active.map((s) => (
                <Card key={s.id}>
                  <SuspensionHeader
                    name={s.userId === meId ? "Toi" : nameOf(s.userId)}
                    range={suspensionShortRange(s.startDate, s.endDate)}
                    avatar={memberOf(members, s.userId)}
                  />
                  {s.reason ? (
                    <Text className="mt-2 font-body text-[12.5px] italic leading-[17px] text-cream">
                      « {s.reason} »
                    </Text>
                  ) : null}
                  {isAdmin ? (
                    <Pressable
                      onPress={() => onCancel(s)}
                      disabled={cancel.isPending}
                      className="mt-3 flex-row items-center justify-center gap-1.5 rounded-full border py-2.5 active:opacity-80"
                      style={{ borderColor: colors.line2, backgroundColor: colors.surface2 }}
                    >
                      <UserMinus size={15} color={colors.creamDim} />
                      <Text className="font-body-semibold text-[13px] text-cream">
                        Lever la suspension
                      </Text>
                    </Pressable>
                  ) : null}
                </Card>
              ))}
            </View>
          </Reveal>
        ) : null}

        {/* Mes demandes en attente (joueur) -------------------------------- */}
        {!isAdmin && myPending.length > 0 ? (
          <Reveal className="mb-5">
            <SecHead title="Ma demande" />
            <View className="gap-2">
              {myPending.map((s) => (
                <Card key={s.id}>
                  <View className="flex-row items-center gap-2">
                    <PauseCircle size={16} color={colors.amber} />
                    <Text className="flex-1 font-body-bold text-[13.5px] text-cream">
                      {suspensionShortRange(s.startDate, s.endDate)}
                    </Text>
                    <Text className="font-body-semibold text-[11.5px]" style={{ color: colors.amber }}>
                      {suspensionStatusLabel(s.status)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => onCancel(s)}
                    disabled={cancel.isPending}
                    className="mt-3 flex-row items-center justify-center gap-1.5 rounded-full border py-2.5 active:opacity-80"
                    style={{ borderColor: colors.line2, backgroundColor: colors.surface2 }}
                  >
                    <X size={15} color={colors.creamDim} />
                    <Text className="font-body-semibold text-[13px] text-cream">Retirer ma demande</Text>
                  </Pressable>
                </Card>
              ))}
            </View>
          </Reveal>
        ) : null}

        {/* Formulaire : suspendre (admin) / demander (joueur) -------------- */}
        <Reveal>
          <SecHead title={isAdmin ? "Suspendre un membre" : "Demander une suspension"} />
          <Card>
            {isAdmin ? (
              <View className="mb-3">
                <Text className="mb-2 font-body-semibold text-[12px] uppercase tracking-label text-cream-dim">
                  Membre
                </Text>
                {selectableMembers.length === 0 ? (
                  <Text className="font-body text-[12.5px] text-cream-dim">
                    Aucun autre membre à suspendre.
                  </Text>
                ) : (
                  <View className="flex-row flex-wrap gap-2">
                    {selectableMembers.map((m) => {
                      const on = selectedMember === m.user.id;
                      return (
                        <Pressable
                          key={m.user.id}
                          onPress={() => setSelectedMember(on ? null : m.user.id)}
                          className="flex-row items-center gap-2 rounded-full border px-3 py-2 active:opacity-80"
                          style={{
                            backgroundColor: on ? colors.coralSoft : colors.surface2,
                            borderColor: on ? colors.coral : colors.line2,
                          }}
                        >
                          <Avatar
                            uri={m.user.avatar_url}
                            color={m.user.avatar_color}
                            icon={m.user.avatar_icon}
                            seed={m.user.id}
                            name={`${m.user.first_name ?? ""} ${m.user.last_name ?? ""}`.trim()}
                            size={22}
                          />
                          <Text
                            className="font-body-semibold text-[12.5px]"
                            style={{ color: on ? colors.coral : colors.cream }}
                          >
                            {m.user.first_name || m.user.username || "Membre"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : null}

            <View className="mb-3 flex-row gap-2.5">
              <DateField
                label="Début"
                value={start}
                onChange={(d) => {
                  setStart(d);
                  if (end && toDateOnly(end) < toDateOnly(d)) setEnd(undefined);
                }}
                minimumDate={today}
                maximumDate={endMax}
              />
              <DateField
                label="Fin"
                value={end}
                onChange={setEnd}
                minimumDate={start ?? today}
                maximumDate={endMax}
              />
            </View>

            <TextField
              label={isAdmin ? "Motif (facultatif)" : "Motif"}
              value={reason}
              onChangeText={setReason}
              placeholder={isAdmin ? "Blessure, vacances…" : "Explique ta situation"}
              maxLength={280}
            />

            {formError ? (
              <Text className="mt-2 font-body text-[12px] text-red">{formError}</Text>
            ) : null}

            <View className="mt-3.5">
              <GradientButton icon={PauseCircle} loading={submitting} onPress={onSubmit}>
                {isAdmin ? "Suspendre" : "Envoyer la demande"}
              </GradientButton>
            </View>
          </Card>
        </Reveal>
      </ScrollView>
    </View>
  );
}

function memberOf(members: GroupMemberWithUser[], userId: string): GroupMemberWithUser | undefined {
  return members.find((m) => m.user.id === userId);
}

function SuspensionHeader({
  name,
  range,
  avatar,
}: {
  name: string;
  range: string;
  avatar: GroupMemberWithUser | undefined;
}) {
  return (
    <View className="flex-row items-center gap-3">
      {avatar ? (
        <Avatar
          uri={avatar.user.avatar_url}
          color={avatar.user.avatar_color}
          icon={avatar.user.avatar_icon}
          seed={avatar.user.id}
          name={`${avatar.user.first_name ?? ""} ${avatar.user.last_name ?? ""}`.trim()}
          size={34}
        />
      ) : (
        <View className="h-[34px] w-[34px] items-center justify-center rounded-full bg-surface-2">
          <PauseCircle size={18} color={colors.amber} />
        </View>
      )}
      <View className="flex-1">
        <Text className="font-body-bold text-[13.5px] text-cream">{name}</Text>
        <Text className="mt-0.5 font-body text-[11.5px] text-cream-dim">{range}</Text>
      </View>
    </View>
  );
}
