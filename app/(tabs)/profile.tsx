import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Activity,
  Bell,
  ChevronRight,
  Flame,
  LogOut,
  Moon,
  Pencil,
  Settings,
  Sun,
  SunMoon,
  Target,
  Trash2,
} from "lucide-react-native";
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from "react-native";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { DevAccountSwitcher } from "@/components/profile/DevAccountSwitcher";
import { Avatar } from "@/components/ui/Avatar";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { colors, gradients } from "@/constants/colors";
import { useDeleteAccount } from "@/features/auth/account";
import { displayName } from "@/features/auth/avatar";
import { useSignOut } from "@/features/auth/mutations";
import {
  challengeCount,
  euros,
  groupTile,
  handle,
  memberSince,
} from "@/features/profile/format";
import { useProfileGroups, useProfileStats } from "@/features/profile/queries";
import { useProfile } from "@/hooks/useProfile";
import { useThemeStore, type ThemePref } from "@/lib/theme-store";

const THEME_OPTIONS: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
  { value: "system", label: "Auto", icon: SunMoon },
];

function SectionHead({ title, meta }: { title: string; meta?: string }) {
  return (
    <View className="mb-1 mt-4 flex-row items-baseline justify-between px-0.5">
      <Text className="font-display text-[16px] tracking-tight text-cream">{title}</Text>
      {meta ? <Text className="font-body text-[12px] text-cream-dim">{meta}</Text> : null}
    </View>
  );
}

function StatCard({
  icon: Icon,
  tint,
  soft,
  value,
  caption,
}: {
  icon: typeof Activity;
  tint: string;
  soft: string;
  value: string;
  caption: string;
}) {
  return (
    <View
      className="flex-1 rounded-card border p-3.5"
      style={{ backgroundColor: colors.surface, borderColor: colors.line }}
    >
      <View
        className="mb-2.5 h-8 w-8 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: soft }}
      >
        <Icon size={18} color={tint} strokeWidth={2.2} />
      </View>
      <Text className="font-display text-[24px] leading-[26px] tracking-tighter text-cream">
        {value}
      </Text>
      <Text className="mt-1 font-body text-[11.5px] text-cream-dim">{caption}</Text>
    </View>
  );
}

