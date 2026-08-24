import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  Coins,
  Info,
  TriangleAlert,
  Wallet,
  XCircle,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { AppBackground } from "@/components/ui/AppBackground";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { CountUp } from "@/components/ui/CountUp";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Toggle } from "@/components/ui/Toggle";
import { colors } from "@/constants/colors";
import {
  cagnotteTotals,
  formatEuro,
  groupHistoryByWeek,
  penaltyCountLabel,
  penaltyTypeLabel,
  unpaidMembers,
  type CagnotteMember,
  type PenaltyHistoryItem,
} from "@/features/cagnotte/cagnotte";
import { useCagnotte, usePotHistory } from "@/features/cagnotte/queries";
import { mapCagnotteError, useRemindUnpaid, useSettleMember } from "@/features/cagnotte/mutations";
import { useGroup, useGroupMembers } from "@/features/groups/queries";
import { useCurrentUser } from "@/lib/auth-store";
import { startOfWeekMonday, toDateOnly } from "@/lib/date";

/** « Toi » pour soi, sinon prénom / pseudo / repli. */
function displayName(firstName: string | null, username: string | null, isMe: boolean): string {
  if (isMe) return "Toi";
  return firstName || username || "Membre";
}

/** Date courte à la française (« 20 juil. ») depuis un ISO. */
function shortDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(iso));
}

/**
 * Cagnotte du défi (maquette `sport-motiv-cagnotte.html`).
 *
 * Lecture pour tous les membres (transparence, comme les blâmes) ; le TRÉSORIER
 * (= l'admin en V1, ou le rôle `treasurer`) a en plus la « vue trésorier » pour
 * cocher les paiements reçus et relancer les retardataires. Cagnotte VIRTUELLE :
 * les membres se règlent entre eux, l'app ne fait que suivre.
 */
