import Constants from "expo-constants";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Globe,
  Globe2,
  Info,
  KeyRound,
  LayoutGrid,
  LifeBuoy,
  Lock,
  LogOut,
  type LucideIcon,
  Mail,
  MessageCircle,
  Monitor,
  Moon,
  Shield,
  Sparkles,
  Sun,
  TriangleAlert,
} from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";

import { StravaLogo } from "@/components/brand/StravaLogo";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { AppBackground } from "@/components/ui/AppBackground";
import { Avatar } from "@/components/ui/Avatar";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Toggle } from "@/components/ui/Toggle";
import { colors } from "@/constants/colors";
import { deletionMessage, finishAccountDeletion, useDeleteAccount } from "@/features/auth/account";
import { displayName } from "@/features/auth/avatar";
import { useSignOut } from "@/features/auth/mutations";
import {
  NOTIFICATION_PREF_ITEMS,
  prefsSummary,
  useNotificationPrefs,
  useSetNotificationPref,
} from "@/features/settings/notification-prefs";
import {
  PRIVACY_EXPLAINER,
  privacyLabel,
  privacySummary,
  readIsSearchable,
  useSetSearchable,
} from "@/features/settings/privacy";
import { stravaAthleteLabel } from "@/features/settings/strava-session";
import { detectTimezone, timezoneLabel } from "@/features/settings/support";
import { useProfile } from "@/hooks/useProfile";
import { useCurrentUser } from "@/lib/auth-store";
import { useMotionStore } from "@/lib/motion-store";
import { isStravaConfigured, useStravaAuth, useStravaSession } from "@/lib/strava";
import { useThemeStore, type ThemePref } from "@/lib/theme-store";

const THEME_OPTIONS: { value: ThemePref; label: string; icon: LucideIcon; disabled?: boolean }[] = [
  // Le thème clair n'est pas encore peint (toute la DA est écrite en sombre) :
  // le proposer donnerait un écran à moitié cassé.
  { value: "light", label: "Clair", icon: Sun, disabled: true },
  { value: "dark", label: "Sombre", icon: Moon },
  { value: "system", label: "Auto", icon: Monitor, disabled: true },
];

