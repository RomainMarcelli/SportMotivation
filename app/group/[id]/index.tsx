import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  HeartPulse,
  LogOut,
  MoreVertical,
  Pencil,
  Plus,
  TriangleAlert,
  UserPlus,
  Vote,
} from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { AppBackground } from "@/components/ui/AppBackground";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CountUp } from "@/components/ui/CountUp";
import { GradientButton } from "@/components/ui/GradientButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Reveal } from "@/components/ui/Reveal";
import { AdminTransferSheet } from "@/components/groups/AdminTransferSheet";
import { GroupTabs } from "@/components/groups/GroupTabs";
import { InviteBlock } from "@/components/groups/InviteBlock";
import { InviteSheet } from "@/components/groups/InviteSheet";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { TopFade } from "@/components/ui/TopFade";
import { getActivityLabel } from "@/constants/activities";
import { colors } from "@/constants/colors";
import { classifyGroupError } from "@/features/groups/errors";
import { RulesRecap } from "@/features/groups/RulesRecap";
import {
  useGroup,
  useGroupMembers,
  usePot,
  useUnsettledBlames,
  type GroupMemberWithUser,
} from "@/features/groups/queries";
import { useGroupSessions, type SessionWithAuthor } from "@/features/sessions/queries";
import { useVotableSessions } from "@/features/votes/queries";
import { useMyWeekExcuse, useVotableExcuses } from "@/features/excuses/queries";
import { mapLeaveError, useLeaveGroup } from "@/features/groups/leave";
import { canTransferAdmin, eligibleNewAdmins, mapTransferAdminError } from "@/features/groups/admin-transfer";
import { useTransferAdmin } from "@/features/groups/transfer-mutations";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { useCurrentUser } from "@/lib/auth-store";
import { daysUntil, formatDbDate, startOfWeekMonday, toDateOnly } from "@/lib/date";
import type { Database } from "@/types/database.types";

type ExcuseRow = Database["public"]["Tables"]["excuses"]["Row"];
import { groupWeeklyProgress, memberStats, type MemberStat } from "@/lib/group-stats";

function memberName(m: GroupMemberWithUser, meId: string | undefined): string {
  if (m.user.id === meId) return "Toi";
  return m.user.first_name || m.user.username || "Membre";
}

