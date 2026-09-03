import { LinearGradient } from "expo-linear-gradient";
import { Flame, Target, Trophy } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { Confetti } from "@/components/ui/Confetti";
import { PopIn } from "@/components/ui/PopIn";
import { BADGE_BY_KEY } from "@/constants/badges";
import { colors, gradients } from "@/constants/colors";
import { useMarkBadgesSeen, useTrophies, type TrophyBadge } from "@/features/badges/queries";
import { useMarkNotificationRead } from "@/features/notifications/mutations";
import { useNotifications } from "@/features/notifications/queries";
import { pickObjectiveCelebrations, type ObjectiveCelebration } from "@/features/streaks/celebration";

type Batch = { badges: TrophyBadge[]; objectives: ObjectiveCelebration[] };

/** Retire les emoji d'un texte serveur (la célébration s'exprime en ICÔNES, pas en emoji). */
function stripEmoji(text: string): string {
  return text
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}️]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Célébration GROUPÉE des réussites fraîches (objectif hebdo + série + trophées).
 * Montée une fois au niveau racine (zone authentifiée). Dès qu'un objectif est atteint
 * et/ou un ou plusieurs badges arrivent, on affiche UNE seule modale qui réunit tout —
 * jamais une pile de pop-ups.
 *
 * Design : médaillon dégradé + ICÔNES (aucun emoji), confettis + PopIn. « Une seule
 * fois » : à la fermeture on marque les badges vus (`seen_at`) et la notif d'objectif
 * lue (`read`) ; un garde local évite la réouverture pendant le rafraîchissement.
 */