export default function SettingsScreen() {
  const router = useRouter();
  const user = useCurrentUser();
  const { data: profile } = useProfile();
  const { alert, confirm, toast } = useFeedback();

  const signOut = useSignOut();
  const deleteAccount = useDeleteAccount();
  const { pref, setPref } = useThemeStore();
  const reduceMotion = useMotionStore((s) => s.reduced);
  const setReduceMotion = useMotionStore((s) => s.setReduced);

  const { data: prefs } = useNotificationPrefs();
  const setPrefValue = useSetNotificationPref();

  const setSearchable = useSetSearchable();
  const searchable = readIsSearchable(profile);

  const version = Constants.expoConfig?.version ?? "1.0.0";
  const timezone = detectTimezone();

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
    try {
      const mode = await deleteAccount.mutateAsync();
      // Accusé AVANT la déconnexion : `signOut` démonte cet écran.
      await alert({
        title: "Compte supprimé",
        tone: "success",
        message: deletionMessage(mode),
        confirmLabel: "Fermer",
      });
      await finishAccountDeletion();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Suppression impossible.", "error");
    }
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

  const name = displayName(profile ?? {}) || "Mon profil";

  return (
    <View className="flex-1">
      <AppBackground />
      <ScreenContainer transparent padded={false} edges={["top"]}>
        <View
          className="flex-row items-center gap-2 px-[18px] pb-2 pt-1"
          style={{ backgroundColor: colors.ink }}
        >
          <Pressable
            onPress={() =>
              router.canGoBack() ? router.back() : router.navigate("/profile" as never)
            }
            hitSlop={10}
            accessibilityLabel="Retour"
            className="h-10 w-10 items-center justify-center rounded-chip border active:opacity-70"
            style={{ backgroundColor: colors.surface, borderColor: colors.line }}
          >
            <ChevronLeft size={20} color={colors.cream} strokeWidth={2.2} />
          </Pressable>
          <Text className="font-display text-[18px] tracking-tight text-cream">Paramètres</Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 6, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Profil ------------------------------------------------------- */}
          <Reveal delay={0}>
            <Pressable
              onPress={() => router.push("/profile-edit" as never)}
              className="flex-row items-center gap-3.5 rounded-[18px] border p-3.5 active:opacity-80"
              style={{ backgroundColor: colors.surface, borderColor: colors.line2 }}
            >
              <Avatar
                uri={profile?.avatar_url}
                color={profile?.avatar_color}
                icon={profile?.avatar_icon}
                seed={profile?.id ?? user?.id}
                name={name}
                size={52}
              />
              <View className="flex-1">
                <Text
                  numberOfLines={1}
                  className="font-display text-[17px] tracking-tight text-cream"
                >
                  {name}
                </Text>
                <Text numberOfLines={1} className="mt-0.5 font-body text-[12.5px] text-cream-dim">
                  {profile?.username ? `@${profile.username} · ` : ""}Modifier le profil
                </Text>
              </View>
              <ChevronRight size={18} color={colors.creamDim} />
            </Pressable>
          </Reveal>

          {/* Compte ------------------------------------------------------- */}
          <Reveal delay={60}>
            <Section title="Compte">
              <Row
                icon={Mail}
                tone="mint"
                label="Adresse e-mail"
                sublabel={user?.email ?? "—"}
                onPress={() => router.push("/account/email" as never)}
              />
              <Row
                icon={KeyRound}
                tone="amber"
                label="Mot de passe"
                sublabel="Le modifier demande l'actuel"
                onPress={() => router.push("/account/password" as never)}
                last={!isStravaConfigured}
              />
              {isStravaConfigured ? <StravaRow /> : null}
            </Section>
          </Reveal>

          {/* Confidentialité ---------------------------------------------- */}
          <Reveal delay={100}>
            <Section title="Confidentialité" hint={privacyLabel(searchable)}>
              <View className="py-3.5">
                <View className="flex-row items-center gap-3">
                  <IconTile
                    icon={searchable ? Globe2 : Lock}
                    tone={searchable ? "mint" : "amber"}
                  />
                  <View className="flex-1">
                    <Text className="font-body-semibold text-[14px] text-cream">
                      Trouvable par mon pseudo
                    </Text>
                    <Text className="mt-0.5 font-body text-[11.5px] leading-4 text-cream-dim">
                      {privacySummary(searchable)}
                    </Text>
                  </View>
                  <Toggle
                    value={searchable}
                    accessibilityLabel="Trouvable par mon pseudo"
                    onChange={(value) =>
                      setSearchable.mutate(value, {
                        onError: (e) => toast(e.message, "error"),
                      })
                    }
                  />
                </View>
                <Text className="mt-2.5 font-body text-[11.5px] leading-[16px] text-cream-dim">
                  {PRIVACY_EXPLAINER}
                </Text>
              </View>
            </Section>
          </Reveal>

          {/* Accueil ------------------------------------------------------ */}
          <Reveal delay={110}>
            <Section title="Accueil">
              <Row
                icon={LayoutGrid}
                tone="coral"
                label="Organiser l'accueil"
                sublabel="Ordre des défis et infos affichées sur l'accueil"
                onPress={() => router.push("/account/home-layout" as never)}
                last
              />
            </Section>
          </Reveal>

          {/* Notifications ------------------------------------------------ */}
          <Reveal delay={120}>
            <Section title="Notifications" hint={prefs ? prefsSummary(prefs) : undefined}>
              {NOTIFICATION_PREF_ITEMS.map((item, index) => (
                <Row
                  key={item.key}
                  icon={item.icon}
                  tone={(["coral", "amber", "mint"] as Tone[])[index % 3]}
                  label={item.label}
                  sublabel={
                    item.live ? item.sublabel : `${item.sublabel} · dès leur mise en service`
                  }
                  last={index === NOTIFICATION_PREF_ITEMS.length - 1}
                >
                  <Toggle
                    value={prefs?.[item.key] ?? true}
                    accessibilityLabel={item.label}
                    onChange={(value) => setPrefValue.mutate({ key: item.key, value })}
                  />
                </Row>
              ))}
            </Section>
          </Reveal>

          {/* Apparence ---------------------------------------------------- */}
          <Reveal delay={180}>
            <Section title="Apparence">
              <View className="border-b py-3.5" style={{ borderColor: colors.line }}>
                <View className="flex-row items-center gap-3">
                  <IconTile icon={Moon} tone="amber" />
                  <View className="flex-1">
                    <Text className="font-body-semibold text-[14px] text-cream">Thème</Text>
                    <Text className="mt-0.5 font-body text-[11.5px] text-cream-dim">
                      Clair, sombre ou selon le système
                    </Text>
                  </View>
                </View>
                <View className="mt-3">
                  <SegmentedControl options={THEME_OPTIONS} value={pref} onChange={setPref} />
                </View>
                <Text className="mt-2.5 font-body text-[11.5px] leading-[16px] text-cream-dim">
                  Le thème clair est en cours de fabrication : toute l'identité visuelle est
                  aujourd'hui dessinée en sombre.
                </Text>
              </View>

              <Row
                icon={Sparkles}
                tone="coral"
                label="Réduire les animations"
                sublabel="Limite les transitions et effets"
                last
              >
                <Toggle
                  value={reduceMotion}
                  accessibilityLabel="Réduire les animations"
                  onChange={setReduceMotion}
                />
              </Row>
            </Section>
          </Reveal>

          {/* Langue & région ---------------------------------------------- */}
          <Reveal delay={240}>
            <Section title="Langue & région">
              <Row icon={Globe} tone="mint" label="Langue" value="Français" />
              <Row
                icon={Clock}
                tone="amber"
                label="Fuseau horaire"
                sublabel="Sert au calcul de la semaine"
                value={timezoneLabel(timezone)}
                last
              />
            </Section>
          </Reveal>

          {/* Aide & légal -------------------------------------------------- */}
          <Reveal delay={300}>
            <Section title="Aide & légal">
              <Row
                icon={LifeBuoy}
                tone="mint"
                label="Centre d'aide"
                onPress={() => router.push("/legal/help" as never)}
              />
              {/* Grisé tant que l'envoi d'e-mails n'est pas en place. */}
              <Row icon={MessageCircle} label="Contacter le support" soon />
              <Row
                icon={FileText}
                tone="amber"
                label="Conditions d'utilisation"
                onPress={() => router.push("/legal/terms" as never)}
              />
              <Row
                icon={Shield}
                tone="coral"
                label="Politique de confidentialité"
                onPress={() => router.push("/legal/privacy" as never)}
              />
              <Row icon={Info} label="Version" value={version} last />
            </Section>
          </Reveal>

          {/* Sortie ------------------------------------------------------- */}
          <Reveal delay={360} className="mt-6">
            <Pressable
              onPress={onSignOut}
              className="flex-row items-center justify-center gap-2.5 rounded-[15px] border p-4 active:opacity-80"
              style={{ backgroundColor: colors.surface, borderColor: colors.line2 }}
            >
              <LogOut size={18} color={colors.coral} strokeWidth={2.2} />
              <Text className="font-display text-[14.5px] tracking-tight text-cream">
                Se déconnecter
              </Text>
            </Pressable>

            {/* Zone dangereuse : un lien nu au milieu de la page se cliquait par
                accident. Elle est maintenant nommée, cadrée et explicite sur ce
                qu'elle détruit. */}
            <View
              className="mt-5 rounded-[16px] border p-4"
              style={{ backgroundColor: colors.redSoft, borderColor: "rgba(242,85,74,0.28)" }}
            >
              <View className="flex-row items-center gap-2.5">
                <View
                  className="h-9 w-9 items-center justify-center rounded-[10px]"
                  style={{ backgroundColor: "rgba(242,85,74,0.18)" }}
                >
                  <TriangleAlert size={17} color={colors.red} strokeWidth={2.2} />
                </View>
                <Text className="flex-1 font-display text-[14.5px] tracking-tight text-cream">
                  Supprimer mon compte
                </Text>
              </View>
              <Text className="mt-2.5 font-body text-[12px] leading-[17px] text-cream-dim">
                Efface définitivement tes séances, tes excuses et tes groupes. Les sommes dues à un
                défi restent conservées jusqu'à leur règlement.
              </Text>
              <Pressable
                onPress={onDeleteAccount}
                disabled={deleteAccount.isPending}
                className="mt-3 items-center rounded-input border py-3 active:opacity-80"
                style={{
                  borderColor: colors.red,
                  opacity: deleteAccount.isPending ? 0.5 : 1,
                }}
              >
                <Text className="font-body-bold text-[13px]" style={{ color: colors.red }}>
                  {deleteAccount.isPending ? "Suppression…" : "Supprimer définitivement"}
                </Text>
              </Pressable>
            </View>

            <Text className="mt-4 text-center font-body text-[11px] text-cream-dim">
              <Text className="font-display text-cream">Sport Motiv</Text> · v{version}
            </Text>
          </Reveal>
        </ScrollView>
      </ScreenContainer>
    </View>
  );
}

