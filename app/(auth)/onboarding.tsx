import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Trophy, Users, Wallet, type LucideIcon } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { setOnboardingCompleted } from "@/lib/onboarding-state";

type Slide = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const SLIDES: Slide[] = [
  {
    icon: Users,
    title: "Du sport entre amis",
    description:
      "Réunis ton groupe d'amis autour d'un défi sportif sur plusieurs semaines. Chacun s'engage sur un nombre de séances par semaine.",
  },
  {
    icon: Wallet,
    title: "Une cagnotte commune",
    description:
      "Chaque séance manquée alimente la cagnotte du groupe. Plus de motivation, moins d'excuses.",
  },
  {
    icon: Trophy,
    title: "Tous gagnants à la fin",
    description:
      "À la fin du défi, on utilise la cagnotte pour une activité collective. Restau, sortie, weekend — vous décidez ensemble.",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(0);

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;
  const Icon = slide.icon;

  const handleNext = () => {
    if (isLast) {
      finishOnboarding("/sign-up");
    } else {
      setIndex(index + 1);
    }
  };

  const handleSkip = () => {
    finishOnboarding("/sign-in");
  };

  const finishOnboarding = async (target: "/sign-in" | "/sign-up") => {
    await setOnboardingCompleted();
    queryClient.invalidateQueries({ queryKey: ["onboarding-completed"] });
    router.replace(target);
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-900">
      <View className="flex-1 px-6 py-4">
        <View className="flex-row justify-end">
          <Text
            className="text-sm font-medium text-neutral-500 dark:text-neutral-400"
            onPress={handleSkip}
          >
            J'ai déjà un compte
          </Text>
        </View>

        <View className="flex-1 items-center justify-center">
          <View className="mb-10 h-28 w-28 items-center justify-center rounded-full bg-primary-500">
            <Icon size={56} color="#ffffff" />
          </View>
          <Text className="mb-4 text-center text-3xl font-bold text-neutral-900 dark:text-white">
            {slide.title}
          </Text>
          <Text className="text-center text-base leading-6 text-neutral-600 dark:text-neutral-400">
            {slide.description}
          </Text>
        </View>

        <View className="mb-6 flex-row justify-center gap-2">
          {SLIDES.map((_, i) => (
            <View
              key={i}
              className={`h-2 w-2 rounded-full ${
                i === index ? "bg-primary-500" : "bg-neutral-300 dark:bg-neutral-700"
              }`}
            />
          ))}
        </View>

        <Button onPress={handleNext}>{isLast ? "Commencer" : "Suivant"}</Button>
      </View>
    </SafeAreaView>
  );
}
