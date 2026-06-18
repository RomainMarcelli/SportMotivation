import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Dimensions, type LayoutChangeEvent, Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  CagnotteIllustration,
  EngagementIllustration,
  RewardIllustration,
  StageGlow,
} from "@/components/auth/OnboardingIllustrations";
import { BrandMark } from "@/components/ui/BrandMark";
import { GradientButton } from "@/components/ui/GradientButton";
import { Reveal } from "@/components/ui/Reveal";
import { colors } from "@/constants/colors";
import { fontFamily } from "@/constants/fonts";
import { setOnboardingCompleted } from "@/lib/onboarding-state";

type Slide = {
  illustration: ReactNode;
  /** Overlay animé optionnel (ex. pièce qui tombe pour la cagnotte). */
  animated?: boolean;
  title: string;
  description: string;
};

const SLIDES: Slide[] = [
  {
    illustration: <EngagementIllustration />,
    title: "Bougez à plusieurs",
    description:
      "Lancez un défi sportif avec vos amis et tenez vos objectifs grâce à l'engagement du groupe.",
  },
  {
    illustration: <CagnotteIllustration hideTopCoin />,
    animated: true,
    title: "Chaque séance compte",
    description:
      "Une séance manquée ? Une petite pénalité tombe dans la cagnotte commune. De quoi rester motivé toute la semaine.",
  },
  {
    illustration: <RewardIllustration />,
    title: "La récompense, ensemble",
    description:
      "À la fin du défi, la cagnotte finance une sortie de groupe. L'effort de chacun, le plaisir de tous.",
  },
];

const LAST = SLIDES.length - 1;