/* ---------------------------------------------------------------- Strava */

/**
 * Ligne Strava. Connectée, elle mène à l'écran du compte (dernières activités) ;
 * déconnectée, elle lance l'autorisation puis confirme par une popup — sans quoi
 * on revient de Strava sans savoir si ça a marché.
 */
function StravaRow() {
  const router = useRouter();
  const { alert, toast } = useFeedback();
  const { connect, isPending } = useStravaAuth();
  const { data: session } = useStravaSession();

  const connected = !!session;
  const athlete = stravaAthleteLabel(session ?? null);

  const onPress = async () => {
    if (connected) {
      router.push("/account/strava" as never);
      return;
    }
    const { token, error } = await connect();
    if (error) {
      // On montre la raison de l'échec plutôt que de rester muet (le bug signalé :
      // « ça se ferme comme si ça marchait » puis reconnexion redemandée).
      toast(error, "error");
      return;
    }
    if (!token) return; // annulation volontaire de l'utilisateur
    await alert({
      title: "Strava connecté",
      tone: "success",
      message:
        "Tes activités récentes peuvent maintenant servir de preuve quand tu déclares une séance.",
      confirmLabel: "Parfait",
    });
    router.push("/account/strava" as never);
  };

  return (
    <Row
      iconNode={<StravaLogo size={18} />}
      tone="strava"
      label="Strava"
      sublabel={
        connected
          ? athlete
            ? `${athlete} · voir mes activités`
            : "Voir mes dernières activités"
          : "Importer tes activités comme preuve"
      }
      onPress={isPending ? undefined : onPress}
      last
    >
      {connected ? (
        <View
          className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1"
          style={{ backgroundColor: colors.mintSoft }}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.mint }} />
          <Text className="font-body-bold text-[11px]" style={{ color: colors.mint }}>
            Connecté
          </Text>
        </View>
      ) : null}
    </Row>
  );
}

