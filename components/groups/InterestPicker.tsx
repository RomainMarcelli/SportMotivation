import { Check, Plus, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Chip } from "@/components/ui/Chip";
import { colors } from "@/constants/colors";
import { INTERESTS, interestIcon, interestLabel, slugInterest } from "@/constants/interests";

type Props = {
  /** Clés d'intérêt sélectionnées (stockées dans `groups.interests`). */
  value: string[];
  onChange: (value: string[]) => void;
};

/**
 * Sélecteur de centres d'intérêt (Phase 7), calqué sur `ActivityPicker` : chips du
 * catalogue + intérêts libres ajoutés, toggle ; bouton « Ajouter » ouvrant un champ
 * texte. Stocke des CLÉS (catalogue ou slug d'un intérêt libre), jamais des libellés.
 */
export function InterestPicker({ value, onChange }: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  // Liste affichée = catalogue + clés custom présentes dans `value`, dédupliquées.
  const display: string[] = [];
  const seen = new Set<string>();
  for (const key of [...INTERESTS.map((i) => i.key), ...value]) {
    if (!seen.has(key)) {
      seen.add(key);
      display.push(key);
    }
  }

  const isSelected = (key: string) => value.includes(key);

  const toggle = (key: string) => {
    if (isSelected(key)) onChange(value.filter((k) => k !== key));
    else onChange([...value, key]);
  };

  const addCustom = () => {
    const key = slugInterest(draft);
    if (!key) {
      setAdding(false);
      setDraft("");
      return;
    }
    if (!value.includes(key)) onChange([...value, key]);
    setDraft("");
    setAdding(false);
  };

  return (
    <View className="gap-2.5">
      <View className="flex-row flex-wrap gap-2">
        {display.map((key) => (
          <Chip
            key={key}
            label={interestLabel(key)}
            icon={interestIcon(key) ?? undefined}
            selected={isSelected(key)}
            onPress={() => toggle(key)}
          />
        ))}

        {/* Chip « Ajouter » (pointillé) */}
        <Pressable
          onPress={() => setAdding((a) => !a)}
          className="flex-row items-center gap-2 rounded-chip border border-dashed border-line-2 px-3.5 py-[9px] active:opacity-80"
          style={adding ? { backgroundColor: colors.coralSoft, borderColor: "rgba(255,106,69,0.4)" } : undefined}
        >
          <Plus size={16} color={adding ? colors.coral : colors.creamDim} />
          <Text
            className="font-body-semibold text-[13px]"
            style={{ color: adding ? colors.coral : colors.creamDim }}
          >
            Ajouter
          </Text>
        </Pressable>
      </View>

      {adding ? (
        <View className="flex-row items-center gap-2">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={addCustom}
            autoFocus
            placeholder="Ex. Accrobranche, Laser game…"
            placeholderTextColor="rgba(183,161,139,0.5)"
            returnKeyType="done"
            className="flex-1 rounded-input border border-line bg-surface px-3.5 py-3 font-body text-[14px] text-cream"
          />
          <Pressable
            onPress={addCustom}
            className="h-[46px] w-[48px] items-center justify-center rounded-input bg-coral active:opacity-80"
          >
            <Check size={20} color={colors.onCoral} strokeWidth={2.6} />
          </Pressable>
          <Pressable
            onPress={() => {
              setDraft("");
              setAdding(false);
            }}
            className="h-[46px] w-[46px] items-center justify-center rounded-input border border-line bg-surface active:opacity-80"
          >
            <X size={18} color={colors.creamDim} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