export default function OnboardingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();

  const tx = useSharedValue(0); // translateX du track (négatif = slides suivants)
  const startTx = useSharedValue(0);
  const pageW = useSharedValue(Dimensions.get("window").width);
  const [index, setIndex] = useState(0);
  const [carousel, setCarousel] = useState({ width: 0, height: 0 });

  const isLast = index === LAST;

  const onCarouselLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    pageW.value = w;
    tx.value = -index * w; // garde le slide courant aligné (resize / rotation)
    setCarousel({ width: w, height: h });
  };

  // Glisser (souris web + tactile natif) → snap par page. Mémoïsé (deps = shared values stables) :
  // recréer le Gesture à chaque rendu le ré-attache et fige le drag après le 1er slide.
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-12, 12])
        .onBegin(() => {
          startTx.value = tx.value;
        })
        .onUpdate((e) => {
          const w = pageW.value || 1;
          tx.value = Math.min(Math.max(startTx.value + e.translationX, -LAST * w), 0);
        })
        .onEnd((e) => {
          const w = pageW.value || 1;
          const from = Math.round(-startTx.value / w);
          let page = from;
          const threshold = w * 0.18;
          if (e.translationX <= -threshold || e.velocityX <= -500) page = from + 1;
          else if (e.translationX >= threshold || e.velocityX >= 500) page = from - 1;
          page = Math.min(Math.max(page, 0), LAST);
          tx.value = withTiming(-page * w, { duration: 280, easing: Easing.out(Easing.cubic) });
          runOnJS(setIndex)(page);
        }),
    // shared values & setIndex sont stables
    [pageW, startTx, tx],
  );

  const trackStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));

  const finish = async (target: "/sign-in" | "/sign-up") => {
    await setOnboardingCompleted();
    queryClient.invalidateQueries({ queryKey: ["onboarding-completed"] });
    router.replace(target);
  };

  const goTo = (i: number) => {
    const clamped = Math.max(0, Math.min(LAST, i));
    tx.value = withTiming(-clamped * (carousel.width || 1), {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
    setIndex(clamped);
  };

  const handleNext = () => {
    if (isLast) finish("/sign-up");
    else goTo(index + 1);
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1">
      {/* Topbar fixe */}
      <Reveal className="h-12 w-full flex-row items-center justify-between px-[18px]">
        <View className="flex-row items-center gap-2">
          <BrandMark size={30} />
          <Text className="font-display text-[16px] tracking-tighter text-cream">
            Sport<Text className="text-coral">Motiv</Text>
          </Text>
        </View>
        <Pressable
          onPress={() => finish("/sign-up")}
          hitSlop={10}
          disabled={isLast}
          style={{ opacity: isLast ? 0 : 1 }}
          className="rounded-full border border-line bg-surface-2 px-3 py-1.5"
        >
          <Text className="font-body-semibold text-[12.5px] text-cream-dim">Passer</Text>
        </Pressable>
      </Reveal>

      {/* Carrousel : track glissable (souris web + tactile natif) */}
      <View className="flex-1 overflow-hidden" onLayout={onCarouselLayout}>
        <GestureDetector gesture={pan}>
          <Animated.View
            style={[{ flexDirection: "row", height: carousel.height || "100%" }, trackStyle]}
          >
            {SLIDES.map((slide, i) => (
              <SlideView
                key={i}
                slide={slide}
                width={carousel.width}
                height={carousel.height}
                active={i === index}
                reduceMotion={reduceMotion}
              />
            ))}
          </Animated.View>
        </GestureDetector>
      </View>

      {/* Footer FIXE : dots + CTA + lien connexion (hors carrousel) */}
      <Reveal delay={120} className="w-full px-[22px] pb-8 pt-1">
        <View className="mb-5 flex-row items-center justify-center gap-2">
          {SLIDES.map((_, i) => (
            <Dot key={i} i={i} tx={tx} pageW={pageW} onPress={() => goTo(i)} />
          ))}
        </View>

        <GradientButton onPress={handleNext} iconRight={ArrowRight}>
          {isLast ? "C'est parti" : "Suivant"}
        </GradientButton>

        <Pressable onPress={() => finish("/sign-in")} className="items-center pt-5" hitSlop={8}>
          <Text className="font-body text-[12.5px] text-cream-dim">
            Tu as déjà un compte ? <Text className="font-body-bold text-coral">Se connecter</Text>
          </Text>
        </Pressable>
      </Reveal>
    </SafeAreaView>
  );
}

function SlideView({
  slide,
  width,
  height,
  active,
  reduceMotion,
}: {
  slide: Slide;
  width: number;
  height: number;
  active: boolean;
  reduceMotion: boolean;
}) {
  return (
    <View style={{ width, height: height || undefined }} className="justify-center px-[22px]">
      {/* Stage : carte 252 px, halo interne, illustration clippée dedans */}
      <View
        className="overflow-hidden rounded-hero border border-line-2 bg-surface"
        style={{ height: 252, alignItems: "center", justifyContent: "center" }}
      >
        <StageGlow />
        <View style={{ width: "86%", maxWidth: 280, aspectRatio: 280 / 210 }}>
          {slide.illustration}
          {slide.animated ? <CagnotteAnimation active={active} reduceMotion={reduceMotion} /> : null}
        </View>
      </View>

      <Text className="mt-7 text-center font-display text-[26px] tracking-tighter text-cream">
        {slide.title}
      </Text>
      <Text
        className="mt-3 text-center font-body text-[14px] text-cream-dim"
        style={{ lineHeight: 22 }}
      >
        {slide.description}
      </Text>
    </View>
  );
}

const COIN_CYCLE = 1600;

/** Overlay animé du slide cagnotte : une pièce tombe dans le bocal + total qui monte. */
function CagnotteAnimation({ active, reduceMotion }: { active: boolean; reduceMotion: boolean }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [total, setTotal] = useState(0);
  const t = useSharedValue(0);

  useEffect(() => {
    if (!active || reduceMotion || box.h === 0) {
      cancelAnimation(t);
      t.value = 0;
      return;
    }
    t.value = 0;
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.in(Easing.cubic) }),
        withDelay(COIN_CYCLE - 900, withTiming(1, { duration: 0 })),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(t);
  }, [active, reduceMotion, box.h, t]);

  useEffect(() => {
    if (!active || reduceMotion) return;
    const id = setInterval(() => setTotal((v) => (v >= 50 ? 5 : v + 5)), COIN_CYCLE);
    return () => clearInterval(id);
  }, [active, reduceMotion]);

  const size = box.w * 0.1;
  const startY = box.h * 0.02;
  const endY = box.h * 0.3;

  const coinStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.08, 0.7, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(
          t.value,
          [0, 0.8, 0.9, 1],
          [startY, endY, endY - box.h * 0.025, endY],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const displayTotal = reduceMotion ? 25 : total;

  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {!reduceMotion && box.w > 0 ? (
        <Animated.View
          style={[
            {
              position: "absolute",
              left: box.w / 2 - size / 2,
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: "#FFC65C",
              alignItems: "center",
              justifyContent: "center",
            },
            coinStyle,
          ]}
        >
          <Text style={{ fontFamily: fontFamily.displayExtrabold, color: "#2a1505", fontSize: size * 0.5 }}>
            €
          </Text>
        </Animated.View>
      ) : null}

      {/* Total cagnotte (bas du bocal) */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center" }}>
        <View className="flex-row items-center rounded-full bg-amber-soft px-2.5 py-1">
          <Text className="font-display text-[13px] text-amber">{displayTotal} €</Text>
        </View>
      </View>
    </View>
  );
}

function Dot({
  i,
  tx,
  pageW,
  onPress,
}: {
  i: number;
  tx: SharedValue<number>;
  pageW: SharedValue<number>;
  onPress: () => void;
}) {
  const style = useAnimatedStyle(() => {
    const w = pageW.value || 1;
    const pos = -tx.value;
    const inputRange = [(i - 1) * w, i * w, (i + 1) * w];
    return {
      width: interpolate(pos, inputRange, [8, 24, 8], Extrapolation.CLAMP),
      backgroundColor: interpolateColor(pos, inputRange, [
        colors.surface2,
        colors.coral,
        colors.surface2,
      ]),
    };
  });
  return (
    <Pressable onPress={onPress} hitSlop={10}>
      <Animated.View style={[{ height: 8, borderRadius: 999 }, style]} />
    </Pressable>
  );
}