/* ------------------------------------------------------------- primitives */

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-[18px]">
      <View className="mb-2.5 flex-row items-baseline justify-between pl-0.5">
        <Text className="font-body-bold text-[12px] uppercase tracking-label text-cream-dim">
          {title}
        </Text>
        {hint ? <Text className="font-body text-[11.5px] text-cream-dim">{hint}</Text> : null}
      </View>
      <View
        className="rounded-[18px] border px-3.5"
        style={{ backgroundColor: colors.surface, borderColor: colors.line2 }}
      >
        {children}
      </View>
    </View>
  );
}

/**
 * Palette des icônes de réglage. Chaque ton = une couleur d'icône + son fond
 * doux assorti. On reste dans la DA chaude (coral / ambre / menthe / rouge) —
 * pas de bleu/violet qui jureraient — pour donner de la couleur à la page sans
 * la sortir de son identité. `strava` porte l'orange de marque.
 */
const TONES = {
  coral: { fg: colors.coral, bg: colors.coralSoft },
  amber: { fg: colors.amber, bg: colors.amberSoft },
  mint: { fg: colors.mint, bg: colors.mintSoft },
  red: { fg: colors.red, bg: colors.redSoft },
  neutral: { fg: colors.creamDim, bg: colors.surface2 },
  strava: { fg: "#FC4C02", bg: "rgba(252,76,2,0.15)" },
} as const;

