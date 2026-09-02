import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  CalendarDays,
  Check,
  Clock,
  ExternalLink,
  Layers,
  MapPin,
  MessageSquare,
  Timer,
  Vote,
  X as XIcon,
} from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Linking, Modal, Pressable, Text, View } from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { colors } from "@/constants/colors";
import { useGroupMembers } from "@/features/groups/queries";
import {
  useProofSignedUrl,
  useSessionVotes,
  useSharedSessionGroups,
  type SessionWithAuthor,
} from "@/features/sessions/queries";
import { formatDbDate } from "@/lib/date";
import { formatDuration } from "@/lib/duration";
import { getSportIcon } from "@/lib/sports";

const STATUS: Record<string, { label: string; tint: string; soft: string }> = {
  validated: { label: "Validée", tint: colors.mint, soft: colors.mintSoft },
  pending_vote: { label: "En attente de vote", tint: colors.amber, soft: colors.amberSoft },
  rejected: { label: "Refusée", tint: colors.red, soft: colors.redSoft },
  expired: { label: "Expirée", tint: colors.creamDim, soft: colors.surface2 },
};

type Props = {
  session: SessionWithAuthor | null;
  onClose: () => void;
  /** Mon id : sert à proposer « Voter cette séance » quand c'est celle d'un autre. */
  meId?: string;
};

/**
 * Fiche d'une séance déjà déclarée, en **lecture seule**.
 *
 * Une séance publiée est un engagement pris devant le groupe : on peut la
 * relire, pas la retoucher. La fiche répond à « qu'est-ce que j'avais mis, au
 * juste ? » — durée, sport, date, preuve — et à « où en est le vote ? ».
 */
export function SessionDetailSheet({ session, onClose, meId }: Props) {
  return (
    <BottomSheet
      visible={!!session}
      onClose={onClose}
      title={session?.activity_type ?? ""}
      subtitle={session ? formatDbDate(session.performed_at) : undefined}
      leading={session ? <SportTile activity={session.activity_type} /> : null}
    >
      {session ? <Body session={session} meId={meId} onClose={onClose} /> : null}
    </BottomSheet>
  );
}

function SportTile({ activity }: { activity: string }) {
  const Icon = getSportIcon(activity);
  return (
    <View
      className="h-11 w-11 items-center justify-center rounded-[13px]"
      style={{ backgroundColor: colors.coralSoft }}
    >
      <Icon size={21} color={colors.coral} strokeWidth={2.2} />
    </View>
  );
}

