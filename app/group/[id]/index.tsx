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
  PauseCircle,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  Trophy,
  UserPlus,
  Users,
  Vote,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
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
import { GroupInviteSheet } from "@/components/groups/GroupInviteSheet";
import { SessionDetailSheet } from "@/components/sessions/SessionDetailSheet";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { TopFade } from "@/components/ui/TopFade";
import { getActivityLabel } from "@/constants/activities";
import { colors } from "@/constants/colors";
import { challengePhase, challengePhaseLabel } from "@/features/groups/challenge-phase";
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
import { useGroupSuspensions } from "@/features/suspensions/queries";
import { isSuspendedOn } from "@/features/suspensions/suspension";
import { useMyWeekExcuse } from "@/features/excuses/queries";
import { mapLeaveError, useLeaveGroup } from "@/features/groups/leave";
import { useDeleteGroup } from "@/features/groups/penalty-mutations";
import { canTransferAdmin, eligibleNewAdmins, mapTransferAdminError } from "@/features/groups/admin-transfer";
import { useTransferAdmin } from "@/features/groups/transfer-mutations";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { useCurrentUser } from "@/lib/auth-store";
import { daysUntil, formatDbDate, startOfWeekMonday, toDateOnly } from "@/lib/date";
import { formatDuration } from "@/lib/duration";
import type { Database } from "@/types/database.types";

type ExcuseRow = Database["public"]["Tables"]["excuses"]["Row"];
import { groupWeeklyProgress, memberStats, type MemberStat } from "@/lib/group-stats";

function memberName(m: GroupMemberWithUser, meId: string | undefined): string {
  if (m.user.id === meId) return "Toi";
  return m.user.first_name || m.user.username || "Membre";
}

