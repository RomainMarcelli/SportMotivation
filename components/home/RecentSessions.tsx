import { ChevronRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { colors } from "@/constants/colors";
import { relativeDay } from "@/features/home/home-stats";
import { formatDistanceKm, sessionMetric } from "@/features/sessions/metrics";
import type { SessionWithAuthor } from "@/features/sessions/queries";
import { formatDuration } from "@/lib/duration";
import { getSportIcon } from "@/lib/sports";

const TAG: Record<string, { label: string; tint: string; soft: string }> = {
  validated: { label: "Validée", tint: colors.mint, soft: colors.mintSoft },
  pending_vote: { label: "En attente", tint: colors.amber, soft: colors.amberSoft },
  rejected: { label: "Refusée", tint: colors.red, soft: colors.redSoft },
  expired: { label: "Expirée", tint: colors.creamDim, soft: "rgba(255,238,221,0.07)" },
};

/** Icône ronde teintée par sport (course, muscu, vélo…). */
function SportTile({ activity }: { activity: string }) {
  const Icon = getSportIcon(activity);
  return (
    <View
      className="h-10 w-10 items-center justify-center rounded-xl"
      style={{ backgroundColor: colors.surface2 }}
    >
      <Icon size={18} color={colors.coral} strokeWidth={2.2} />
    </View>
  );
}

type Props = {
  sessions: SessionWithAuthor[];
  meId: string | undefined;
  /** « Voir tout » → onglet Séances du défi. */
  onSeeAll: () => void;
  /** Ouvre la fiche détaillée d'une séance (lecture seule). */
  onOpenSession: (session: SessionWithAuthor) => void;
};

/**
 * « Dernières séances » de l'accueil : les 3 plus récentes du groupe actif.
 * Chaque ligne ouvre la fiche détaillée ; « Voir tout » mène à l'onglet Séances.
 */
export function RecentSessions({ sessions, meId, onSeeAll, onOpenSession }: Props) {
  const now = new Date();
  // Accueil « Dernières séances » = MES séances uniquement. Les séances des autres
  // se valident dans l'onglet « À voter » du groupe, pas ici (retour Romain).
  const latest = sessions.filter((s) => s.author.id === meId).slice(0, 3);

  return (
    <View>
      <View className="mb-2 flex-row items-center justify-between px-0.5">
        <Text className="font-display text-[16px] tracking-tight text-cream">
          Dernières séances
        </Text>
        {/* « Voir tout » à la DA : puce coral-soft + chevron. Hauteur fixe +
            justify-center + lineHeight explicite → texte et chevron parfaitement
            centrés (sur le web, le padding vertical seul laissait le texte
            légèrement désaxé par rapport à l'icône). */}
        <Pressable
          onPress={onSeeAll}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Voir toutes les séances"
          className="flex-row items-center justify-center gap-1 rounded-full px-3 active:opacity-80"
          style={{ backgroundColor: colors.coralSoft, height: 30 }}
        >
          <Text
            className="font-body-bold text-[11.5px] text-coral"
            style={{ lineHeight: 14, includeFontPadding: false }}
          >
            Voir tout
          </Text>
          <ChevronRight size={13} color={colors.coral} strokeWidth={2.6} />
        </Pressable>
      </View>

      <Card>
        {latest.length === 0 ? (
          <Text className="font-body text-[13px] text-cream-dim">
            Aucune séance déclarée pour l'instant. Lance-toi !
          </Text>
        ) : null}

        {latest.map((session, i) => {
          const tag = TAG[session.status] ?? TAG.expired;
          const isMe = session.author.id === meId;
          const who = isMe
            ? "Toi"
            : session.author.first_name || session.author.username || "Membre";
          const distance = formatDistanceKm(session.distance_km);
          const metric = sessionMetric(
            session.activity_type,
            session.duration_min,
            session.distance_km
          );
          const details = [
            who,
            formatDuration(session.duration_min),
            distance,
            metric?.value,
            relativeDay(session.performed_at, now),
          ].filter(Boolean);
          return (
            <Pressable
              key={session.id}
              onPress={() => onOpenSession(session)}
              accessibilityLabel={`Voir la séance ${session.activity_type}`}
              className="flex-row items-center gap-3 py-2.5 active:opacity-70"
              style={{
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.line,
              }}
            >
              <SportTile activity={session.activity_type} />
              <View className="flex-1">
                <Text numberOfLines={1} className="font-body-bold text-[13.5px] text-cream">
                  {session.activity_type}
                </Text>
                <Text numberOfLines={1} className="mt-0.5 font-body text-[11.5px] text-cream-dim">
                  {details.join(" · ")}
                </Text>
              </View>
              <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: tag.soft }}>
                <Text className="font-body-bold text-[10px]" style={{ color: tag.tint }}>
                  {tag.label}
                </Text>
              </View>
              <ChevronRight size={15} color={colors.creamDim} />
            </Pressable>
          );
        })}
      </Card>
    </View>
  );
}