export default function CagnotteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const me = useCurrentUser();
  const { toast, confirm } = useFeedback();

  const { data: group } = useGroup(id);
  const { data: members, isLoading } = useCagnotte(id);
  const { data: history } = usePotHistory(id);
  const { data: groupMembers } = useGroupMembers(id);

  const settle = useSettleMember(id!);
  const remind = useRemindUnpaid(id!);

  // Mode « vue trésorier » : bascule les lignes membres en édition (cocher payé).
  const [editing, setEditing] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  // Ligne en cours de bascule (spinner local, évite un double-tap pendant l'appel).
  const [pendingUser, setPendingUser] = useState<string | null>(null);

  // Le rôle vient de la liste des membres (déjà en cache depuis le dashboard).
  const myRole = groupMembers?.find((m) => m.user.id === me?.id)?.role;
  const isTreasurer = myRole === "admin" || myRole === "treasurer";

  const list = members ?? [];
  const totals = useMemo(() => cagnotteTotals(list), [list]);
  const unpaid = useMemo(() => unpaidMembers(list), [list]);
  const paidPct = totals.total > 0 ? Math.round(totals.paidRatio * 100) : 0;

  // Semaine courante (lundi) pour libeller l'historique (« Cette semaine »…).
  const nowWeekStart = toDateOnly(startOfWeekMonday(new Date()));
  const historyGroups = useMemo(
    () => groupHistoryByWeek(history ?? [], nowWeekStart),
    [history, nowWeekStart]
  );
  // Par défaut on montre les 2 semaines les plus récentes ; le reste derrière « Afficher tout ».
  const visibleGroups = showAllHistory ? historyGroups : historyGroups.slice(0, 2);
  const hasOlder = historyGroups.length > 2;

  const onToggleEditing = () => {
    // Réservé au trésorier — la bascule n'est de toute façon montée que pour lui.
    if (!isTreasurer) return;
    setEditing((e) => !e);
  };

  const onSettle = (m: CagnotteMember, paid: boolean) => {
    setPendingUser(m.userId);
    settle.mutate(
      { userId: m.userId, paid },
      {
        onSuccess: () =>
          toast(
            paid ? `${displayName(m.firstName, m.username, m.userId === me?.id)} : réglé.` : "Règlement annulé.",
            "success"
          ),
        onError: (e) => toast(mapCagnotteError(e.message), "error"),
        onSettled: () => setPendingUser(null),
      }
    );
  };

  const onRelance = async () => {
    if (unpaid.length === 0) return;
    const ok = await confirm({
      title: "Relancer les retardataires ?",
      message: `Une notification sera envoyée à ${unpaid.length} membre${
        unpaid.length > 1 ? "s" : ""
      } avec un solde en attente.`,
      confirmLabel: "Relancer",
    });
    if (!ok) return;
    remind.mutate(undefined, {
      onSuccess: (n) =>
        toast(
          n > 0 ? `Relance envoyée à ${n} membre${n > 1 ? "s" : ""}.` : "Personne à relancer.",
          "success"
        ),
      onError: (e) => toast(mapCagnotteError(e.message), "error"),
    });
  };

  return (
    <View className="flex-1">
      <AppBackground />
      <ScreenContainer transparent padded={false} edges={["top"]}>
        {/* Header (maquette : back + titre + contexte défi) */}
        <View className="flex-row items-center gap-3 px-[18px] pb-3 pt-1">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.navigate("/groups" as never))}
            hitSlop={10}
            accessibilityLabel="Retour"
            className="h-10 w-10 items-center justify-center rounded-chip border border-line bg-surface active:opacity-70"
          >
            <ChevronLeft size={22} color={colors.cream} strokeWidth={2.2} />
          </Pressable>
          <View className="flex-1">
            <Text className="font-display text-[20px] tracking-tighter text-cream">Cagnotte</Text>
            {group?.name ? (
              <Text numberOfLines={1} className="mt-0.5 font-body text-[11.5px] text-cream-dim">
                {group.name}
              </Text>
            ) : null}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: isTreasurer ? 40 : 32, gap: 18 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero cagnotte */}
          <Reveal delay={0}>
            <View
              className="overflow-hidden rounded-[22px] border p-[18px]"
              style={{ backgroundColor: colors.surface, borderColor: colors.line2 }}
            >
              <View className="flex-row items-center justify-between">
                <Text className="font-body-bold text-[12px] uppercase tracking-label text-cream-dim">
                  Cagnotte commune
                </Text>
                {isTreasurer ? (
                  <View
                    className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1.5"
                    style={{ backgroundColor: colors.amberSoft }}
                  >
                    <Coins size={13} color={colors.amber} />
                    <Text className="font-body-bold text-[11px] text-amber">Trésorier · toi</Text>
                  </View>
                ) : null}
              </View>

              {Number.isInteger(totals.total) ? (
                <CountUp
                  to={totals.total}
                  suffix=" €"
                  duration={900}
                  className="mt-3.5 font-display text-[47px] tracking-tighter"
                  style={{ color: colors.amber }}
                />
              ) : (
                <Text
                  className="mt-3.5 font-display text-[47px] tracking-tighter"
                  style={{ color: colors.amber }}
                >
                  {formatEuro(totals.total)}
                </Text>
              )}

              <Text className="mt-2 font-body text-[12px] text-cream-dim">
                Cumulée depuis le début du défi · débloquée à la fin
              </Text>

              {/* Barre réglé (menthe) / en attente (ambre) */}
              <View
                className="mt-4 flex-row overflow-hidden"
                style={{ height: 10, borderRadius: 999, backgroundColor: colors.surface2 }}
              >
                {/* Segments en `flex` (ratio) plutôt qu'en `%` : évite l'écueil de
                    typage `DimensionValue` et donne exactement les mêmes proportions.
                    Cagnotte vide (total 0) → les deux à 0, la piste reste neutre. */}
                <View style={{ flex: paidPct, backgroundColor: colors.mint }} />
                <View
                  style={{ flex: totals.total > 0 ? 100 - paidPct : 0, backgroundColor: colors.amber }}
                />
              </View>
              <View className="mt-3 flex-row gap-5">
                <LegendItem color={colors.mint} label="Réglé" value={formatEuro(totals.paid)} />
                <LegendItem color={colors.amber} label="En attente" value={formatEuro(totals.pending)} />
              </View>
            </View>
          </Reveal>

          {/* Toggle « vue trésorier » (trésorier seulement) */}
          {isTreasurer && list.length > 0 ? (
            <Reveal delay={60}>
              <Pressable
                onPress={onToggleEditing}
                className="flex-row items-center gap-3 rounded-[16px] border p-3.5"
                style={{
                  backgroundColor: editing ? colors.amberSoft : colors.surface,
                  borderColor: editing ? "rgba(255,178,62,0.35)" : colors.line,
                }}
              >
                <View
                  className="h-[38px] w-[38px] items-center justify-center rounded-xl"
                  style={{ backgroundColor: editing ? "rgba(255,178,62,0.2)" : colors.surface2 }}
                >
                  <Wallet size={18} color={colors.amber} />
                </View>
                <View className="flex-1">
                  <Text className="font-display text-[14px] tracking-tight text-cream">
                    Vue trésorier
                  </Text>
                  <Text className="mt-0.5 font-body text-[11.5px] text-cream-dim">
                    Coche les paiements reçus entre membres
                  </Text>
                </View>
                <Toggle
                  value={editing}
                  onChange={onToggleEditing}
                  accessibilityLabel="Vue trésorier"
                />
              </Pressable>
            </Reveal>
          ) : null}

          {isLoading ? (
            <View className="mt-8 items-center">
              <ActivityIndicator color={colors.coral} />
            </View>
          ) : list.length === 0 ? (
            /* État vide : aucune pénalité (la cagnotte se remplit à la clôture hebdo). */
            <Reveal delay={80}>
              <View
                className="items-center gap-2 rounded-[18px] border px-5 py-9"
                style={{ backgroundColor: colors.surface, borderColor: colors.line }}
              >
                <View
                  className="mb-1 h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: colors.mintSoft }}
                >
                  <Check size={24} color={colors.mint} strokeWidth={2.4} />
                </View>
                <Text className="text-center font-display text-[15.5px] tracking-tight text-cream">
                  Aucune pénalité pour l'instant
                </Text>
                <Text className="text-center font-body text-[12.5px] leading-[19px] text-cream-dim">
                  La cagnotte se remplit quand des séances sont manquées ou qu'un blâme est atteint.
                  Rien à régler pour le moment.
                </Text>
              </View>
            </Reveal>
          ) : (
            <>
              {/* Détail par membre */}
              <Reveal delay={120}>
                <SectionHead
                  label="Détail par membre"
                  meta={`${list.length} membre${list.length > 1 ? "s" : ""}`}
                />
                <Card>
                  {list.map((m, i) => (
                    <MemberRow
                      key={m.userId}
                      member={m}
                      isMe={m.userId === me?.id}
                      editing={editing}
                      pending={pendingUser === m.userId}
                      last={i === list.length - 1}
                      onSettle={onSettle}
                    />
                  ))}
                </Card>
              </Reveal>

              {/* Historique des pénalités */}
              {historyGroups.length > 0 ? (
                <Reveal delay={180}>
                  <SectionHead label="Historique des pénalités" />
                  <Card>
                    {visibleGroups.map((g) => (
                      <View key={g.weekStart}>
                        <Text className="mb-1 mt-3.5 px-0.5 font-body-bold text-[11px] tracking-label text-cream-dim">
                          {g.label}
                        </Text>
                        {g.items.map((item, i) => (
                          <HistoryRow
                            key={item.id}
                            item={item}
                            isMe={item.userId === me?.id}
                            last={i === g.items.length - 1}
                          />
                        ))}
                      </View>
                    ))}

                    {hasOlder ? (
                      <Pressable
                        onPress={() => setShowAllHistory((v) => !v)}
                        className="mb-2 mt-3 flex-row items-center justify-center gap-2 rounded-[13px] border py-3 active:opacity-80"
                        style={{ backgroundColor: colors.surface2, borderColor: colors.line2 }}
                      >
                        <Text className="font-body-semibold text-[12.5px] text-cream">
                          {showAllHistory ? "Réduire l'historique" : "Afficher tout l'historique"}
                        </Text>
                        <ChevronDown
                          size={16}
                          color={colors.cream}
                          style={{ transform: [{ rotate: showAllHistory ? "180deg" : "0deg" }] }}
                        />
                      </Pressable>
                    ) : null}
                  </Card>
                </Reveal>
              ) : null}
            </>
          )}

          {/* Note : cagnotte virtuelle */}
          <Reveal delay={240}>
            <View
              className="flex-row gap-3 rounded-[14px] border p-3.5"
              style={{ backgroundColor: colors.surface, borderColor: colors.line }}
            >
              <Info size={16} color={colors.creamDim} style={{ marginTop: 1 }} />
              <Text className="flex-1 font-body text-[11.5px] leading-[18px] text-cream-dim">
                Cagnotte <Text className="text-cream">virtuelle</Text> : les membres se règlent entre
                eux (Revolut, Lydia, virement) et le trésorier coche les paiements reçus. Le
                <Text className="text-cream"> déblocage</Text> se fait en fin de défi, pour la sortie
                commune.
              </Text>
            </View>
          </Reveal>
        </ScrollView>

        {/* Footer relance (trésorier seulement) */}
        {isTreasurer && list.length > 0 ? (
          <View
            style={{
              paddingHorizontal: 18,
              paddingTop: 10,
              paddingBottom: 14,
              backgroundColor: colors.ink,
              borderTopColor: colors.line,
              borderTopWidth: 1,
            }}
          >
            <Pressable
              onPress={onRelance}
              disabled={unpaid.length === 0 || remind.isPending}
              className="h-14 flex-row items-center justify-center gap-2.5 rounded-[18px] active:opacity-90"
              style={{
                backgroundColor: unpaid.length === 0 ? colors.surface2 : colors.coral,
                opacity: remind.isPending ? 0.7 : 1,
              }}
            >
              {unpaid.length === 0 ? (
                <>
                  <Check size={18} color={colors.mint} strokeWidth={2.6} />
                  <Text className="font-display text-[15px]" style={{ color: colors.creamDim }}>
                    Tout est réglé
                  </Text>
                </>
              ) : (
                <>
                  <Bell size={17} color={colors.onCoral} strokeWidth={2.4} />
                  <Text className="font-display text-[15px]" style={{ color: colors.onCoral }}>
                    Relancer les retardataires
                  </Text>
                  <View
                    className="min-w-[22px] items-center justify-center rounded-full px-1.5"
                    style={{ height: 22, backgroundColor: "rgba(0,0,0,0.18)" }}
                  >
                    <Text className="font-display text-[12.5px]" style={{ color: colors.onCoral }}>
                      {unpaid.length}
                    </Text>
                  </View>
                </>
              )}
            </Pressable>
          </View>
        ) : null}
      </ScreenContainer>
    </View>
  );
}

