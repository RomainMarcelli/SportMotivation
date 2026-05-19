import { Text, View } from "react-native";
import { Dumbbell } from "lucide-react-native";

import { APP_ENV, DEFAULT_TIMEZONE } from "@/constants/config";

export default function HomeScreen() {
  const hasSupabaseUrl = !!process.env.EXPO_PUBLIC_SUPABASE_URL;

  return (
    <View className="flex-1 items-center justify-center bg-white p-6 dark:bg-neutral-900">
      <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-primary-500">
        <Dumbbell size={40} color="#ffffff" />
      </View>

      <Text className="mb-2 text-3xl font-bold text-neutral-900 dark:text-white">Sport Motiv</Text>
      <Text className="mb-8 text-center text-base text-neutral-600 dark:text-neutral-400">
        Hello World — Phase 0 ✅
      </Text>

      <View className="w-full max-w-sm gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <Text className="text-sm font-semibold text-neutral-900 dark:text-white">
          État de l'environnement
        </Text>
        <Row label="Env" value={APP_ENV} />
        <Row label="Timezone" value={DEFAULT_TIMEZONE} />
        <Row label="Supabase URL" value={hasSupabaseUrl ? "configuré" : "à configurer"} />
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-xs text-neutral-500 dark:text-neutral-400">{label}</Text>
      <Text className="text-xs font-medium text-neutral-900 dark:text-white">{value}</Text>
    </View>
  );
}