function SettingRow({
  icon: Icon,
  label,
  right,
  onPress,
  danger,
  last,
}: {
  icon: typeof Activity;
  label: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className={`flex-row items-center gap-3 p-3.5 ${onPress ? "active:opacity-70" : ""}`}
      style={{
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.line,
      }}
    >
      <View
        className="h-[34px] w-[34px] items-center justify-center rounded-[10px]"
        style={{ backgroundColor: danger ? colors.coralSoft : colors.surface2 }}
      >
        <Icon size={18} color={danger ? colors.coral : colors.creamDim} strokeWidth={2} />
      </View>
      <Text
        className="flex-1 font-body-semibold text-[14px]"
        style={{ color: danger ? colors.coral : colors.cream }}
      >
        {label}
      </Text>
      {right ?? (onPress ? <ChevronRight size={18} color={colors.creamDim} /> : null)}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const { data: stats } = useProfileStats();
  const { data: groups = [] } = useProfileGroups();
  const signOut = useSignOut();
  const deleteAccount = useDeleteAccount();
  const { alert, confirm, toast } = useFeedback();
  const { pref, setPref } = useThemeStore();

  const onDelete = async () => {
    const ok = await confirm({
      title: "Supprimer mon compte",
      message:
        "Cette action est irréversible. Tes séances, tes excuses et tes groupes seront effacés, " +
        "et tu ne pourras plus te connecter avec cette adresse.",
      confirmLabel: "Supprimer",
      destructive: true,
    });
    if (!ok) return;

    deleteAccount.mutate(undefined, {
      onSuccess: (mode) => {
        // La popup vit dans le FeedbackProvider, monté AU-DESSUS de la pile : elle
        // reste visible alors même que la racine bascule vers l'écran de connexion.
        alert({
          title: "Compte supprimé",
          tone: "success",
          message:
            mode === "deleted"
              ? "Ton compte et toutes tes données ont été supprimés. À bientôt !"
              : "Ton compte a été fermé. Comme de l'argent est engagé dans une cagnotte, " +
                "ton historique reste anonymisé pour ne pas fausser les comptes du groupe.",
          confirmLabel: "Fermer",
        });
      },
      onError: (e) => toast(e.message, "error"),
    });
  };

  const onSignOut = async () => {
    const ok = await confirm({
      title: "Déconnexion",
      message: "Tu veux vraiment te déconnecter ?",
      confirmLabel: "Me déconnecter",
      destructive: true,
    });
    if (ok) signOut.mutate();
  };

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator color={colors.coral} />
      </ScreenContainer>
    );
  }

  const name = displayName(profile ?? {}) || "Mon profil";
  const at = handle(profile?.username);
  const since = memberSince(profile?.created_at);

  return (
    <ScreenContainer padded={false} edges={["top"]}>
      <ScrollView
        contentContainerClassName="gap-2 px-[18px] pb-10 pt-2"
        showsVerticalScrollIndicator={false}
      >
        {/* Barre de tête */}
        <Reveal delay={20}>
          <View className="flex-row items-center justify-between">
            <Text className="font-display text-[22px] tracking-tighter text-cream">Profil</Text>
            <Pressable
              onPress={() => router.push("/settings" as never)}
              hitSlop={8}
              accessibilityLabel="Paramètres"
              className="h-10 w-10 items-center justify-center rounded-chip border active:opacity-80"
              style={{ backgroundColor: colors.surface, borderColor: colors.line }}
            >
              <Settings size={20} color={colors.creamDim} />
            </Pressable>
          </View>
        </Reveal>

        {/* Entête profil */}
        <Reveal delay={60}>
          <View className="items-center pb-0.5 pt-1.5">
            <LinearGradient
              colors={gradients.brand.colors}
              locations={gradients.brand.locations}
              start={gradients.brand.start}
              end={gradients.brand.end}
              style={{ padding: 3, borderRadius: 999 }}
            >
              <View
                className="items-center justify-center rounded-full"
                style={{ backgroundColor: colors.surface, padding: 0 }}
              >
                <Avatar
                  uri={profile?.avatar_url}
                  color={profile?.avatar_color}
                  icon={profile?.avatar_icon}
                  name={name}
                  size={80}
                />
              </View>
            </LinearGradient>

            <Text className="mt-3 font-display text-[23px] tracking-tighter text-cream">
              {name}
            </Text>
            {at ? (
              <Text className="mt-0.5 font-body text-[13px] text-cream-dim">{at}</Text>
            ) : null}
            {since ? (
              <Text className="mt-2 font-body text-[11px] text-cream-dim opacity-80">{since}</Text>
            ) : null}

            <Pressable
              onPress={() => router.push("/profile-edit" as never)}
              className="mt-4 flex-row items-center gap-2 rounded-full border px-4 py-2.5 active:opacity-80"
              style={{ backgroundColor: colors.surface, borderColor: colors.line2 }}
            >
              <Pencil size={15} color={colors.cream} strokeWidth={2} />
              <Text className="font-body-semibold text-[13px] text-cream">
                Modifier le profil
              </Text>
            </Pressable>
          </View>
        </Reveal>

        {/* Stats */}
        <SectionHead title="Mes stats" meta="depuis le début" />
        <Reveal delay={140}>
          <View className="gap-2.5">
            <View className="flex-row gap-2.5">
              <StatCard
                icon={Activity}
                tint={colors.coral}
                soft={colors.coralSoft}
                value={String(stats?.sessionsDone ?? 0)}
                caption="séances validées"
              />
              <StatCard
                icon={Flame}
                tint={colors.amber}
                soft={colors.amberSoft}
                value={`${stats?.streakWeeks ?? 0} sem.`}
                caption="série en cours"
              />
            </View>
            <View className="flex-row gap-2.5">
              <StatCard
                icon={Target}
                tint={colors.mint}
                soft={colors.mintSoft}
                value={`${stats?.targetRate ?? 0} %`}
                caption="objectifs atteints"
              />
              <StatCard
                icon={Trash2}
                tint={colors.coral}
                soft={colors.coralSoft}
                value={euros(stats?.penaltiesPaid)}
                caption="versés en pénalités"
              />
            </View>
          </View>
        </Reveal>

        {/* Mes groupes */}
        <SectionHead title="Mes groupes" meta={challengeCount(groups.length)} />
        <Reveal delay={200}>
          <View className="gap-2.5">
            {groups.length === 0 ? (
              <View
                className="rounded-card border p-4"
                style={{ backgroundColor: colors.surface, borderColor: colors.line }}
              >
                <Text className="font-body text-[13px] text-cream-dim">
                  Tu ne fais partie d'aucun groupe pour l'instant.
                </Text>
              </View>
            ) : null}

            {groups.map((group) => {
              const isAdmin = group.role === "admin";
              return (
                <Pressable
                  key={group.groupId}
                  onPress={() => router.push(`/group/${group.groupId}` as never)}
                  className="rounded-card border p-3.5 active:opacity-80"
                  style={{ backgroundColor: colors.surface, borderColor: colors.line }}
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className="h-[42px] w-[42px] items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: isAdmin ? colors.amberSoft : colors.mintSoft,
                      }}
                    >
                      <Text
                        className="font-display text-[17px]"
                        style={{ color: isAdmin ? colors.amber : colors.mint }}
                      >
                        {groupTile(group.name)}
                      </Text>
                    </View>
                    <Text
                      numberOfLines={1}
                      className="flex-1 font-display text-[15px] tracking-tight text-cream"
                    >
                      {group.name}
                    </Text>
                    <View
                      className="rounded-full px-2.5 py-1"
                      style={{
                        backgroundColor: isAdmin ? colors.coralSoft : "rgba(255,238,221,0.07)",
                      }}
                    >
                      <Text
                        className="font-body-bold text-[10px] tracking-eyebrow"
                        style={{ color: isAdmin ? colors.coral : colors.creamDim }}
                      >
                        {isAdmin ? "ADMIN" : "MEMBRE"}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-3.5 flex-row gap-2">
                    {[
                      { value: `${group.weeklyTarget}/sem`, label: "objectif", accent: false },
                      { value: euros(group.penaltyAmount), label: "pénalité", accent: false },
                      { value: euros(group.potTotal), label: "cagnotte", accent: true },
                    ].map((cell) => (
                      <View
                        key={cell.label}
                        className="flex-1 items-center rounded-xl py-2.5"
                        style={{ backgroundColor: "rgba(255,238,221,0.04)" }}
                      >
                        <Text
                          className="font-display text-[16px] tracking-tight"
                          style={{ color: cell.accent ? colors.amber : colors.cream }}
                        >
                          {cell.value}
                        </Text>
                        <Text className="mt-1 font-body text-[10px] text-cream-dim">
                          {cell.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Reveal>

        {/* Préférences */}
        <SectionHead title="Préférences" />
        <Reveal delay={250}>
          <View
            className="overflow-hidden rounded-card border"
            style={{ backgroundColor: colors.surface, borderColor: colors.line }}
          >
            <View
              className="gap-2.5 p-3.5"
              style={{ borderBottomWidth: 1, borderBottomColor: colors.line }}
            >
              <Text className="font-body-semibold text-[14px] text-cream">Thème</Text>
              <SegmentedControl options={THEME_OPTIONS} value={pref} onChange={setPref} />
            </View>
            <SettingRow
              icon={Bell}
              label="Notifications push"
              last
              right={
                <View className="flex-row items-center gap-2">
                  <View
                    className="rounded-full px-2 py-1"
                    style={{ backgroundColor: colors.surface2 }}
                  >
                    <Text className="font-body-semibold text-[10px] text-cream-dim">Bientôt</Text>
                  </View>
                  <Switch value={false} disabled />
                </View>
              }
            />
          </View>
        </Reveal>

        <DevAccountSwitcher />

        {/* Compte */}
        <SectionHead title="Compte" />
        <Reveal delay={300}>
          <View
            className="overflow-hidden rounded-card border"
            style={{ backgroundColor: colors.surface, borderColor: colors.line }}
          >
            <SettingRow icon={LogOut} label="Se déconnecter" onPress={onSignOut} />
            <SettingRow
              icon={Trash2}
              label="Supprimer le compte"
              danger
              last
              onPress={onDelete}
              right={
                deleteAccount.isPending ? <ActivityIndicator color={colors.coral} /> : <View />
              }
            />
          </View>
        </Reveal>
      </ScrollView>
    </ScreenContainer>
  );
}
