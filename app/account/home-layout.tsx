import { useRouter } from "expo-router";
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Coins,
  GripVertical,
  type LucideIcon,
  Users,
} from "lucide-react-native";
import { memo, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";

import { AppBackground } from "@/components/ui/AppBackground";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Toggle } from "@/components/ui/Toggle";
import { colors } from "@/constants/colors";
import { useAppReducedMotion } from "@/hooks/useAppReducedMotion";
import { useMyGroups, type MyGroup } from "@/features/groups/queries";
import { orderGroups } from "@/features/home/home-order";
import { useHomePrefsStore, type HomeStatPrefs } from "@/lib/home-prefs-store";

/**
 * « Organiser l'accueil » — préférences PERSONNELLES d'affichage de l'accueil
 * (cf. `lib/home-prefs-store`, stockées localement) :
 *  - l'ORDRE des défis (glisser-déposer, cf. `SortableGroups`) ;
 *  - les INFOS affichées sur la carte du défi (cagnotte, membres).
 *
 * Deux façons de réordonner : les **flèches** ↑/↓ (déplacement d'un cran, animé), ou
 * l'**appui maintenu sur la poignée** qui « décolle » le défi pour le glisser où on veut.
 * Rangs absolus + reanimated + gesture-handler → web / iOS / Android sans lib tierce.
 * On coupe le scroll de la page pendant le drag pour éviter le conflit de gestes.
 */
export default function HomeLayoutScreen() {
  const router = useRouter();
  const { data: groups } = useMyGroups();
  const groupOrder = useHomePrefsStore((s) => s.groupOrder);
  const setGroupOrder = useHomePrefsStore((s) => s.setGroupOrder);
  const stats = useHomePrefsStore((s) => s.stats);
  const setStat = useHomePrefsStore((s) => s.setStat);

  // Pendant un drag, on désactive le scroll de la page (sinon les deux gestes
  // verticaux se disputent le toucher).
  const [dragging, setDragging] = useState(false);

  // Défis dans l'ordre courant (préférence appliquée) — même logique que l'accueil.
  const ordered = useMemo(() => {
    const base = groups ?? [];
    const ids = orderGroups(
      base.map((g) => g.group.id),
      groupOrder
    );
    return ids.map((id) => base.find((g) => g.group.id === id)).filter((g): g is MyGroup => !!g);
  }, [groups, groupOrder]);

  const items = useMemo(
    () => ordered.map((g) => ({ id: g.group.id, name: g.group.name })),
    [ordered]
  );

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
          scrollEnabled={!dragging}
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 6, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Ordre des défis ---------------------------------------------- */}
          <Reveal delay={0}>
            <SectionTitle>Ordre des défis</SectionTitle>
            <Text className="mb-2.5 px-0.5 font-body text-[12px] leading-[17px] text-cream-dim">
              Range tes défis avec les flèches, ou reste appuyé sur la poignée pour en glisser un où
              tu veux. Celui du haut est affiché en premier.
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
                <SortableGroups
                  items={items}
                  onReorder={setGroupOrder}
                  onDraggingChange={setDragging}
                />
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

/* ------------------------------------------------ glisser-déposer des défis */

const ROW_HEIGHT = 58;
// Ressort DOUX (amorti quasi-critique) : les lignes rejoignent leur place sans rebond
// ni tremblement. L'ancien réglage, plus raide, donnait ce rendu « énervé » (retour
// Romain). Utilisé pour le glisser ET pour les flèches → une seule sensation, fluide.
const DRAG_SPRING = { damping: 26, stiffness: 190, mass: 0.85 } as const;
// Le glisser ne s'amorce qu'après un appui MAINTENU : on « décolle » l'élément
// volontairement, pas au moindre frôlement (ce qui rendait le geste nerveux).
const LIFT_MS = 200;

