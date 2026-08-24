import { useEffect, useRef } from "react";
import {
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Animated, {
  FadeIn,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";

import { colors } from "@/constants/colors";

/** Marge horizontale de l'écran d'accueil (px-[18px]). */
const PAGE_PADDING = 18;
/** Espace entre deux cartes. */
const GAP = 12;

type Props<T> = {
  items: T[];
  index: number;
  onIndexChange: (index: number) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Libellé de chaque page, affiché à côté des points (nom du groupe). */
  labelFor: (item: T) => string;
};

/**
 * Carrousel horizontal des défis de l'accueil.
 *
 * Une seule carte est visible à la fois et l'aimantation (`snapToInterval`) la
 * cale pile dans les marges de l'écran. Les points suivent le doigt **en
 * continu** : ils s'étirent et se colorent au fil du glissement.
 *
 * Un seul défi → ni carrousel ni points : on rend la carte telle quelle.
 */
export function GroupCarousel<T>({
  items,
  index,
  onIndexChange,
  renderItem,
  labelFor,
}: Props<T>) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);

  const cardWidth = Math.max(240, width - PAGE_PADDING * 2);
  const interval = cardWidth + GAP;

  // Position continue en « pages » (1.5 = pile entre la 2ᵉ et la 3ᵉ carte).
  const page = useSharedValue(index);
  // Dernière page annoncée au parent. Sert aussi à distinguer un changement
  // d'index VENU DU GESTE (rien à faire) d'un changement venu de l'extérieur
  // (liste rechargée, groupe supprimé → il faut recaler le scroll).
  const settled = useRef(index);
  const aligned = useRef(false);

  useEffect(() => {
    if (aligned.current && settled.current === index) return;
    aligned.current = true;
    settled.current = index;
    page.value = index;
    scrollRef.current?.scrollTo({ x: index * interval, animated: false });
  }, [index, interval, page]);

  if (items.length === 0) return null;
  if (items.length === 1) return <>{renderItem(items[0], 0)}</>;

  // `onMomentumScrollEnd` ne se déclenche PAS sur le web (molette, trackpad) :
  // les points et le nom du défi restaient collés au premier groupe. On suit
  // donc la position brute, qui elle est émise partout.
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    page.value = x / interval;

    const next = Math.min(Math.max(Math.round(x / interval), 0), items.length - 1);
    if (next !== settled.current) {
      settled.current = next;
      onIndexChange(next);
    }
  };

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={interval}
        snapToAlignment="start"
        disableIntervalMomentum
        onScroll={onScroll}
        scrollEventThrottle={16}
        // Le conteneur déborde volontairement des marges de l'écran : la carte
        // suivante ne doit pas être coupée par le padding du parent.
        style={{ marginHorizontal: -PAGE_PADDING }}
        contentContainerStyle={{ paddingHorizontal: PAGE_PADDING }}
      >
        {items.map((item, i) => (
          <View
            key={i}
            style={{ width: cardWidth, marginRight: i === items.length - 1 ? 0 : GAP }}
          >
            {renderItem(item, i)}
          </View>
        ))}
      </ScrollView>

      <View className="mt-3 flex-row items-center justify-center gap-2">
        {items.map((_, i) => (
          <Dot key={i} i={i} page={page} />
        ))}
        {/* Remonté au changement de page : le nom apparaît en fondu plutôt que
            de se substituer sèchement au précédent. */}
        <Animated.View key={index} entering={FadeIn.duration(220)} className="ml-1.5 max-w-[45%]">
          <Text numberOfLines={1} className="font-body-semibold text-[11.5px] text-cream-dim">
            {labelFor(items[index])} · {index + 1}/{items.length}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

/** Point de pagination : suit le glissement en continu (largeur + couleur). */
function Dot({ i, page }: { i: number; page: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const near = 1 - Math.min(Math.abs(page.value - i), 1);
    return {
      width: 6 + near * 14,
      opacity: 0.4 + near * 0.6,
      backgroundColor: interpolateColor(near, [0, 1], [colors.creamDim, colors.coral]),
    };
  });

  return <Animated.View style={[{ height: 6, borderRadius: 3 }, style]} />;
}