/* ---------- sous-composants ---------- */

function LegendItem({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: color }} />
      <Text className="font-body text-[11.5px] text-cream-dim">
        {label} <Text className="font-display text-cream">{value}</Text>
      </Text>
    </View>
  );
}

function SectionHead({ label, meta }: { label: string; meta?: string }) {
  return (
    <View className="mb-2 flex-row items-baseline justify-between px-0.5">
      <Text className="font-body-bold text-[12px] uppercase tracking-label text-cream-dim">
        {label}
      </Text>
      {meta ? <Text className="font-body text-[11px] text-cream-dim">{meta}</Text> : null}
    </View>
  );
}

function MemberRow({
  member,
  isMe,
  editing,
  pending,
  last,
  onSettle,
}: {
  member: CagnotteMember;
  isMe: boolean;
  editing: boolean;
  pending: boolean;
  last: boolean;
  onSettle: (m: CagnotteMember, paid: boolean) => void;
}) {
  const name = displayName(member.firstName, member.username, isMe);
  const isTreasurerRole = member.role === "admin" || member.role === "treasurer";

  return (
    <View
      className={`flex-row items-center gap-3 py-3.5 ${last ? "" : "border-b border-line"}`}
    >
      <Avatar
        uri={member.avatarUrl}
        color={member.avatarColor}
        icon={member.avatarIcon}
        seed={member.userId}
        name={`${member.firstName ?? ""} ${member.lastName ?? ""}`.trim()}
        size={38}
      />
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="font-display text-[14.5px] tracking-tight text-cream">{name}</Text>
          {isMe ? (
            <Text className="rounded-full bg-coral-soft px-2 py-0.5 font-body-bold text-[9px] uppercase tracking-label text-coral">
              Toi
            </Text>
          ) : null}
          {isTreasurerRole ? (
            <Text className="rounded-full bg-amber-soft px-2 py-0.5 font-body-bold text-[9px] uppercase tracking-label text-amber">
              Trésorier
            </Text>
          ) : null}
        </View>
        {member.isPaid ? (
          <View className="mt-1 flex-row items-center gap-1.5">
            <Check size={12} color={colors.mint} strokeWidth={2.8} />
            <Text className="font-body text-[11.5px]" style={{ color: colors.mint }}>
              Réglé
            </Text>
          </View>
        ) : (
          <Text className="mt-1 font-body text-[11.5px] text-cream-dim">
            {penaltyCountLabel(member.penaltyCount)}
          </Text>
        )}
      </View>

      {/* Colonne droite : montant + statut / action trésorier */}
      <View className="items-end gap-2">
        <Text
          className="font-display text-[15px]"
          style={{
            color: member.isPaid ? colors.creamDim : colors.cream,
            textDecorationLine: member.isPaid ? "line-through" : "none",
          }}
        >
          {formatEuro(member.totalAmount)}
        </Text>

        {editing ? (
          pending ? (
            <ActivityIndicator size="small" color={colors.amber} />
          ) : member.isPaid ? (
            <Pressable
              onPress={() => onSettle(member, false)}
              className="rounded-xl border px-3 py-2 active:opacity-80"
              style={{ borderColor: colors.line2 }}
            >
              <Text className="font-body-semibold text-[12px] text-cream-dim">Annuler</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => onSettle(member, true)}
              className="flex-row items-center gap-1.5 rounded-xl px-3 py-2 active:opacity-90"
              style={{ backgroundColor: colors.mint }}
            >
              <Check size={13} color={colors.onMint} strokeWidth={2.8} />
              <Text className="font-body-bold text-[12px]" style={{ color: colors.onMint }}>
                Marquer payé
              </Text>
            </Pressable>
          )
        ) : member.isPaid ? (
          <View
            className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{ backgroundColor: colors.mintSoft }}
          >
            <Check size={12} color={colors.mint} strokeWidth={2.8} />
            <Text className="font-body-bold text-[11px]" style={{ color: colors.mint }}>
              Réglé
            </Text>
          </View>
        ) : (
          <View
            className="rounded-full px-2.5 py-1"
            style={{ backgroundColor: colors.amberSoft }}
          >
            <Text className="font-body-bold text-[11px]" style={{ color: colors.amber }}>
              À régler
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function HistoryRow({
  item,
  isMe,
  last,
}: {
  item: PenaltyHistoryItem;
  isMe: boolean;
  last: boolean;
}) {
  const isBlame = item.penaltyType === "blame_threshold";
  const name = displayName(item.firstName, item.username, isMe);
  return (
    <View className={`flex-row items-center gap-3 py-3 ${last ? "" : "border-b border-line"}`}>
      <View
        className="h-[34px] w-[34px] items-center justify-center rounded-[10px]"
        style={{ backgroundColor: isBlame ? colors.amberSoft : colors.coralSoft }}
      >
        {isBlame ? (
          <TriangleAlert size={16} color={colors.amber} />
        ) : (
          <XCircle size={16} color={colors.coral} />
        )}
      </View>
      <View className="flex-1">
        <Text className="font-body-semibold text-[13px] text-cream">
          {name} · {penaltyTypeLabel(item.penaltyType)}
        </Text>
        <Text className="mt-0.5 font-body text-[11px] text-cream-dim">{shortDate(item.createdAt)}</Text>
      </View>
      <Text className="font-display text-[14px]" style={{ color: colors.amber }}>
        +{formatEuro(item.amount)}
      </Text>
    </View>
  );
}
