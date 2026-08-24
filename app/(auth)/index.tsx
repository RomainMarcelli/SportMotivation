import { Redirect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, View } from "react-native";

import { colors } from "@/constants/colors";
import { getOnboardingCompleted } from "@/lib/onboarding-state";

export default function AuthIndex() {
  const { data, isLoading } = useQuery({
    queryKey: ["onboarding-completed"],
    queryFn: getOnboardingCompleted,
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-ink">
        <ActivityIndicator color={colors.coral} />
      </View>
    );
  }

  // Note : cast `as never` car les routes typées d'Expo Router sont régénérées par Metro.
  // En tsc standalone, /onboarding n'est pas encore connu tant que Metro ne tourne pas.
  return <Redirect href={(data ? "/sign-in" : "/onboarding") as never} />;
}
