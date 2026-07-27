import { useRouter } from "expo-router";
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Coins,
  type LucideIcon,
  Users,
} from "lucide-react-native";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { AppBackground } from "@/components/ui/AppBackground";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Toggle } from "@/components/ui/Toggle";
import { colors } from "@/constants/colors";
import { useMyGroups, type MyGroup } from "@/features/groups/queries";
import { moveInList, orderGroups } from "@/features/home/home-order";
import { useHomePrefsStore, type HomeStatPrefs } from "@/lib/home-prefs-store";

/**
 * « Organiser l'accueil » — préférences PERSONNELLES d'affichage de l'accueil
 * (cf. `lib/home-prefs-store`, stockées localement) :
 *  - l'ORDRE des défis (mettre en avant celui qu'on veut voir en premier) ;
 *  - les INFOS affichées sur la carte du défi (cagnotte, membres).
 *
 * Réordonnancement par flèches ↑/↓ plutôt que glisser-déposer : ça marche à
 * l'identique sur web / iOS / Android sans dépendance native, et couvre le
 * besoin (« mettre le groupe 2 devant le groupe 1 »).
 */
export default function HomeLayoutScreen() {
  const router = useRouter();
  const { data: groups } = useMyGroups();
  const groupOrder = useHomePrefsStore((s) => s.groupOrder);
  const setGroupOrder = useHomePrefsStore((s) => s.setGroupOrder);
  const stats = useHomePrefsStore((s) => s.stats);
  const setStat = useHomePrefsStore((s) => s.setStat);

  // Défis dans l'ordre courant (préférence appliquée) — même logique que l'accueil.
  const ordered = useMemo(() => {
    const base = groups ?? [];
    const ids = orderGroups(
      base.map((g) => g.group.id),
      groupOrder
    );
    return ids.map((id) => base.find((g) => g.group.id === id)).filter((g): g is MyGroup => !!g);
  }, [groups, groupOrder]);

  // Déplacer un défi d'un cran = persister le nouvel ordre complet des défis actuels.
  const move = (id: string, dir: -1 | 1) => {
    setGroupOrder(
      moveInList(
        ordered.map((g) => g.group.id),
        id,
        dir
      )
    );
  };

  return (
    <View className="flex-1">
      <AppBackground />
      <ScreenContainer transparent padded={false} edges={["top"]}>
        <View className="flex-row items-center gap-2 px-[18px] pb-3 pt-1">
          <Pressable
            onPress={() =>
              router.canGoBack() ? router.back() : router.navigate("/settings" as never)
            }
            hitSlop={10}
            accessibilityLabel="Retour"
            className="h-10 w-10 items-center justify-center rounded-chip border active:opacity-70"
            style={{ backgroundColor: colors.surface, borderColor: colors.line }}
          >
            <ChevronLeft size={20} color={colors.cream} strokeWidth={2.2} />
          </Pressable>
          <Text className="font-display text-[18px] tracking-tight text-cream">
            Organiser l'accueil
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 6, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Ordre des défis ---------------------------------------------- */}
          <Reveal delay={0}>
            <SectionTitle>Ordre des défis</SectionTitle>
            <Text className="mb-2.5 px-0.5 font-body text-[12px] leading-[17px] text-cream-dim">
              L'ordre dans lequel tes défis apparaissent sur l'accueil. Le premier est celui affiché
              en arrivant.
            </Text>
            <Card>
              {ordered.length === 0 ? (
                <Text className="font-body text-[13px] text-cream-dim">
                  Tu n'as pas encore de défi.
                </Text>
              ) : ordered.length === 1 ? (
                <Text className="font-body text-[13px] leading-[19px] text-cream-dim">
                  Un seul défi pour l'instant — le réglage de l'ordre s'activera dès que tu en auras
                  plusieurs.
                </Text>
              ) : (
                ordered.map((g, i) => (
                  <View
                    key={g.group.id}
                    className="flex-row items-center gap-3 py-3"
                    style={{ borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.line }}
                  >
                    <View
                      className="h-8 w-8 items-center justify-center rounded-[10px]"
                      style={{ backgroundColor: colors.coralSoft }}
                    >
                      <Text className="font-display text-[13px] text-coral">{i + 1}</Text>
                    </View>
                    <Text
                      numberOfLines={1}
                      className="flex-1 font-body-semibold text-[14px] text-cream"
                    >
                      {g.group.name}
                    </Text>
                    <ArrowBtn
                      icon={ChevronUp}
                      label={`Monter ${g.group.name}`}
                      disabled={i === 0}
                      onPress={() => move(g.group.id, -1)}
                    />
                    <ArrowBtn
                      icon={ChevronDown}
                      label={`Descendre ${g.group.name}`}
                      disabled={i === ordered.length - 1}
                      onPress={() => move(g.group.id, 1)}
                    />
                  </View>
                ))
              )}
            </Card>
          </Reveal>

          {/* Infos affichées ---------------------------------------------- */}
          <Reveal delay={80} className="mt-6">
            <SectionTitle>Infos affichées</SectionTitle>
            <Text className="mb-2.5 px-0.5 font-body text-[12px] leading-[17px] text-cream-dim">
              Ce qui s'affiche sur la carte du défi en haut de l'accueil. D'autres statistiques
              viendront s'ajouter ici avec l'écran Statistiques.
            </Text>
            <Card>
              <StatRow
                icon={Coins}
                tint={colors.amber}
                soft={colors.amberSoft}
                label="Cagnotte du défi"
                sublabel="Le montant en jeu"
                statKey="pot"
                value={stats.pot}
                onChange={setStat}
              />
              <StatRow
                icon={Users}
                tint={colors.mint}
                soft={colors.mintSoft}
                label="Membres"
                sublabel="La pile d'avatars et le total"
                statKey="members"
                value={stats.members}
                onChange={setStat}
                last
              />
            </Card>
          </Reveal>
        </ScrollView>
      </ScreenContainer>
    </View>
  );
}

/* ------------------------------------------------------------- primitives */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mb-2 px-0.5 font-body-bold text-[12px] uppercase tracking-label text-cream-dim">
      {children}
    </Text>
  );
}

/** Flèche ↑/↓ pour réordonner, inerte et grisée aux extrémités. */
function ArrowBtn({
  icon: Icon,
  label,
  disabled,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      className="h-8 w-8 items-center justify-center rounded-[9px] border active:opacity-70"
      style={{
        backgroundColor: colors.surface2,
        borderColor: colors.line,
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <Icon size={17} color={colors.cream} strokeWidth={2.4} />
    </Pressable>
  );
}

function StatRow({
  icon: Icon,
  tint,
  soft,
  label,
  sublabel,
  statKey,
  value,
  onChange,
  last,
}: {
  icon: LucideIcon;
  tint: string;
  soft: string;
  label: string;
  sublabel: string;
  statKey: keyof HomeStatPrefs;
  value: boolean;
  onChange: (key: keyof HomeStatPrefs, value: boolean) => void;
  last?: boolean;
}) {
  return (
    <View
      className="flex-row items-center gap-3 py-3.5"
      style={{ borderBottomWidth: last ? 0 : 1, borderColor: colors.line }}
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: soft }}
      >
        <Icon size={18} color={tint} strokeWidth={2} />
      </View>
      <View className="flex-1">
        <Text className="font-body-semibold text-[14px] text-cream">{label}</Text>
        <Text className="mt-0.5 font-body text-[11.5px] text-cream-dim">{sublabel}</Text>
      </View>
      <Toggle value={value} accessibilityLabel={label} onChange={(v) => onChange(statKey, v)} />
    </View>
  );
}