/** Ordre (ids triés par index) à partir de la table id→index. */
function orderFromPositions(pos: Record<string, number>): string[] {
  "worklet";
  return Object.keys(pos).sort((a, b) => pos[a] - pos[b]);
}

/**
 * Liste réordonnable par glisser-déposer. Rangs ABSOLUS (`top = index * ROW_HEIGHT`)
 * pilotés par une table PARTAGÉE `id → index` : la ligne tirée suit le doigt, les
 * autres glissent (spring) quand leur index change. Compatible web / iOS / Android
 * (reanimated + gesture-handler, sans lib de tri tierce).
 *
 * ⚠ On ne déclenche AUCUN re-render React pendant le drag (tout passe par des
 * SharedValue) : sinon la recréation du geste en cours pourrait l'interrompre.
 * D'où `memo` (le toggle `dragging` du parent ne doit pas re-rendre la liste) et
 * l'absence de numéro « live » (l'ordre se lit à la position ; il se recale sur le
 * store au drop). La position se persiste dans `onEnd`.
 */
const SortableGroups = memo(function SortableGroups({
  items,
  onReorder,
  onDraggingChange,
}: {
  items: { id: string; name: string }[];
  onReorder: (ids: string[]) => void;
  onDraggingChange: (dragging: boolean) => void;
}) {
  const reduceMotion = useAppReducedMotion();
  const positions = useSharedValue<Record<string, number>>(
    Object.fromEntries(items.map((it, i) => [it.id, i] as [string, number]))
  );

  // Ré-init si la liste des défis change (ajout / départ) — pas pendant un drag.
  const idsKey = items.map((it) => it.id).join(",");
  useEffect(() => {
    positions.value = Object.fromEntries(items.map((it, i) => [it.id, i] as [string, number]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  // Flèche ↑/↓ : échange le défi avec son voisin. On met à jour la table partagée
  // (les deux lignes concernées glissent en ressort doux, comme pour le drag) puis on
  // persiste le nouvel ordre. Alternative « simple » au glisser, sans manipulation.
  const nudge = (id: string, delta: number) => {
    const cur = positions.value[id];
    const target = cur + delta;
    if (target < 0 || target >= items.length) return;
    const next = { ...positions.value };
    for (const k of Object.keys(next)) {
      if (next[k] === target) {
        next[k] = cur;
        break;
      }
    }
    next[id] = target;
    positions.value = next;
    onReorder(Object.keys(next).sort((a, b) => next[a] - next[b]));
  };

  return (
    <View style={{ height: items.length * ROW_HEIGHT }}>
      {items.map((it, i) => (
        <SortableRow
          key={it.id}
          id={it.id}
          name={it.name}
          index={i}
          count={items.length}
          positions={positions}
          reduceMotion={reduceMotion}
          onNudge={nudge}
          onLift={() => onDraggingChange(true)}
          onDrop={(ids) => {
            onDraggingChange(false);
            onReorder(ids);
          }}
        />
      ))}
    </View>
  );
});

function SortableRow({
  id,
  name,
  index,
  count,
  positions,
  reduceMotion,
  onNudge,
  onLift,
  onDrop,
}: {
  id: string;
  name: string;
  /** Rang courant dans l'ordre persisté (pour désactiver les flèches aux extrémités). */
  index: number;
  count: number;
  positions: SharedValue<Record<string, number>>;
  reduceMotion: boolean;
  onNudge: (id: string, delta: number) => void;
  onLift: () => void;
  onDrop: (ids: string[]) => void;
}) {
  const top = useSharedValue((positions.value[id] ?? 0) * ROW_HEIGHT);
  const active = useSharedValue(false);

  // Ligne NON tirée : rejoint sa place quand son index change (ressort doux).
  useAnimatedReaction(
    () => positions.value[id],
    (idx) => {
      if (idx == null || active.value) return;
      top.value = reduceMotion ? idx * ROW_HEIGHT : withSpring(idx * ROW_HEIGHT, DRAG_SPRING);
    }
  );

  const pan = Gesture.Pan()
    // Appui maintenu : l'élément se « décolle » avant de suivre le doigt.
    .activateAfterLongPress(LIFT_MS)
    .onStart(() => {
      active.value = true;
      runOnJS(onLift)();
    })
    .onUpdate((e) => {
      const base = (positions.value[id] ?? 0) * ROW_HEIGHT;
      top.value = base + e.translationY;
      const target = Math.min(count - 1, Math.max(0, Math.round(top.value / ROW_HEIGHT)));
      const cur = positions.value[id];
      if (target !== cur) {
        // Échange : la ligne actuellement en `target` reprend l'ancien index.
        const next = { ...positions.value };
        const keys = Object.keys(next);
        for (let i = 0; i < keys.length; i++) {
          if (next[keys[i]] === target) {
            next[keys[i]] = cur;
            break;
          }
        }
        next[id] = target;
        positions.value = next;
      }
    })
    .onEnd(() => {
      const settled = (positions.value[id] ?? 0) * ROW_HEIGHT;
      top.value = reduceMotion ? settled : withSpring(settled, DRAG_SPRING);
      active.value = false;
      runOnJS(onDrop)(orderFromPositions(positions.value));
    });

  const rowStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: 0,
    right: 0,
    top: top.value,
    height: ROW_HEIGHT,
    zIndex: active.value ? 20 : 0,
    transform: [{ scale: active.value && !reduceMotion ? 1.03 : 1 }],
  }));

  // Effet « décollé » quand on tient l'élément : fond plein + ombre douce pour bien
  // montrer qu'il est saisi (au repos, ligne plate avec simple séparateur du bas).
  const liftStyle = useAnimatedStyle(() => ({
    backgroundColor: active.value ? colors.surface : "transparent",
    shadowOpacity: active.value ? 0.3 : 0,
  }));

  return (
    <Animated.View style={rowStyle}>
      <Animated.View
        className="h-full flex-row items-center gap-2.5 rounded-[12px] pl-1 pr-1"
        style={[
          {
            borderBottomWidth: 1,
            borderBottomColor: colors.line,
            shadowColor: "#000",
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
          },
          liftStyle,
        ]}
      >
        {/* Poignée : reste appuyé dessus pour décoller le défi et le glisser. Le geste
            ne s'arme QUE sur la poignée → les flèches et le scroll restent libres. */}
        <GestureDetector gesture={pan}>
          <View
            accessibilityLabel={`Déplacer ${name}`}
            className="h-9 w-9 items-center justify-center rounded-[10px] active:opacity-70"
            style={{ backgroundColor: colors.surface2 }}
          >
            <GripVertical size={17} color={colors.coral} />
          </View>
        </GestureDetector>

        <Text numberOfLines={1} className="flex-1 font-body-semibold text-[14px] text-cream">
          {name}
        </Text>

        {/* Flèches : déplacement d'un cran (l'alternative simple au glisser). */}
        <NudgeButton dir="up" disabled={index === 0} onPress={() => onNudge(id, -1)} />
        <NudgeButton dir="down" disabled={index === count - 1} onPress={() => onNudge(id, 1)} />
      </Animated.View>
    </Animated.View>
  );
}

/** Petit bouton flèche (monter / descendre d'un cran) — désactivé aux extrémités. */
function NudgeButton({
  dir,
  disabled,
  onPress,
}: {
  dir: "up" | "down";
  disabled: boolean;
  onPress: () => void;
}) {
  const Icon = dir === "up" ? ChevronUp : ChevronDown;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      accessibilityLabel={dir === "up" ? "Monter d'un cran" : "Descendre d'un cran"}
      className="h-9 w-9 items-center justify-center rounded-[10px] border active:opacity-70"
      style={{
        backgroundColor: colors.surface2,
        borderColor: colors.line,
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <Icon size={17} color={colors.cream} strokeWidth={2.2} />
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
