import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, FlatList, Image, Text, View } from "react-native";
import { ExternalLink, Image as ImageIcon, MapPin, Zap } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { getActivityLabel } from "@/constants/activities";
import { useGroupSessions, useProofSignedUrl, type SessionWithAuthor } from "@/features/sessions/queries";
import { sessionStatusMeta } from "@/features/sessions/status";
import { formatDbDate } from "@/lib/date";

const TONE_BG: Record<string, string> = {
  amber: "bg-amber-100 dark:bg-amber-950",
  green: "bg-green-100 dark:bg-green-950",
  red: "bg-red-100 dark:bg-red-950",
  neutral: "bg-neutral-100 dark:bg-neutral-800",
};
const TONE_TEXT: Record<string, string> = {
  amber: "text-amber-700 dark:text-amber-300",
  green: "text-green-700 dark:text-green-300",
  red: "text-red-700 dark:text-red-300",
  neutral: "text-neutral-600 dark:text-neutral-300",
};

export default function SessionsFeedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: sessions, isLoading, refetch, isRefetching } = useGroupSessions(id);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-neutral-900">
      <FlatList
        data={sessions ?? []}
        keyExtractor={(s) => s.id}
        contentContainerClassName="gap-4 p-6 pb-28"
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          <Text className="mt-12 text-center text-base text-neutral-500">
            Aucune séance déclarée pour l'instant.
          </Text>
        }
        renderItem={({ item }) => <SessionCard session={item} />}
      />
      <View className="absolute inset-x-0 bottom-0 border-t border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <Button
          onPress={() => router.push({ pathname: "/group/[id]/declare", params: { id: id! } } as never)}
        >
          Déclarer une séance
        </Button>
      </View>
    </View>
  );
}

function SessionCard({ session }: { session: SessionWithAuthor }) {
  const proof = session.proofs[0];
  const meta = sessionStatusMeta(session.status);
  const author = `${session.author.first_name ?? ""} ${session.author.last_name ?? ""}`.trim();
  const { data: photoUrl } = useProofSignedUrl(proof?.media_url);

  return (
    <View className="gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-700">
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold text-neutral-900 dark:text-white">
          {author || session.author.username || "Membre"}
        </Text>
        <View className={`rounded-full px-2.5 py-1 ${TONE_BG[meta.tone]}`}>
          <Text className={`text-xs font-medium ${TONE_TEXT[meta.tone]}`}>{meta.label}</Text>
        </View>
      </View>

      <Text className="text-sm text-neutral-600 dark:text-neutral-400">
        {getActivityLabel(session.activity_type)} · {session.duration_min} min ·{" "}
        {formatDbDate(session.performed_at)}
      </Text>

      {session.comment ? (
        <Text className="text-sm text-neutral-700 dark:text-neutral-300">{session.comment}</Text>
      ) : null}

      {photoUrl ? (
        <Image source={{ uri: photoUrl }} className="h-44 w-full rounded-xl" resizeMode="cover" />
      ) : null}

      <ProofBadge proof={proof} />
    </View>
  );
}

function ProofBadge({ proof }: { proof: SessionWithAuthor["proofs"][number] | undefined }) {
  if (!proof) return null;
  const Icon =
    proof.proof_type === "strava" ? Zap : proof.proof_type === "external_link" ? ExternalLink : ImageIcon;
  const label =
    proof.proof_type === "strava"
      ? "Preuve Strava"
      : proof.proof_type === "external_link"
        ? "Lien externe"
        : "Photo";
  return (
    <View className="flex-row items-center gap-2">
      <Icon size={14} color="#94a3b8" />
      <Text className="text-xs text-neutral-400">{label}</Text>
      {proof.latitude != null && proof.longitude != null ? (
        <View className="flex-row items-center gap-1">
          <MapPin size={12} color="#94a3b8" />
          <Text className="text-xs text-neutral-400">géolocalisée</Text>
        </View>
      ) : null}
    </View>
  );
}
