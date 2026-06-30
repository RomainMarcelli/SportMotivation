import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Plus,
  TriangleAlert,
  UserPlus,
  Vote,
} from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { AppBackground } from "@/components/ui/AppBackground";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CountUp } from "@/components/ui/CountUp";
import { GradientButton } from "@/components/ui/GradientButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Reveal } from "@/components/ui/Reveal";
import { GroupTabs } from "@/components/groups/GroupTabs";
import { InviteBlock } from "@/components/groups/InviteBlock";
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
import { useVotableExcuses } from "@/features/excuses/queries";
import { useCurrentUser } from "@/lib/auth-store";
import { daysUntil, formatDbDate } from "@/lib/date";
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

  const [view, setView] = useState<"infos" | "seances">("infos");

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
  const pending = mySessions.filter((s) => s.status === "pending_vote");
  const recent = mySessions.filter((s) => s.status !== "pending_vote");

  const goInvite = () => router.push({ pathname: "/group/[id]/invite", params: { id: id! } } as never);

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
          {isAdmin ? (
            <Pressable
              onPress={() => router.push({ pathname: "/group/[id]/edit", params: { id: id! } } as never)}
              hitSlop={8}
              className="h-10 w-10 items-center justify-center rounded-chip border border-line bg-surface active:opacity-80"
            >
              <MoreVertical size={20} color={colors.creamDim} />
            </Pressable>
          ) : null}
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
                { value: "seances", label: "Séances", count: mySessions.length },
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
    </View>
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

function SeancesPanel({
  pending,
  recent,
  meId,
  votableCount,
  onVote,
}: {
  pending: SessionWithAuthor[];
  recent: SessionWithAuthor[];
  meId: string | undefined;
  votableCount: number;
  onVote: () => void;
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

  if (pending.length === 0 && recent.length === 0) {
    return (
      <View className="gap-3">
        {banner}
        <View className="mt-6 items-center">
          <Text className="font-body text-[14px] text-cream-dim">
            Tu n'as pas encore déclaré de séance.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="gap-2.5">
      {banner}
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