function Body({
  session,
  meId,
  onClose,
}: {
  session: SessionWithAuthor;
  meId?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const status = STATUS[session.status] ?? STATUS.expired;
  const { data: votes } = useSessionVotes(session.id);
  const { data: members } = useGroupMembers(session.group_id);
  const { data: shared } = useSharedSessionGroups(session.shared_id);

  // « Voter cette séance » : proposé si c'est une séance EN ATTENTE, d'un AUTRE
  // membre, que je n'ai pas encore votée. (L'éligibilité fine — arrivé avant la
  // publication — et le « déjà voté » définitif sont revérifiés côté deck/serveur.)
  const votedByMe = !!meId && (votes ?? []).some((v) => v.voterId === meId);
  const canVote =
    session.status === "pending_vote" && !!meId && session.author.id !== meId && !votedByMe;

  const goVote = () => {
    onClose();
    router.push({ pathname: "/group/[id]/vote", params: { id: session.group_id } } as never);
  };

  const proof = session.proofs[0];
  const authorName = session.author.first_name || session.author.username || "Membre";

  // Les autres défis où la même séance a été publiée (elle est dupliquée par
  // `shared_id`) — sans celui qu'on est en train de regarder.
  const otherGroups = (shared ?? []).filter((g) => g.groupId !== session.group_id);

  const nameOf = (userId: string) => {
    const member = members?.find((m) => m.user.id === userId);
    return member?.user.first_name || member?.user.username || "Un membre";
  };

  const yes = (votes ?? []).filter((v) => v.value);
  const no = (votes ?? []).filter((v) => !v.value);

  return (
    <View className="gap-3.5 pb-1">
      {/* Statut + auteur */}
      <View className="flex-row items-center gap-3">
        <Avatar
          uri={session.author.avatar_url}
          color={session.author.avatar_color}
          icon={session.author.avatar_icon}
          seed={session.author.id}
          name={`${session.author.first_name ?? ""} ${session.author.last_name ?? ""}`.trim()}
          size={38}
        />
        <View className="flex-1">
          <Text className="font-body-bold text-[13.5px] text-cream">{authorName}</Text>
          <Text className="mt-0.5 font-body text-[11.5px] text-cream-dim">
            déclarée le {formatDbDate(session.published_at ?? session.performed_at)}
          </Text>
        </View>
        <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: status.soft }}>
          <Text className="font-body-bold text-[11px]" style={{ color: status.tint }}>
            {status.label}
          </Text>
        </View>
      </View>

      {/* Ce qui a été saisi */}
      <View className="flex-row gap-2.5">
        <Stat icon={Clock} label="Durée" value={formatDuration(session.duration_min)} />
        <Stat icon={CalendarDays} label="Réalisée le" value={formatDbDate(session.performed_at)} />
      </View>

      {session.comment ? (
        <View
          className="flex-row gap-2.5 rounded-[14px] border p-3"
          style={{ backgroundColor: colors.ink2, borderColor: colors.line }}
        >
          <MessageSquare size={15} color={colors.creamDim} />
          <Text className="flex-1 font-body text-[12.5px] leading-[18px] text-cream">
            {session.comment}
          </Text>
        </View>
      ) : null}

      <Proof proof={proof} />

      {/* Vote */}
      <View
        className="rounded-[14px] border p-3.5"
        style={{ backgroundColor: colors.surface2, borderColor: colors.line }}
      >
        <View className="flex-row items-center gap-2">
          <Timer size={15} color={colors.creamDim} />
          <Text className="flex-1 font-body-bold text-[12px] uppercase tracking-label text-cream-dim">
            Vote du groupe
          </Text>
          <Text className="font-body-bold text-[12.5px]" style={{ color: colors.mint }}>
            {yes.length} pour
          </Text>
          <Text className="font-body-bold text-[12.5px]" style={{ color: colors.red }}>
            {no.length} contre
          </Text>
        </View>

        {votes && votes.length > 0 ? (
          <View className="mt-2.5 gap-2">
            {votes.map((v) => (
              <View key={v.voterId} className="gap-0.5">
                <View className="flex-row items-center gap-2">
                  {v.value ? (
                    <Check size={13} color={colors.mint} strokeWidth={3} />
                  ) : (
                    <XIcon size={13} color={colors.red} strokeWidth={3} />
                  )}
                  <Text className="font-body text-[12px] text-cream-dim">{nameOf(v.voterId)}</Text>
                </View>
                {/* Commentaire du votant : surtout utile sur un refus (l'auteur
                    veut savoir pourquoi). Pour un refus sans mot, on le dit
                    explicitement plutôt que de laisser un vide ambigu. */}
                {v.comment ? (
                  <Text
                    className="ml-5 font-body text-[11.5px] leading-[16px] text-cream"
                    style={{ fontStyle: "italic" }}
                  >
                    « {v.comment} »
                  </Text>
                ) : !v.value ? (
                  <Text className="ml-5 font-body text-[11px] text-cream-dim">
                    Sans commentaire
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <Text className="mt-1.5 font-body text-[11.5px] text-cream-dim">
            {session.status === "pending_vote"
              ? "Personne n'a encore voté."
              : "Aucun vote n'a été enregistré."}
          </Text>
        )}
      </View>

      {/* Vote DISCRET : un lien sobre (coral-soft), pas un gros bouton — l'action
          « voter » principale vit dans l'onglet « À voter » du groupe. Ici on l'offre
          juste au cas où on tombe sur la séance d'un autre pas encore votée (retour Romain). */}
      {canVote ? (
        <Pressable
          onPress={goVote}
          accessibilityRole="button"
          accessibilityLabel="Voter cette séance"
          className="flex-row items-center justify-center gap-2 rounded-[13px] border py-2.5 active:opacity-80"
          style={{ borderColor: "rgba(255,106,69,0.35)", backgroundColor: colors.coralSoft }}
        >
          <Vote size={14} color={colors.coral} strokeWidth={2.4} />
          <Text className="font-body-bold text-[12.5px] text-coral">Voter cette séance</Text>
        </Pressable>
      ) : null}

      {/* Où elle compte aussi */}
      {otherGroups.length > 0 ? (
        <View className="flex-row items-start gap-2.5 px-0.5">
          <Layers size={15} color={colors.creamDim} />
          <Text className="flex-1 font-body text-[11.5px] leading-4 text-cream-dim">
            Cette séance compte aussi dans {otherGroups.map((g) => g.name).join(", ")}.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <View
      className="flex-1 rounded-[14px] border p-3"
      style={{ backgroundColor: colors.surface2, borderColor: colors.line }}
    >
      <View className="flex-row items-center gap-1.5">
        <Icon size={13} color={colors.creamDim} />
        <Text className="font-body-bold text-[10px] uppercase tracking-eyebrow text-cream-dim">
          {label}
        </Text>
      </View>
      <Text className="mt-1 font-display text-[16px] tracking-tight text-cream">{value}</Text>
    </View>
  );
}

/** Preuve : photo (agrandissable), résumé Strava ou lien externe. */
function Proof({ proof }: { proof: SessionWithAuthor["proofs"][number] | undefined }) {
  const [zoom, setZoom] = useState(false);
  const photoPath =
    proof && (proof.proof_type === "photo" || proof.proof_type === "external_link")
      ? proof.media_url
      : null;
  const { data: signedUrl, isLoading } = useProofSignedUrl(photoPath);

  const strava =
    proof?.proof_type === "strava"
      ? (proof.strava_data as { distance_m?: number; moving_time_s?: number } | null)
      : null;

  if (!proof) {
    return (
      <Text className="px-0.5 font-body text-[11.5px] text-cream-dim">
        Aucune preuve enregistrée pour cette séance.
      </Text>
    );
  }

  if (strava) {
    return (
      <LinearGradient
        colors={["rgba(255,106,69,0.28)", "rgba(255,106,69,0.05)"]}
        style={{ borderRadius: 16, padding: 14 }}
      >
        <Text className="font-body-bold text-[10px] uppercase tracking-eyebrow text-cream-dim">
          Preuve Strava
        </Text>
        <View className="mt-2 flex-row gap-6">
          <View>
            <Text className="font-display text-[18px] tracking-tight text-cream">
              {strava.distance_m ? `${(strava.distance_m / 1000).toFixed(1)} km` : "—"}
            </Text>
            <Text className="font-body text-[10.5px] text-cream-dim">distance</Text>
          </View>
          <View>
            <Text className="font-display text-[18px] tracking-tight text-cream">
              {strava.moving_time_s ? formatDuration(strava.moving_time_s / 60) : "—"}
            </Text>
            <Text className="font-body text-[10.5px] text-cream-dim">durée</Text>
          </View>
        </View>
      </LinearGradient>
    );
  }

  if (photoPath) {
    return (
      <View className="overflow-hidden rounded-[16px] border" style={{ borderColor: colors.line2 }}>
        {signedUrl ? (
          <Pressable onPress={() => setZoom(true)} accessibilityLabel="Agrandir la photo">
            <Image source={{ uri: signedUrl }} style={{ width: "100%", height: 200 }} />
          </Pressable>
        ) : (
          <View
            className="h-[200px] items-center justify-center"
            style={{ backgroundColor: colors.surface2 }}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.coral} />
            ) : (
              <Text className="font-body text-[12px] text-cream-dim">Photo indisponible</Text>
            )}
          </View>
        )}

        {proof.latitude != null && proof.longitude != null ? (
          <View
            className="absolute bottom-3 left-3 flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
          >
            <MapPin size={12} color={colors.coral} />
            <Text className="font-body-semibold text-[11px] text-cream">Position vérifiée</Text>
          </View>
        ) : null}

        {proof.captured_at ? (
          <View
            className="absolute right-3 top-3 rounded-full px-2.5 py-1.5"
            style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
          >
            <Text className="font-body-semibold text-[11px] text-cream">
              Prise le {formatDbDate(proof.captured_at)}
            </Text>
          </View>
        ) : null}

        <Modal
          visible={zoom}
          transparent
          animationType="fade"
          onRequestClose={() => setZoom(false)}
        >
          <Pressable
            onPress={() => setZoom(false)}
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center" }}
          >
            {signedUrl ? (
              <Image
                source={{ uri: signedUrl }}
                style={{ width: "100%", height: "80%" }}
                contentFit="contain"
              />
            ) : null}
          </Pressable>

          {/* Croix de fermeture explicite (en plus du tap n'importe où). En overlay,
              hors du Pressable plein écran, avec sa propre zone tactile. */}
          <Pressable
            onPress={() => setZoom(false)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Fermer le plein écran"
            style={{
              position: "absolute",
              top: 48,
              right: 20,
              height: 40,
              width: 40,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 20,
              backgroundColor: "rgba(0,0,0,0.55)",
            }}
          >
            <XIcon size={22} color={colors.cream} strokeWidth={2.4} />
          </Pressable>
        </Modal>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => proof.external_url && Linking.openURL(proof.external_url)}
      disabled={!proof.external_url}
      className="flex-row items-center gap-2.5 rounded-[14px] border p-3.5 active:opacity-80"
      style={{ backgroundColor: colors.surface2, borderColor: colors.line }}
    >
      <ExternalLink size={16} color={colors.coral} />
      <Text className="flex-1 font-body-semibold text-[12.5px] text-cream">
        {proof.external_url ? "Ouvrir la preuve" : "Preuve externe (lien manquant)"}
      </Text>
    </Pressable>
  );
}