type Tone = keyof typeof TONES;

function IconTile({
  icon: Icon,
  tone = "neutral",
  node,
}: {
  icon?: LucideIcon;
  tone?: Tone;
  /** Contenu personnalisé (ex. logo Strava) à la place de l'icône lucide. */
  node?: React.ReactNode;
}) {
  const { fg, bg } = TONES[tone];
  return (
    <View
      className="h-9 w-9 items-center justify-center rounded-[10px]"
      style={{ backgroundColor: bg }}
    >
      {node ?? (Icon ? <Icon size={18} color={fg} strokeWidth={2} /> : null)}
    </View>
  );
}

function Row({
  icon,
  iconNode,
  tone,
  label,
  sublabel,
  value,
  last,
  soon,
  onPress,
  children,
}: {
  icon?: LucideIcon;
  /** Icône personnalisée (ex. logo Strava) au lieu d'une icône lucide. */
  iconNode?: React.ReactNode;
  /** Couleur de l'icône (donne de la vie à la page). */
  tone?: Tone;
  label: string;
  sublabel?: string;
  /** Valeur en clair à droite (lecture seule). */
  value?: string;
  last?: boolean;
  /** Fonction annoncée mais pas encore branchée → grisée et inerte. */
  soon?: boolean;
  onPress?: () => void;
  /** Contrôle à droite (interrupteur, pastille…). */
  children?: React.ReactNode;
}) {
  const content = (
    <>
      <IconTile icon={icon} tone={tone} node={iconNode} />
      <View className="flex-1">
        <Text className="font-body-semibold text-[14px] text-cream">{label}</Text>
        {sublabel ? (
          <Text numberOfLines={1} className="mt-0.5 font-body text-[11.5px] text-cream-dim">
            {sublabel}
          </Text>
        ) : null}
      </View>
      {value ? <Text className="font-body-semibold text-[13px] text-cream">{value}</Text> : null}
      {soon ? (
        <View className="rounded-full px-2 py-1" style={{ backgroundColor: colors.surface2 }}>
          <Text className="font-body-bold text-[10px] text-cream-dim">Bientôt</Text>
        </View>
      ) : null}
      {children}
      {onPress && !soon ? <ChevronRight size={17} color={colors.creamDim} /> : null}
    </>
  );

  const className = "flex-row items-center gap-3 py-3.5";
  const style = [
    last ? undefined : { borderBottomWidth: 1, borderColor: colors.line },
    soon ? { opacity: 0.45 } : undefined,
  ];

  if (onPress && !soon) {
    return (
      <Pressable onPress={onPress} className={`${className} active:opacity-70`} style={style}>
        {content}
      </Pressable>
    );
  }

  return (
    <View className={className} style={style}>
      {content}
    </View>
  );
}
