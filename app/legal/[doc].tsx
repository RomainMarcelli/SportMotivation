import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, ChevronDown, ChevronLeft, Clock3, FileWarning } from "lucide-react-native";
import { useState } from "react";
import { LayoutAnimation, Platform, Pressable, ScrollView, Text, UIManager, View } from "react-native";

import { AppBackground } from "@/components/ui/AppBackground";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { colors } from "@/constants/colors";
import { getLegalDoc, readingMinutes, type LegalSection } from "@/constants/legal";
import { useAppReducedMotion } from "@/hooks/useAppReducedMotion";

const TONES = {
  coral: { soft: colors.coralSoft, strong: colors.coral },
  amber: { soft: colors.amberSoft, strong: colors.amber },
  mint: { soft: colors.mintSoft, strong: colors.mint },
} as const;

// Le dépliage animé d'Android demande cette autorisation explicite.
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Aide, conditions d'utilisation et politique de confidentialité.
 *
 * Un seul écran paramétré : les trois documents partagent la même charpente.
 * L'aide s'affiche en **questions repliées** (on ouvre celle qui nous concerne)
 * et les textes légaux en **lecture continue**, précédés de « l'essentiel » —
 * personne ne lit une politique de confidentialité en entier, autant dire tout
 * de suite ce qui compte.
 */
export default function LegalScreen() {
  const router = useRouter();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const content = getLegalDoc(doc);

  return (
    <View className="flex-1">
      <AppBackground />
      <ScreenContainer transparent padded={false} edges={["top"]}>
        <View
          className="flex-row items-center gap-2 px-[18px] pb-3 pt-1"
          style={{ backgroundColor: colors.ink }}
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityLabel="Retour"
            className="h-10 w-10 items-center justify-center rounded-chip active:opacity-70"
          >
            <ChevronLeft size={24} color={colors.cream} strokeWidth={2.2} />
          </Pressable>
          <Text
            numberOfLines={1}
            className="flex-1 font-display text-[20px] tracking-tighter text-cream"
          >
            {content?.title ?? "Document"}
          </Text>
        </View>

        {!content ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-center font-body text-[14px] text-cream-dim">
              Ce document n'existe pas.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 48 }}
            showsVerticalScrollIndicator={false}
          >
            <Reveal delay={0}>
              <View className="flex-row items-center gap-2">
                <Clock3 size={13} color={colors.creamDim} />
                <Text className="font-body text-[11.5px] text-cream-dim">
                  {readingMinutes(content)} min de lecture
                </Text>
              </View>
              <Text className="mt-2 font-body text-[13.5px] leading-[20px] text-cream-dim">
                {content.intro}
              </Text>
            </Reveal>

            {content.highlights ? (
              <Reveal delay={50}>
                <View
                  className="mt-4 rounded-[18px] border p-4"
                  style={{ backgroundColor: colors.surface, borderColor: colors.line2 }}
                >
                  <Text className="font-body-bold text-[10.5px] tracking-eyebrow text-cream-dim">
                    L'ESSENTIEL
                  </Text>
                  <View className="mt-3 gap-2.5">
                    {content.highlights.map((line) => (
                      <View key={line} className="flex-row items-start gap-2.5">
                        <View
                          className="mt-0.5 h-[18px] w-[18px] items-center justify-center rounded-full"
                          style={{ backgroundColor: colors.mintSoft }}
                        >
                          <Check size={11} color={colors.mint} strokeWidth={3} />
                        </View>
                        <Text className="flex-1 font-body-semibold text-[13px] leading-[19px] text-cream">
                          {line}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Reveal>
            ) : null}

            {content.draft ? (
              <Reveal delay={90}>
                <View
                  className="mt-3 flex-row items-start gap-2.5 rounded-[14px] border p-3.5"
                  style={{ backgroundColor: colors.amberSoft, borderColor: "rgba(255,178,62,0.3)" }}
                >
                  <FileWarning size={17} color={colors.amber} />
                  <Text className="flex-1 font-body text-[12px] leading-[17px] text-cream-dim">
                    Texte provisoire, écrit pour que l'application soit complète. Il doit être
                    remplacé par une version relue avant toute mise en ligne publique.
                  </Text>
                </View>
              </Reveal>
            ) : null}

            <View className="mt-3 gap-2.5">
              {content.sections.map((section, index) =>
                content.layout === "accordion" ? (
                  <Reveal key={section.heading} delay={110 + index * 40}>
                    <AccordionRow section={section} />
                  </Reveal>
                ) : (
                  <Reveal key={section.heading} delay={110 + index * 40}>
                    <ArticleRow section={section} index={index} />
                  </Reveal>
                )
              )}
            </View>
          </ScrollView>
        )}
      </ScreenContainer>
    </View>
  );
}

/** Question repliée (Centre d'aide). */
function AccordionRow({ section }: { section: LegalSection }) {
  const reduceMotion = useAppReducedMotion();
  const [open, setOpen] = useState(false);
  const tone = TONES[section.tone];
  const Icon = section.icon;

  const toggle = () => {
    if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((value) => !value);
  };

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      className="rounded-[16px] border p-3.5 active:opacity-90"
      style={{ backgroundColor: colors.surface, borderColor: open ? colors.line2 : colors.line }}
    >
      <View className="flex-row items-center gap-3">
        <View
          className="h-9 w-9 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: tone.soft }}
        >
          <Icon size={17} color={tone.strong} strokeWidth={2} />
        </View>
        <Text className="flex-1 font-body-bold text-[13.5px] leading-[19px] text-cream">
          {section.heading}
        </Text>
        <Chevron open={open} />
      </View>

      {open ? (
        <Text className="mt-3 font-body text-[13px] leading-[20px] text-cream-dim">
          {section.body}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** Chevron qui pivote à l'ouverture. */
function Chevron({ open }: { open: boolean }) {
  return (
    <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
      <ChevronDown size={17} color={colors.creamDim} />
    </View>
  );
}

/** Section de lecture continue (textes légaux), numérotée. */
function ArticleRow({ section, index }: { section: LegalSection; index: number }) {
  const tone = TONES[section.tone];
  const Icon = section.icon;

  return (
    <View
      className="rounded-[16px] border p-4"
      style={{ backgroundColor: colors.surface, borderColor: colors.line2 }}
    >
      <View className="flex-row items-center gap-3">
        <View
          className="h-9 w-9 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: tone.soft }}
        >
          <Icon size={17} color={tone.strong} strokeWidth={2} />
        </View>
        <View className="flex-1">
          <Text className="font-body-bold text-[10px] tracking-eyebrow text-cream-dim">
            ARTICLE {index + 1}
          </Text>
          <Text className="mt-0.5 font-display text-[15px] tracking-tight text-cream">
            {section.heading}
          </Text>
        </View>
      </View>
      <Text className="mt-3 font-body text-[13px] leading-[21px] text-cream-dim">
        {section.body}
      </Text>
    </View>
  );
}
