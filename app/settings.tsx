import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import {
  Bell,
  ChevronRight,
  FileText,
  Info,
  KeyRound,
  LifeBuoy,
  LogOut,
  Shield,
  Trash2,
  UserCog,
} from "lucide-react-native";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useDeleteAccount } from "@/features/auth/account";
import { useSignOut } from "@/features/auth/mutations";
import { useThemeStore, type ThemePref } from "@/lib/theme-store";

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="mb-2 mt-6 px-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
      {children}
    </Text>
  );
}

function Row({
  icon,
  label,
  sublabel,
  onPress,
  right,
  danger,
  comingSoon,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
  comingSoon?: boolean;
}) {
  return (
    <Pressable
      onPress={comingSoon ? undefined : onPress}
      disabled={comingSoon || !onPress}
      className={`flex-row items-center gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-700 ${
        onPress && !comingSoon ? "active:opacity-70" : ""
      }`}
    >
      {icon}
      <View className="flex-1">
        <Text
          className={`text-base font-medium ${
            danger ? "text-red-600 dark:text-red-400" : "text-neutral-900 dark:text-white"
          }`}
        >
          {label}
        </Text>
        {sublabel ? <Text className="text-xs text-neutral-400">{sublabel}</Text> : null}
      </View>
      {comingSoon ? (
        <View className="rounded-full bg-neutral-100 px-2 py-1 dark:bg-neutral-800">
          <Text className="text-[10px] font-medium text-neutral-400">Bientôt</Text>
        </View>
      ) : (
        right ?? (onPress ? <ChevronRight size={18} color="#94a3b8" /> : null)
      )}
    </Pressable>
  );
}

const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: "light", label: "Clair" },
  { value: "dark", label: "Sombre" },
  { value: "system", label: "Auto" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { alert, confirm, toast } = useFeedback();
  const signOut = useSignOut();
  const deleteAccount = useDeleteAccount();
  const { pref, setPref } = useThemeStore();

  const version = Constants.expoConfig?.version ?? "—";

  const onDeleteAccount = async () => {
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
      onSuccess: (mode) =>
        alert({
          title: "Compte supprimé",
          tone: "success",
          message:
            mode === "deleted"
              ? "Ton compte et toutes tes données ont été supprimés. À bientôt !"
              : "Ton compte a été fermé. Comme de l'argent est engagé dans une cagnotte, " +
                "ton historique reste anonymisé pour ne pas fausser les comptes du groupe.",
          confirmLabel: "Fermer",
        }),
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

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-neutral-900"
      contentContainerClassName="p-4 pb-12"
    >
      <SectionTitle>Compte</SectionTitle>
      <View className="gap-2">
        <Row
          icon={<UserCog size={20} color="#3b82f6" />}
          label="Modifier mon profil"
          onPress={() => router.push("/(tabs)/profile" as never)}
        />
        <Row
          icon={<KeyRound size={20} color="#94a3b8" />}
          label="Changer le mot de passe"
          comingSoon
        />
      </View>

      <SectionTitle>Apparence</SectionTitle>
      <View className="gap-2 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-700">
        <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Thème</Text>
        <SegmentedControl options={THEME_OPTIONS} value={pref} onChange={setPref} />
      </View>

      <SectionTitle>Notifications</SectionTitle>
      <View className="gap-2">
        <Row
          icon={<Bell size={20} color="#94a3b8" />}
          label="Notifications push"
          sublabel="Rappels, votes, récap hebdo"
          comingSoon
          right={<Switch value={false} disabled />}
        />
      </View>

      <SectionTitle>Confidentialité & données</SectionTitle>
      <View className="gap-2">
        <Row
          icon={<Shield size={20} color="#94a3b8" />}
          label="Exporter mes données"
          comingSoon
        />
        <Row
          icon={<Trash2 size={20} color="#ef4444" />}
          label="Supprimer mon compte"
          danger
          onPress={onDeleteAccount}
        />
      </View>

      <SectionTitle>À propos</SectionTitle>
      <View className="gap-2">
        <Row
          icon={<Info size={20} color="#94a3b8" />}
          label="Version"
          right={<Text className="text-sm text-neutral-400">{version}</Text>}
        />
        <Row icon={<FileText size={20} color="#94a3b8" />} label="Conditions d'utilisation" comingSoon />
        <Row icon={<Shield size={20} color="#94a3b8" />} label="Politique de confidentialité" comingSoon />
        <Row icon={<LifeBuoy size={20} color="#94a3b8" />} label="Support" comingSoon />
      </View>

      <View className="mt-8">
        <Pressable
          onPress={onSignOut}
          className="flex-row items-center justify-center gap-2 rounded-2xl border border-neutral-200 p-4 active:opacity-70 dark:border-neutral-700"
        >
          <LogOut size={18} color="#ef4444" />
          <Text className="text-base font-semibold text-red-600 dark:text-red-400">
            Se déconnecter
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