export function BadgeCelebration() {
  const { data } = useTrophies();
  const { data: notifications } = useNotifications();
  const markSeen = useMarkBadgesSeen();
  const markRead = useMarkNotificationRead();
  const [batch, setBatch] = useState<Batch | null>(null);
  const batchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dispatchedBadges = useRef<Set<string>>(new Set());
  const dispatchedObjectives = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (batch) return;
    const badges = (data?.unseen ?? []).filter((b) => !dispatchedBadges.current.has(b.key));
    const objectives = pickObjectiveCelebrations(
      notifications ?? [],
      dispatchedObjectives.current
    );
    if (badges.length === 0 && objectives.length === 0) return;

    // Les notifications badge/objectifs sont insérées dans la même transaction mais
    // Realtime peut les livrer séparément. Cette courte fenêtre rassemble le lot et
    // laisse la requête trophées se rafraîchir avant d'ouvrir UNE seule modale.
    if (batchTimer.current) clearTimeout(batchTimer.current);
    batchTimer.current = setTimeout(() => setBatch({ badges, objectives }), 350);
    return () => {
      if (batchTimer.current) clearTimeout(batchTimer.current);
      batchTimer.current = null;
    };
  }, [data, notifications, batch]);

  if (!batch || (batch.badges.length === 0 && batch.objectives.length === 0)) return null;
  const { badges, objectives } = batch;

  const close = () => {
    if (badges.length > 0) {
      const keys = badges.map((b) => b.key);
      keys.forEach((k) => dispatchedBadges.current.add(k));
      markSeen.mutate(keys);
    }
    for (const objective of objectives) {
      dispatchedObjectives.current.add(objective.notificationId);
      markRead.mutate(objective.notificationId);
    }
    setBatch(null);
  };

  const hasBadges = badges.length > 0;
  const hasObjectives = objectives.length > 0;
  const multipleBadges = badges.length > 1;

  // Entête : icône + dégradé selon l'événement le plus fort du lot.
  const HeadIcon = hasBadges ? Trophy : Target;
  const headGradient = hasBadges ? gradients.brand : gradients.green;
  const heading = hasObjectives
    ? hasBadges
      ? "Bravo, tout s'enchaîne !"
      : "Objectif atteint !"
    : multipleBadges
      ? "Nouveaux trophées !"
      : "Nouveau trophée !";
  const subheading = hasObjectives
    ? hasBadges
      ? "Objectif de la semaine validé, et de nouveaux trophées débloqués."
      : "Tu as validé ton objectif de la semaine."
    : multipleBadges
      ? "Tu viens de débloquer plusieurs trophées."
      : "Tu viens de débloquer un trophée.";

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.66)", justifyContent: "center", padding: 26 }}>
        <Confetti count={26} />
        <PopIn>
          <View
            className="items-center rounded-[28px] border p-6"
            style={{ backgroundColor: colors.surface, borderColor: colors.line2 }}
          >
            {/* Médaillon dégradé (icône, pas d'emoji) */}
            <LinearGradient
              colors={headGradient.colors}
              start={headGradient.start}
              end={headGradient.end}
              style={{
                height: 66,
                width: 66,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <HeadIcon size={30} color={colors.onCoral} strokeWidth={2.2} />
            </LinearGradient>

            <Text className="mt-3.5 text-center font-display text-[22px] tracking-tighter text-cream">
              {heading}
            </Text>
            <Text className="mt-1.5 text-center font-body text-[12.5px] leading-[17px] text-cream-dim">
              {subheading}
            </Text>

            <ScrollView
              className="mt-4 w-full"
              style={{ maxHeight: 400 }}
              contentContainerStyle={{ gap: 10 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Objectif hebdo atteint (+ série) — en tête, teinte mint. */}
              {objectives.map((objective) => (
                <View
                  key={objective.notificationId}
                  className="flex-row items-center gap-3 rounded-[16px] border p-3"
                  style={{ backgroundColor: colors.surface2, borderColor: colors.line2 }}
                >
                  <View
                    className="h-[42px] w-[42px] items-center justify-center rounded-[13px]"
                    style={{ backgroundColor: `${colors.mint}22` }}
                  >
                    <Target size={22} color={colors.mint} strokeWidth={2.2} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-display text-[14.5px] tracking-tight text-cream">
                      Objectif de la semaine
                    </Text>
                    <Text className="mt-0.5 font-body text-[11.5px] leading-[16px] text-cream-dim">
                      {stripEmoji(objective.body)}
                    </Text>
                  </View>
                  {objective.streak >= 2 ? (
                    <View
                      className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
                      style={{ backgroundColor: `${colors.amber}22` }}
                    >
                      <Flame size={13} color={colors.amber} strokeWidth={2.4} />
                      <Text className="font-body-bold text-[12px]" style={{ color: colors.amber }}>
                        {objective.streak}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}

              {/* Badges fraîchement débloqués (icônes du catalogue). */}
              {badges.map((b) => {
                const def = BADGE_BY_KEY[b.key];
                const Icon = def?.icon;
                const tint = def?.tint ?? colors.amber;
                return (
                  <View
                    key={b.key}
                    className="flex-row items-center gap-3 rounded-[16px] border p-3"
                    style={{ backgroundColor: colors.surface2, borderColor: colors.line2 }}
                  >
                    <View
                      className="h-[42px] w-[42px] items-center justify-center rounded-[13px]"
                      style={{ backgroundColor: `${tint}22` }}
                    >
                      {Icon ? <Icon size={22} color={tint} strokeWidth={2.2} /> : null}
                    </View>
                    <View className="flex-1">
                      <Text className="font-display text-[14.5px] tracking-tight text-cream">
                        {def?.title ?? b.key}
                      </Text>
                      {def?.description ? (
                        <Text className="mt-0.5 font-body text-[11.5px] text-cream-dim">
                          {def.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <Pressable
              onPress={close}
              className="mt-5 h-12 w-full items-center justify-center overflow-hidden rounded-[16px] active:opacity-90"
            >
              <LinearGradient
                colors={gradients.brand.colors}
                start={gradients.brand.start}
                end={gradients.brand.end}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              />
              <Text className="font-display text-[15px]" style={{ color: colors.onCoral }}>
                Génial !
              </Text>
            </Pressable>
          </View>
        </PopIn>
      </View>
    </Modal>
  );
}