export default function GroupDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const me = useCurrentUser();

  const { data: group, isLoading, error, refetch, isRefetching } = useGroup(id);
  const { data: members } = useGroupMembers(id);
  const { data: sessions } = useGroupSessions(id);
  const { data: pot } = usePot(id);
  const { data: blames } = useUnsettledBlames(id);
  const { data: votable } = useVotableSessions(id, me?.id);
  const { data: votableExcuses } = useVotableExcuses(id, me?.id);
  const { data: myExcuse } = useMyWeekExcuse(id);
  const leaveGroup = useLeaveGroup();
  const transferAdmin = useTransferAdmin(id);
  const { confirm, toast } = useFeedback();

  const [view, setView] = useState<"infos" | "seances">("infos");
  const [menuOpen, setMenuOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferPending, setTransferPending] = useState<string | null>(null);
  // Filtre de l'onglet Séances : 0 = semaine en cours, 1 = semaine précédente, etc.
  const [weekOffset, setWeekOffset] = useState(0);

  // Retour : on revient à l'écran précédent (liste des groupes), sinon repli sur l'onglet Groupes.
  const goBack = () =>
    router.canGoBack() ? router.back() : router.navigate("/groups" as never);

  if (isLoading) {
    return (
      <View className="flex-1">
        <AppBackground />
        <ScreenContainer transparent>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.coral} />
          </View>
        </ScreenContainer>
      </View>
    );
  }

  if (error || !group) {
    const classified = classifyGroupError(error);
    return (
      <View className="flex-1">
        <AppBackground />
        <ScreenContainer transparent>
          <View className="flex-1 items-center justify-center gap-5 px-2">
            <View className="h-14 w-14 items-center justify-center rounded-hero border border-line-2 bg-surface">
              <AlertCircle size={28} color={colors.red} />
            </View>
            <Text className="text-center font-body text-[14px] text-cream-dim">
              {classified.message}
            </Text>
            <View className="w-full max-w-[280px] gap-3">
              <GradientButton onPress={() => refetch()} loading={isRefetching || isLoading}>
                Réessayer
              </GradientButton>
              <Button
                variant="secondary"
                onPress={() => router.navigate("/groups" as never)}
              >
                Retour aux groupes
              </Button>
            </View>
          </View>
        </ScreenContainer>
      </View>
    );
  }

  const now = new Date();
  const memberList = members ?? [];
  const sessionList = sessions ?? [];
  const isAdmin = memberList.some((m) => m.user.id === me?.id && m.role === "admin");
  const left = daysUntil(group.challenge_end, now);
  const active = group.status === "active";

  const stats = memberStats(memberList, sessionList, now);
  const groupProg = groupWeeklyProgress(memberList, sessionList, now);

  const blameByUser = new Map((blames ?? []).map((b) => [b.userId, b.count]));
  const blamed = memberList
    .map((m) => ({ m, count: blameByUser.get(m.user.id) ?? 0 }))
    .filter((b) => b.count > 0);

  // Onglet « Séances » = MES séances uniquement (les séances des autres se votent via la
  // bannière « à valider » → écran de vote). On filtre donc sur l'auteur courant.
  const mySessions = sessionList.filter((s) => s.author.id === me?.id);

  // Navigation semaine par semaine (0 = en cours) : bornée au lundi de la semaine du début du défi.
  const currentMonday = startOfWeekMonday(now);
  const [cy, cm, cd] = group.challenge_start.split("-").map(Number);
  const challengeMonday = startOfWeekMonday(new Date(cy, (cm || 1) - 1, cd || 1));
  const maxOffset = Math.max(
    0,
    Math.round((currentMonday.getTime() - challengeMonday.getTime()) / (7 * 86_400_000))
  );
  const selectedMonday = new Date(currentMonday);
  selectedMonday.setDate(selectedMonday.getDate() - 7 * weekOffset);
  const selectedWeekStart = toDateOnly(selectedMonday);
  const weekLabel =
    weekOffset === 0
      ? "Cette semaine"
      : `Semaine du ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(selectedMonday)}`;

  const weekSessions = mySessions.filter((s) => s.week_start === selectedWeekStart);
  const pending = weekSessions.filter((s) => s.status === "pending_vote");
  const recent = weekSessions.filter((s) => s.status !== "pending_vote");

  const goInvite = () => router.push({ pathname: "/group/[id]/invite", params: { id: id! } } as never);

  const candidates = eligibleNewAdmins(memberList, me?.id);
  const showTransfer = canTransferAdmin(candidates.length, isAdmin);

  const onTransferAdmin = async (member: GroupMemberWithUser) => {
    const name = member.user.first_name || member.user.username || "ce membre";
    const ok = await confirm({
      title: `Confier l'admin à ${name} ?`,
      message: `${name} pourra modifier les règles et gérer le groupe. Tu redeviendras membre simple — action irréversible sans son accord.`,
      confirmLabel: "Confirmer",
      destructive: true,
    });
    if (!ok) return;
    setTransferPending(member.user.id);
    transferAdmin.mutate(member.user.id, {
      onSuccess: (newAdmin) => {
        setTransferPending(null);
        setTransferOpen(false);
        toast(`${newAdmin} est désormais l'admin du groupe.`, "success");
      },
      onError: (e) => {
        setTransferPending(null);
        toast(mapTransferAdminError(e.message), "error");
      },
    });
  };

  const onLeave = async () => {
    setMenuOpen(false);
    const others = memberList.filter((m) => m.user.id !== me?.id).length;
    if (isAdmin && others === 0) {
      toast(mapLeaveError("LAST_MEMBER"), "error");
      return;
    }
    const ok = await confirm({
      title: "Quitter le groupe ?",
      message: isAdmin
        ? `Tu es admin : le rôle sera transféré automatiquement au membre le plus ancien de « ${group.name} ». Ton historique est conservé.`
        : `Tu ne verras plus « ${group.name} » et tu ne pourras plus y déclarer de séances. Ton historique est conservé.`,
      confirmLabel: "Quitter le groupe",
      destructive: true,
    });
    if (!ok) return;
    leaveGroup.mutate(id!, {
      onSuccess: (newAdmin) => {
        toast(
          newAdmin
            ? `Tu as quitté « ${group.name} ». ${newAdmin} devient admin.`
            : `Tu as quitté « ${group.name} ».`,
          "success"
        );
        router.navigate("/groups" as never);
      },
      onError: (e) => toast(mapLeaveError(e.message), "error"),
    });
  };

  return (
    <View className="flex-1">
      <AppBackground />
      <TopFade height={120} />
      <ScreenContainer transparent padded={false} edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center gap-3 px-[18px] pb-2 pt-1">
          <Pressable
            onPress={goBack}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-chip border border-line bg-surface active:opacity-80"
          >
            <ChevronLeft size={20} color={colors.cream} />
          </Pressable>
          <View className="flex-1">
            <Text numberOfLines={1} className="font-display text-[18px] tracking-tight text-cream">
              {group.name}
            </Text>
            <Text className="mt-0.5 font-body text-[11.5px] text-cream-dim">
              {memberList.length} membre{memberList.length > 1 ? "s" : ""}
              {active && left > 0 ? ` · J-${left}` : ""}
            </Text>
          </View>
          <Pressable
            onPress={() => setMenuOpen(true)}
            hitSlop={8}
            accessibilityLabel="Options du groupe"
            className="h-10 w-10 items-center justify-center rounded-chip border border-line bg-surface active:opacity-80"
          >
            <MoreVertical size={20} color={colors.creamDim} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerClassName="gap-4 px-[18px] pt-2"
          contentContainerStyle={{ paddingBottom: 96 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <Reveal delay={0}>
            <Card variant="hero">
              <View className="flex-row items-center justify-between">
                <Badge label={active ? "En cours" : "À venir"} variant={active ? "coral" : "amber"} />
                <View className="items-end">
                  <Text className="font-display text-[19px] text-amber">
                    {active && left > 0 ? `J-${left}` : "—"}
                  </Text>
                  <Text className="mt-0.5 font-body text-[10px] text-cream-dim">
                    fin le {formatDbDate(group.challenge_end)}
                  </Text>
                </View>
              </View>

              <View className="mt-4">
                <Text className="font-body text-[11.5px] text-cream-dim">Cagnotte du groupe</Text>
                {pot !== null && pot !== undefined ? (
                  <CountUp
                    to={pot}
                    suffix=" €"
                    className="mt-1 font-display text-[34px] tracking-tighter text-cream"
                  />
                ) : (
                  <Text className="mt-1 font-display text-[34px] tracking-tighter text-cream">—</Text>
                )}
                <Text className="mt-1 font-body text-[10.5px] text-cream-dim">
                  débloquée à la fin du défi
                </Text>
              </View>

              <View className="mt-4">
                <View className="mb-2 flex-row items-baseline justify-between">
                  <Text className="font-body text-[11.5px] text-cream-dim">
                    Séances du groupe cette semaine
                  </Text>
                  <Text className="font-display text-[14px] text-cream">
                    {groupProg.done}
                    <Text className="text-[12px] text-cream-dim">/{groupProg.target}</Text>
                  </Text>
                </View>
                <ProgressBar ratio={groupProg.target > 0 ? groupProg.done / groupProg.target : 0} />
              </View>

              <View className="mt-4 flex-row items-center justify-between">
                <View className="flex-row">
                  {memberList.slice(0, 4).map((m, i) => (
                    <View
                      key={m.id}
                      style={{
                        marginLeft: i === 0 ? 0 : -9,
                        borderRadius: 17,
                        borderWidth: 2,
                        borderColor: colors.surface,
                      }}
                    >
                      <Avatar
                        uri={m.user.avatar_url}
                        color={m.user.avatar_color}
                        icon={m.user.avatar_icon}
                        name={`${m.user.first_name ?? ""} ${m.user.last_name ?? ""}`.trim()}
                        size={30}
                        index={i}
                      />
                    </View>
                  ))}
                  {memberList.length > 4 ? (
                    <View
                      className="items-center justify-center"
                      style={{
                        width: 30,
                        height: 30,
                        marginLeft: -9,
                        borderRadius: 17,
                        borderWidth: 2,
                        borderColor: colors.surface,
                        backgroundColor: colors.surface2,
                      }}
                    >
                      <Text className="font-display text-[11px] text-cream-dim">
                        +{memberList.length - 4}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {isAdmin ? (
                  <Pressable
                    onPress={goInvite}
                    className="flex-row items-center gap-1.5 rounded-full border border-line-2 bg-surface-2 px-3 py-2 active:opacity-80"
                  >
                    <UserPlus size={15} color={colors.cream} />
                    <Text className="font-body-semibold text-[12.5px] text-cream">Inviter</Text>
                  </Pressable>
                ) : null}
              </View>
            </Card>
          </Reveal>

          {/* Bascule Infos / Séances (soulignement glissant, façon maquette) */}
          <Reveal delay={60}>
            <GroupTabs
              value={view}
              onChange={setView}
              tabs={[
                { value: "infos", label: "Infos" },
                { value: "seances", label: "Séances", count: weekSessions.length },
              ]}
            />
          </Reveal>

          {view === "infos" ? (
            <InfosPanel
              group={group}
              stats={stats}
              blamed={blamed}
              meId={me?.id}
              isAdmin={isAdmin}
            />
          ) : (
            <SeancesPanel
              pending={pending}
              recent={recent}
              meId={me?.id}
              votableCount={(votable?.length ?? 0) + (votableExcuses?.length ?? 0)}
              onVote={() =>
                router.push({ pathname: "/group/[id]/vote", params: { id: id! } } as never)
              }
              weekLabel={weekLabel}
              canPrev={weekOffset < maxOffset}
              canNext={weekOffset > 0}
              onPrev={() => setWeekOffset((o) => Math.min(maxOffset, o + 1))}
              onNext={() => setWeekOffset((o) => Math.max(0, o - 1))}
              excuse={weekOffset === 0 ? (myExcuse ?? null) : null}
            />
          )}
        </ScrollView>

        {/* Footer CTA (la tab bar est fournie par le layout group, juste en dessous) */}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.ink,
            borderTopColor: colors.line,
            borderTopWidth: 1,
            paddingHorizontal: 18,
            paddingTop: 10,
            paddingBottom: 12,
          }}
        >
          <GradientButton
            icon={Plus}
            onPress={() => router.push({ pathname: "/group/[id]/declare", params: { id: id! } } as never)}
          >
            Déclarer une séance
          </GradientButton>
        </View>
      </ScreenContainer>

      {/* Menu ⋮ : actions contextuelles (admin : modifier/inviter ; tous : quitter) */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <Pressable className="flex-1" onPress={() => setMenuOpen(false)} />
          <View
            className="rounded-t-[28px] border-x border-t px-5 pb-8 pt-5"
            style={{ backgroundColor: colors.surface, borderColor: colors.line2 }}
          >
            <View
              className="mb-4 h-1 w-10 self-center rounded-full"
              style={{ backgroundColor: colors.line2 }}
            />
            <Text numberOfLines={1} className="mb-3 font-display text-[17px] tracking-tight text-cream">
              {group.name}
            </Text>

            <View className="gap-2">
              {/* Inviter : accessible à TOUS les membres (popup QR + code + lien). */}
              <MenuItem
                icon={UserPlus}
                label="Inviter au groupe"
                onPress={() => {
                  setMenuOpen(false);
                  setInviteOpen(true);
                }}
              />
              {isAdmin ? (
                <MenuItem
                  icon={Pencil}
                  label="Modifier le groupe"
                  onPress={() => {
                    setMenuOpen(false);
                    router.push({ pathname: "/group/[id]/edit", params: { id: id! } } as never);
                  }}
                />
              ) : null}
              {showTransfer ? (
                <MenuItem
                  icon={Crown}
                  label="Changer d'admin"
                  onPress={() => {
                    setMenuOpen(false);
                    setTransferOpen(true);
                  }}
                />
              ) : null}
              <MenuItem icon={LogOut} label="Quitter le groupe" tone="danger" onPress={onLeave} />
            </View>
          </View>
        </View>
      </Modal>

      <InviteSheet
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        inviteCode={group.invite_code}
        groupName={group.name}
      />

      <AdminTransferSheet
        visible={transferOpen}
        onClose={() => setTransferOpen(false)}
        members={memberList}
        meId={me?.id}
        pendingUserId={transferPending}
        onSelect={onTransferAdmin}
      />
    </View>
  );
}

/* ---------- Menu ⋮ ---------- */

function MenuItem({
  icon: Icon,
  label,
  tone,
  onPress,
}: {
  icon: typeof Pencil;
  label: string;
  tone?: "danger";
  onPress: () => void;
}) {
  const danger = tone === "danger";
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-input border px-4 py-3.5 active:opacity-80"
      style={{
        backgroundColor: danger ? colors.redSoft : colors.surface2,
        borderColor: danger ? "rgba(242,85,74,0.35)" : colors.line,
      }}
    >
      <Icon size={18} color={danger ? colors.red : colors.cream} strokeWidth={2.1} />
      <Text
        className="font-body-semibold text-[14px]"
        style={{ color: danger ? colors.red : colors.cream }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ---------- Infos ---------- */

type Stat = MemberStat<GroupMemberWithUser>;

function SecHead({ title, meta }: { title: string; meta?: string }) {
  return (
    <View className="mt-1 flex-row items-baseline justify-between px-0.5">
      <Text className="font-display text-[16px] tracking-tight text-cream">{title}</Text>
      {meta ? <Text className="font-body text-[12px] text-cream-dim">{meta}</Text> : null}
    </View>
  );
}

function InfosPanel({
  group,
  stats,
  blamed,
  meId,
  isAdmin,
}: {
  group: ReturnType<typeof useGroup>["data"] & {};
  stats: Stat[];
  blamed: { m: GroupMemberWithUser; count: number }[];
  meId: string | undefined;
  isAdmin: boolean;
}) {
  const activities = Array.isArray(group.accepted_activities)
    ? (group.accepted_activities as string[])
    : [];

  return (
    <View className="gap-4">
      {/* Membres (le classement est fusionné ici : barre de progression par membre) */}
      <Reveal delay={0}>
        <SecHead title="Membres" meta="cette semaine" />
        <View className="mt-2">
          <Card>
            {stats.map((st, i) => {
              const full = st.done >= st.target && st.target > 0;
              return (
                <View
                  key={st.member.id}
                  className={`flex-row items-center gap-3 py-3 ${
                    i < stats.length - 1 ? "border-b border-line" : ""
                  }`}
                >
                  <Avatar
                    uri={st.member.user.avatar_url}
                    color={st.member.user.avatar_color}
                    icon={st.member.user.avatar_icon}
                    name={`${st.member.user.first_name ?? ""} ${st.member.user.last_name ?? ""}`.trim()}
                    size={40}
                    index={i}
                  />
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="font-body-bold text-[14px] text-cream">
                        {memberName(st.member, meId)}
                      </Text>
                      {st.member.role === "admin" ? (
                        <Text className="rounded-full bg-coral-soft px-2 py-0.5 font-body-bold text-[9.5px] uppercase tracking-label text-coral">
                          Admin
                        </Text>
                      ) : null}
                    </View>
                    <View className="mt-2 flex-row items-center gap-2.5">
                      <View className="flex-1">
                        <ProgressBar ratio={st.ratio} height={5} />
                      </View>
                      <Text
                        className="font-display text-[11.5px]"
                        style={{ color: full ? colors.mint : colors.creamDim }}
                      >
                        {st.done} séance{st.done > 1 ? "s" : ""}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </Card>
        </View>
      </Reveal>

      {/* Blâmes */}
      {blamed.length > 0 ? (
        <Reveal delay={50}>
          <SecHead title="Blâmes" />
          <View className="mt-2 flex-row flex-wrap gap-2">
            {blamed.map(({ m, count }) => {
              const hot = count >= Math.max(1, group.blame_threshold - 1);
              return (
                <View
                  key={m.id}
                  className="flex-row items-center gap-1.5 rounded-full px-3 py-2"
                  style={{ backgroundColor: hot ? colors.redSoft : "rgba(255,238,221,0.07)" }}
                >
                  <TriangleAlert size={13} color={hot ? colors.red : colors.creamDim} />
                  <Text
                    className="font-body-semibold text-[12px]"
                    style={{ color: hot ? colors.red : colors.creamDim }}
                  >
                    {memberName(m, meId)} · {count}
                  </Text>
                </View>
              );
            })}
          </View>
        </Reveal>
      ) : null}

      {/* Règles — tout en bas */}
      <Reveal delay={100}>
        <SecHead title="Règles du défi" />
        <View className="mt-2">
          <RulesRecap
            challengeStart={group.challenge_start}
            challengeEnd={group.challenge_end}
            penaltyAmount={group.penalty_amount}
            acceptedActivities={activities}
            minDurationMin={group.min_duration_min}
            publicationDeadline={group.publication_deadline}
            voteDeadline={group.vote_deadline}
            blameThreshold={group.blame_threshold}
            maxExcuses={group.max_excuses}
          />
        </View>
      </Reveal>

      {/* Inviter au groupe — admin uniquement, tout en bas de l'onglet Infos */}
      {isAdmin ? (
        <Reveal delay={140}>
          <SecHead title="Inviter au groupe" />
          <View className="mt-2">
            <InviteBlock inviteCode={group.invite_code} groupName={group.name} />
          </View>
        </Reveal>
      ) : null}
    </View>
  );
}

/* ---------- Séances ---------- */

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "mint" | "amber" | "red" | "default" }
> = {
  validated: { label: "Validée", variant: "mint" },
  pending_vote: { label: "À valider", variant: "amber" },
  rejected: { label: "Refusée", variant: "red" },
  expired: { label: "Expirée", variant: "default" },
};

function SessionRow({ session, meId, index }: { session: SessionWithAuthor; meId: string | undefined; index: number }) {
  const isMe = session.author.id === meId;
  const name = isMe ? "Toi" : session.author.first_name || session.author.username || "Membre";
  const badge = STATUS_BADGE[session.status] ?? STATUS_BADGE.expired;
  return (
    <View className="flex-row items-center gap-3 rounded-[15px] border border-line bg-surface p-3">
      <Avatar
        uri={session.author.avatar_url}
        color={session.author.avatar_color}
        icon={session.author.avatar_icon}
        name={`${session.author.first_name ?? ""} ${session.author.last_name ?? ""}`.trim()}
        size={38}
        index={index}
      />
      <View className="flex-1">
        <Text className="font-body-bold text-[13.5px] text-cream">
          {name} · {getActivityLabel(session.activity_type)}
        </Text>
        <Text className="mt-0.5 font-body text-[11px] text-cream-dim">
          {session.duration_min} min · {formatDbDate(session.performed_at)}
        </Text>
      </View>
      <Badge label={badge.label} variant={badge.variant} />
    </View>
  );
}

function WeekNav({
  label,
  canPrev,
  canNext,
  onPrev,
  onNext,
}: {
  label: string;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <View
      className="flex-row items-center justify-between rounded-[14px] border px-1.5 py-1.5"
      style={{ backgroundColor: colors.surface, borderColor: colors.line }}
    >
      <Pressable
        onPress={onPrev}
        disabled={!canPrev}
        hitSlop={6}
        accessibilityLabel="Semaine précédente"
        className="h-8 w-8 items-center justify-center rounded-[10px] active:opacity-80"
        style={{ backgroundColor: canPrev ? colors.surface2 : "transparent" }}
      >
        <ChevronLeft size={17} color={canPrev ? colors.cream : colors.line2} />
      </Pressable>
      <Text className="font-body-semibold text-[12.5px] text-cream">{label}</Text>
      <Pressable
        onPress={onNext}
        disabled={!canNext}
        hitSlop={6}
        accessibilityLabel="Semaine suivante"
        className="h-8 w-8 items-center justify-center rounded-[10px] active:opacity-80"
        style={{ backgroundColor: canNext ? colors.surface2 : "transparent" }}
      >
        <ChevronRight size={17} color={canNext ? colors.cream : colors.line2} />
      </Pressable>
    </View>
  );
}

/** Bandeau d'état de MON excuse de la semaine (en attente / semaine excusée). */
function ExcuseBanner({ excuse }: { excuse: ExcuseRow }) {
  const accepted = excuse.status === "accepted";
  const major = excuse.excuse_type === "major";
  return (
    <View
      className="flex-row items-center gap-3 rounded-[16px] border p-3.5"
      style={{
        backgroundColor: accepted ? colors.mintSoft : colors.amberSoft,
        borderColor: accepted ? "rgba(95,224,168,0.3)" : "rgba(255,178,62,0.3)",
      }}
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-surface">
        {accepted ? (
          <Check size={20} color={colors.mint} strokeWidth={2.6} />
        ) : (
          <HeartPulse size={20} color={colors.amber} />
        )}
      </View>
      <View className="flex-1">
        <Text className="font-display text-[14.5px] tracking-tight text-cream">
          {accepted ? "Semaine excusée" : "Excuse en attente de vote"}
        </Text>
        <Text className="mt-0.5 font-body text-[11.5px] leading-[1.4] text-cream-dim">
          {accepted
            ? major
              ? "Excuse majeure acceptée · semaine annulée, aucune pénalité."
              : "Excuse standard acceptée · objectif réduit de 1 séance."
            : "Le groupe vote actuellement ta demande pour cette semaine."}
        </Text>
      </View>
    </View>
  );
}

function SeancesPanel({
  pending,
  recent,
  meId,
  votableCount,
  onVote,
  weekLabel,
  canPrev,
  canNext,
  onPrev,
  onNext,
  excuse,
}: {
  pending: SessionWithAuthor[];
  recent: SessionWithAuthor[];
  meId: string | undefined;
  votableCount: number;
  onVote: () => void;
  weekLabel: string;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  excuse: ExcuseRow | null;
}) {
  const banner =
    votableCount > 0 ? (
      <Pressable
        onPress={onVote}
        className="flex-row items-center gap-3 rounded-[16px] border p-3.5 active:opacity-80"
        style={{ backgroundColor: colors.coralSoft, borderColor: "rgba(255,106,69,0.4)" }}
      >
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-surface">
          <Vote size={20} color={colors.coral} />
        </View>
        <View className="flex-1">
          <Text className="font-display text-[15px] tracking-tight text-cream">
            {votableCount} à valider
          </Text>
          <Text className="mt-0.5 font-body text-[11.5px] text-cream-dim">
            Séances et excuses · donne ton vote
          </Text>
        </View>
        <ChevronRight size={20} color={colors.coral} />
      </Pressable>
    ) : null;

  const weekNav = (
    <WeekNav label={weekLabel} canPrev={canPrev} canNext={canNext} onPrev={onPrev} onNext={onNext} />
  );

  if (pending.length === 0 && recent.length === 0) {
    return (
      <View className="gap-3">
        {banner}
        {weekNav}
        {excuse ? <ExcuseBanner excuse={excuse} /> : null}
        <View className="mt-6 items-center">
          <Text className="font-body text-[14px] text-cream-dim">
            {canNext
              ? "Aucune séance déclarée cette semaine-là."
              : "Tu n'as pas encore déclaré de séance cette semaine."}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="gap-2.5">
      {banner}
      {weekNav}
      {excuse ? <ExcuseBanner excuse={excuse} /> : null}
      {pending.length > 0 ? (
        <>
          <View className="mt-1 flex-row items-center gap-2 px-0.5">
            <Text className="font-display text-[13px] text-cream-dim">En attente de vote</Text>
            <Text className="rounded-full bg-amber-soft px-2 py-0.5 font-body-bold text-[10.5px] text-amber">
              {pending.length}
            </Text>
          </View>
          {pending.map((s, i) => (
            <Reveal key={s.id} delay={i * 40}>
              <SessionRow session={s} meId={meId} index={i} />
            </Reveal>
          ))}
        </>
      ) : null}

      {recent.length > 0 ? (
        <>
          <Text className="mt-2 px-0.5 font-display text-[13px] text-cream-dim">Récentes</Text>
          {recent.map((s, i) => (
            <Reveal key={s.id} delay={i * 40}>
              <SessionRow session={s} meId={meId} index={i} />
            </Reveal>
          ))}
        </>
      ) : null}
    </View>
  );
}