export default function GroupDashboardScreen() {
  // `solo` : ouvert automatiquement parce que c'est le SEUL défi du joueur.
  // Dans ce cas l'écran remplace l'onglet Groupes — une flèche de retour y
  // renverrait, et l'onglet rouvrirait aussitôt le défi.
  const { id, solo, tab, openSession } = useLocalSearchParams<{
    id: string;
    solo?: string;
    tab?: string;
    /** Id d'une séance à rouvrir directement (depuis une notif de refus). */
    openSession?: string;
  }>();
  const isSolo = solo === "1";
  const router = useRouter();
  const me = useCurrentUser();

  const { data: group, isLoading, error, refetch, isRefetching } = useGroup(id);
  const { data: members } = useGroupMembers(id);
  const { data: sessions } = useGroupSessions(id);
  const { data: pot } = usePot(id);
  const { data: blames } = useUnsettledBlames(id);
  const { data: suspensions } = useGroupSuspensions(id);
  const { data: votable } = useVotableSessions(id, me?.id);
  const { data: myExcuse } = useMyWeekExcuse(id);
  const leaveGroup = useLeaveGroup();
  const deleteGroup = useDeleteGroup(id!);
  const transferAdmin = useTransferAdmin(id);
  const { confirm, toast } = useFeedback();

  // `tab=seances` (depuis « Voir tout » de l'accueil) ouvre directement l'onglet Séances ;
  // `tab=a_voter` (depuis la section « À valider » de l'accueil) ouvre l'onglet des votes.
  const [view, setView] = useState<"infos" | "seances" | "a_voter">(
    tab === "seances" ? "seances" : tab === "a_voter" ? "a_voter" : "infos"
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  /** Séance ouverte en fiche détaillée (lecture seule) depuis l'onglet Séances. */
  const [openedSession, setOpenedSession] = useState<SessionWithAuthor | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferPending, setTransferPending] = useState<string | null>(null);
  // Filtre de l'onglet Séances : 0 = semaine en cours, 1 = semaine précédente, etc.
  const [weekOffset, setWeekOffset] = useState(0);

  // Notif de refus (param `openSession`) → on rouvre la fiche de LA séance visée dès
  // que le feed du groupe est chargé. Le ref garde-fou évite de la faire resurgir
  // après qu'on l'ait fermée (le param reste dans l'URL).
  const openedFromParam = useRef(false);
  useEffect(() => {
    if (!openSession || openedFromParam.current) return;
    const found = (sessions ?? []).find((s) => s.id === openSession);
    if (found) {
      setOpenedSession(found);
      openedFromParam.current = true;
    }
  }, [openSession, sessions]);

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
  // Seul MEMBRE du groupe (moi et personne d'autre) : « quitter » = dissoudre, donc on
  // propose « Supprimer le groupe » à la place. (À ne pas confondre avec `isSolo` plus
  // haut = ce défi est le seul du joueur, un flag de navigation.) Faux tant que les
  // membres ne sont pas chargés → jamais de « Supprimer » par erreur.
  const isOnlyMember = memberList.length === 1 && memberList.some((m) => m.user.id === me?.id);
  // Objectif hebdo et pénalité sont réglés PAR MEMBRE : le récap des règles doit
  // montrer les miens, pas les valeurs par défaut du groupe.
  const myMembership = memberList.find((m) => m.user.id === me?.id);
  const left = daysUntil(group.challenge_end, now);
  // Phase dérivée des dates (le défi est actif dès sa création ; ce sont les dates qui
  // disent s'il est à venir / en cours / terminé — cf. `challenge-phase.ts`).
  const phase = challengePhase(group.status, group.challenge_start, group.challenge_end, now);
  const isActive = phase === "active";
  const isUpcoming = phase === "upcoming";
  // Défi terminé → débloque l'accès au bilan de fin de défi (podium + cagnotte à débloquer).
  const isOver = phase === "ended";
  const goFinDefi = () =>
    router.push({ pathname: "/group/[id]/fin-defi", params: { id: id! } } as never);
  const goVote = () =>
    router.push({ pathname: "/group/[id]/vote", params: { id: id! } } as never);

  // Onglet « À voter » = séances des AUTRES en attente de mon vote. Il n'apparaît
  // que s'il y en a ; s'il disparaît alors qu'on y était, on retombe sur « Séances ».
  const votableList = votable ?? [];
  const hasVotable = votableList.length > 0;
  const activeView = view === "a_voter" && !hasVotable ? "seances" : view;

  const stats = memberStats(memberList, sessionList, now);
  const groupProg = groupWeeklyProgress(memberList, sessionList, now);

  // Membres actuellement suspendus (badge « Suspendu » sur la liste des membres).
  const todayISO = toDateOnly(now);
  const suspendedIds = new Set(
    (suspensions ?? []).filter((s) => isSuspendedOn(s, todayISO)).map((s) => s.userId)
  );

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

  // Solo → supprimer le groupe (RPC delete_group) plutôt que le quitter : sans autre
  // membre, un départ le laisserait vide, autant l'effacer proprement.
  const onDelete = async () => {
    setMenuOpen(false);
    const ok = await confirm({
      title: "Supprimer le groupe ?",
      message: `Tu es seul dans « ${group.name} ». Le quitter revient à le supprimer : toutes ses données (séances, cagnotte) seront effacées. Action irréversible.`,
      confirmLabel: "Supprimer le groupe",
      destructive: true,
    });
    if (!ok) return;
    deleteGroup.mutate(undefined, {
      onSuccess: () => {
        toast(`« ${group.name} » supprimé.`, "success");
        router.navigate("/groups" as never);
      },
      onError: (e) => toast(e.message, "error"),
    });
  };

  return (
    <View className="flex-1">
      <AppBackground />
      <TopFade height={120} />
      <ScreenContainer transparent padded={false} edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center gap-3 px-[18px] pb-2 pt-1">
          {!isSolo ? (
            <Pressable
              onPress={goBack}
              hitSlop={8}
              className="h-10 w-10 items-center justify-center rounded-chip border border-line bg-surface active:opacity-80"
            >
              <ChevronLeft size={20} color={colors.cream} />
            </Pressable>
          ) : null}
          <View className="flex-1">
            <Text numberOfLines={1} className="font-display text-[18px] tracking-tight text-cream">
              {group.name}
            </Text>
            <Text className="mt-0.5 font-body text-[11.5px] text-cream-dim">
              {memberList.length} membre{memberList.length > 1 ? "s" : ""}
              {isActive && left > 0 ? ` · J-${left}` : ""}
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
          {/* Défi terminé : bannière d'accès au bilan (podium + déblocage cagnotte). */}
          {isOver ? (
            <Reveal delay={0}>
              <Pressable
                onPress={goFinDefi}
                accessibilityLabel="Voir le bilan du défi"
                className="flex-row items-center gap-3 rounded-[18px] border p-3.5 active:opacity-90"
                style={{ backgroundColor: colors.amberSoft, borderColor: "rgba(255,178,62,0.35)" }}
              >
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-surface">
                  <Trophy size={20} color={colors.amber} strokeWidth={2.1} />
                </View>
                <View className="flex-1">
                  <Text className="font-display text-[15px] tracking-tight text-cream">
                    Défi terminé
                  </Text>
                  <Text className="mt-0.5 font-body text-[11.5px] text-cream-dim">
                    Classement final et cagnotte à débloquer
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.amber} />
              </Pressable>
            </Reveal>
          ) : null}

          {/* Hero */}
          <Reveal delay={isOver ? 60 : 0}>
            <Card variant="hero">
              <View className="flex-row items-center justify-between">
                <Badge
                  label={challengePhaseLabel(phase)}
                  variant={isActive ? "coral" : "amber"}
                />
                <View className="items-end">
                  <Text className="font-display text-[19px] text-amber">
                    {isOver
                      ? "Terminé"
                      : isUpcoming
                        ? `J-${daysUntil(group.challenge_start, now)}`
                        : `J-${Math.max(0, left)}`}
                  </Text>
                  <Text className="mt-0.5 font-body text-[10px] text-cream-dim">
                    {isUpcoming
                      ? `début le ${formatDbDate(group.challenge_start)}`
                      : `fin le ${formatDbDate(group.challenge_end)}`}
                  </Text>
                </View>
              </View>

              {/* Bloc cagnotte cliquable → écran Cagnotte (détail par membre, trésorier). */}
              <Pressable
                onPress={() =>
                  router.push({ pathname: "/group/[id]/cagnotte", params: { id: id! } } as never)
                }
                accessibilityLabel="Voir la cagnotte"
                className="mt-4 active:opacity-80"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="font-body text-[11.5px] text-cream-dim">Cagnotte du groupe</Text>
                  <View className="flex-row items-center gap-0.5">
                    <Text className="font-body-semibold text-[11px] text-amber">Détail</Text>
                    <ChevronRight size={15} color={colors.amber} />
                  </View>
                </View>
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
              </Pressable>

              {/* Suivi hebdo : uniquement tant que le défi n'est pas terminé (retour
                  Romain : une fois fini, plus de progression de la semaine en cours). */}
              {!isOver ? (
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
              ) : null}

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
                        seed={m.user.id}
                        name={`${m.user.first_name ?? ""} ${m.user.last_name ?? ""}`.trim()}
                        size={30}
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
                <Pressable
                  onPress={() => setInviteOpen(true)}
                  className="flex-row items-center gap-1.5 rounded-full border border-line-2 bg-surface-2 px-3 py-2 active:opacity-80"
                >
                  <UserPlus size={15} color={colors.cream} />
                  <Text className="font-body-semibold text-[12.5px] text-cream">Inviter</Text>
                </Pressable>
              </View>
            </Card>
          </Reveal>

          {/* Bascule Infos / Séances (soulignement glissant, façon maquette) */}
          <Reveal delay={60}>
            <GroupTabs
              value={activeView}
              onChange={setView}
              tabs={[
                { value: "infos", label: "Infos" },
                { value: "seances", label: "Séances", count: weekSessions.length },
                ...(hasVotable
                  ? [{ value: "a_voter" as const, label: "À voter", count: votableList.length }]
                  : []),
              ]}
            />
          </Reveal>

          {activeView === "infos" ? (
            <InfosPanel
              group={group}
              stats={stats}
              blamed={blamed}
              suspendedIds={suspendedIds}
              meId={me?.id}
              me={myMembership}
              onOpenInvite={() => setInviteOpen(true)}
            />
          ) : activeView === "a_voter" ? (
            <AVoterPanel
              votable={votableList.map((v) => v.session)}
              meId={me?.id}
              onOpenSession={setOpenedSession}
              onVote={goVote}
            />
          ) : (
            <SeancesPanel
              pending={pending}
              recent={recent}
              meId={me?.id}
              onOpenSession={setOpenedSession}
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
          {isOver ? (
            <GradientButton icon={Trophy} onPress={goFinDefi}>
              Voir le bilan du défi
            </GradientButton>
          ) : (
            <GradientButton
              icon={Plus}
              onPress={() => router.push({ pathname: "/group/[id]/declare", params: { id: id! } } as never)}
            >
              Déclarer une séance
            </GradientButton>
          )}
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
              {/* Suspensions : l'admin gère / suspend, un joueur y fait sa demande. */}
              <MenuItem
                icon={PauseCircle}
                label={isAdmin ? "Suspensions" : "Demander une suspension"}
                onPress={() => {
                  setMenuOpen(false);
                  router.push({ pathname: "/group/[id]/suspensions", params: { id: id! } } as never);
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
              <MenuItem
                icon={isOnlyMember ? Trash2 : LogOut}
                label={isOnlyMember ? "Supprimer le groupe" : "Quitter le groupe"}
                tone="danger"
                onPress={isOnlyMember ? onDelete : onLeave}
              />
            </View>

            {/* Un joueur qui n'a qu'un défi arrive ici directement : sans ces
                deux entrées, il n'aurait plus aucun moyen d'en créer ou d'en
                rejoindre un autre. */}
            <View className="mt-4 border-t pt-4" style={{ borderColor: colors.line }}>
              <Text className="mb-2.5 px-0.5 font-body-bold text-[10.5px] tracking-eyebrow text-cream-dim">
                UN AUTRE DÉFI
              </Text>
              <View className="gap-2">
                <MenuItem
                  icon={Plus}
                  label="Créer un défi"
                  onPress={() => {
                    setMenuOpen(false);
                    router.push("/group/create" as never);
                  }}
                />
                <MenuItem
                  icon={Users}
                  label="Rejoindre un défi"
                  onPress={() => {
                    setMenuOpen(false);
                    router.push("/group/join" as never);
                  }}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <GroupInviteSheet
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        groupId={group.id}
        groupName={group.name}
        inviteCode={group.invite_code}
        memberIds={new Set(memberList.map((m) => m.user.id))}
        isAdmin={isAdmin}
      />

      <SessionDetailSheet
        session={openedSession}
        onClose={() => setOpenedSession(null)}
        meId={me?.id}
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
  suspendedIds,
  meId,
  me,
  onOpenInvite,
}: {
  group: ReturnType<typeof useGroup>["data"] & {};
  stats: Stat[];
  blamed: { m: GroupMemberWithUser; count: number }[];
  /** Ids des membres actuellement suspendus (badge). */
  suspendedIds: Set<string>;
  meId: string | undefined;
  /** Mon adhésion : objectif et pénalité sont RÉGLÉS PAR MEMBRE. */
  me: GroupMemberWithUser | undefined;
  onOpenInvite: () => void;
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
                    seed={st.member.user.id}
                    name={`${st.member.user.first_name ?? ""} ${st.member.user.last_name ?? ""}`.trim()}
                    size={40}
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
                      {suspendedIds.has(st.member.user.id) ? (
                        <Text
                          className="rounded-full px-2 py-0.5 font-body-bold text-[9.5px] uppercase tracking-label"
                          style={{ backgroundColor: colors.amberSoft, color: colors.amber }}
                        >
                          Suspendu
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
            weeklyTarget={me?.weeklyTarget}
            penaltyAmount={me?.penaltyAmount ?? group.penalty_amount}
            acceptedActivities={activities}
            minDurationMin={group.min_duration_min}
            publicationDeadline={group.publication_deadline}
            voteDeadline={group.vote_deadline}
            blameThreshold={group.blame_threshold}
            maxExcuses={group.max_excuses}
            maxSessionsPerDay={group.max_sessions_per_day}
          />
        </View>
      </Reveal>

      {/* Inviter au groupe — un accès qui rouvre la même popup que le bouton du
          haut. Tout le détail (recherche par pseudo, QR, code, lien, suivi) vit
          désormais dans ce panneau, pas en bas de la page. */}
      <Reveal delay={140}>
        <SecHead title="Inviter au groupe" />
        <Pressable
          onPress={onOpenInvite}
          className="mt-2 flex-row items-center gap-3 rounded-[14px] border p-3.5 active:opacity-80"
          style={{ backgroundColor: colors.surface, borderColor: colors.line }}
        >
          <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-coral-soft">
            <UserPlus size={17} color={colors.coral} />
          </View>
          <View className="flex-1">
            <Text className="font-body-semibold text-[13.5px] text-cream">
              Chercher un joueur, partager le code
            </Text>
            <Text className="mt-0.5 font-body text-[11.5px] text-cream-dim">
              Par pseudo, QR code ou lien
            </Text>
          </View>
          <ChevronRight size={17} color={colors.creamDim} />
        </Pressable>
      </Reveal>
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

function SessionRow({
  session,
  meId,
  index,
  onPress,
}: {
  session: SessionWithAuthor;
  meId: string | undefined;
  index: number;
  onPress: () => void;
}) {
  const isMe = session.author.id === meId;
  const name = isMe ? "Toi" : session.author.first_name || session.author.username || "Membre";
  const badge = STATUS_BADGE[session.status] ?? STATUS_BADGE.expired;
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`Voir la séance ${getActivityLabel(session.activity_type)}`}
      className="flex-row items-center gap-3 rounded-[15px] border border-line bg-surface p-3 active:opacity-80"
    >
      <Avatar
        uri={session.author.avatar_url}
        color={session.author.avatar_color}
        icon={session.author.avatar_icon}
        seed={session.author.id}
        name={`${session.author.first_name ?? ""} ${session.author.last_name ?? ""}`.trim()}
        size={38}
      />
      <View className="flex-1">
        <Text className="font-body-bold text-[13.5px] text-cream">
          {name} · {getActivityLabel(session.activity_type)}
        </Text>
        <Text className="mt-0.5 font-body text-[11px] text-cream-dim">
          {formatDuration(session.duration_min)} · {formatDbDate(session.performed_at)}
        </Text>
      </View>
      {/* Le Badge porte `alignSelf: flex-start` (pour ne pas s'étirer en colonne) ;
          l'envelopper le recentre verticalement face à l'avatar et à la flèche. */}
      <View>
        <Badge label={badge.label} variant={badge.variant} />
      </View>
      <ChevronRight size={16} color={colors.creamDim} />
    </Pressable>
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
  onOpenSession,
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
  onOpenSession: (session: SessionWithAuthor) => void;
  weekLabel: string;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  excuse: ExcuseRow | null;
}) {
  // Le bandeau « à valider » a été retiré d'ici : l'onglet dédié « À voter » est le
  // seul point d'entrée du vote (évite le doublon dans l'onglet Séances).
  const weekNav = (
    <WeekNav label={weekLabel} canPrev={canPrev} canNext={canNext} onPrev={onPrev} onNext={onNext} />
  );

  if (pending.length === 0 && recent.length === 0) {
    return (
      <View className="gap-3">
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
              <SessionRow session={s} meId={meId} index={i} onPress={() => onOpenSession(s)} />
            </Reveal>
          ))}
        </>
      ) : null}

      {recent.length > 0 ? (
        <>
          <Text className="mt-2 px-0.5 font-display text-[13px] text-cream-dim">Récentes</Text>
          {recent.map((s, i) => (
            <Reveal key={s.id} delay={i * 40}>
              <SessionRow session={s} meId={meId} index={i} onPress={() => onOpenSession(s)} />
            </Reveal>
          ))}
        </>
      ) : null}
    </View>
  );
}

/**
 * Onglet « À voter » : les séances des AUTRES membres en attente de mon vote.
 * N'est monté que quand il y en a (cf. `hasVotable`). Le bandeau ouvre le deck de
 * vote (swipe) ; taper une ligne ouvre la fiche (qui porte aussi un bouton « Voter »).
 */
function AVoterPanel({
  votable,
  meId,
  onOpenSession,
  onVote,
}: {
  votable: SessionWithAuthor[];
  meId: string | undefined;
  onOpenSession: (session: SessionWithAuthor) => void;
  onVote: () => void;
}) {
  return (
    <View className="gap-2.5">
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
            {votable.length} séance{votable.length > 1 ? "s" : ""} à valider
          </Text>
          <Text className="mt-0.5 font-body text-[11.5px] text-cream-dim">
            Les séances des autres · donne ton vote
          </Text>
        </View>
        <ChevronRight size={20} color={colors.coral} />
      </Pressable>

      {votable.map((s, i) => (
        <Reveal key={s.id} delay={i * 40}>
          <SessionRow session={s} meId={meId} index={i} onPress={() => onOpenSession(s)} />
        </Reveal>
      ))}
    </View>
  );
}
