import { Check, Layers, Lock } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import type { MyGroup } from "@/features/groups/queries";

type Props = {
  groups: MyGroup[];
  /** Défi d'où part la déclaration : toujours inclus, non décochable. */
  originGroupId: string;
  /** Identifiants cochés (l'origine comprise). */
  selected: string[];
  onToggle: (groupId: string) => void;
};

/**
 * « Où compte cette séance ? »
 *
 * Une séance réelle compte dans tous les défis en cours — mais pas toujours :
 * une sortie vélo n'a rien à faire dans un défi de musculation. Tout est coché
 * par défaut, chacun décoche ce qui ne le concerne pas.
 *
 * Le défi d'origine est verrouillé : c'est celui depuis lequel on déclare, la
 * séance y est créée avant d'être recopiée ailleurs.
 *
 * Un seul défi → rien à afficher, il n'y a pas de choix à faire.
 */
export function SessionScopePicker({ groups, originGroupId, selected, onToggle }: Props) {
  if (groups.length < 2) return null;

  const count = selected.length;

  return (
    <View
      className="overflow-hidden rounded-[18px] border"
      style={{ backgroundColor: colors.surface, borderColor: colors.line2 }}
    >
      <View
        className="flex-row items-center gap-2.5 px-4 py-3"
        style={{ backgroundColor: colors.surface2 }}
      >
        <Layers size={16} color={colors.amber} />
        <Text className="flex-1 font-body-bold text-[10.5px] tracking-eyebrow text-cream-dim">
          OÙ COMPTE CETTE SÉANCE
        </Text>
        <View
          className="rounded-full px-2.5 py-1"
          style={{ backgroundColor: count > 0 ? colors.coralSoft : colors.redSoft }}
        >
          <Text
            className="font-body-bold text-[11px]"
            style={{ color: count > 0 ? colors.coral : colors.red }}
          >
            {count} / {groups.length}
          </Text>
        </View>
      </View>

      <View className="px-4">
        {groups.map((item, index) => {
          const groupId = item.group.id;
          const isOrigin = groupId === originGroupId;
          const checked = selected.includes(groupId);
          const last = index === groups.length - 1;

          return (
            <Pressable
              key={item.membershipId}
              onPress={() => (isOrigin ? undefined : onToggle(groupId))}
              disabled={isOrigin}
              accessibilityRole="checkbox"
              accessibilityState={{ checked, disabled: isOrigin }}
              className={`flex-row items-center gap-3 py-3 ${last ? "" : "border-b border-line"}`}
            >
              <View
                className="h-[22px] w-[22px] items-center justify-center rounded-[7px] border-2"
                style={{
                  backgroundColor: checked ? colors.coral : "transparent",
                  borderColor: checked ? colors.coral : colors.line2,
                }}
              >
                {checked ? <Check size={13} color={colors.onCoral} strokeWidth={3.2} /> : null}
              </View>

              <View className="flex-1">
                <Text numberOfLines={1} className="font-body-semibold text-[14px] text-cream">
                  {item.group.name}
                </Text>
                <Text className="mt-0.5 font-body text-[11px] text-cream-dim">
                  Objectif {item.weeklyTarget} séance{item.weeklyTarget > 1 ? "s" : ""} / sem.
                </Text>
              </View>

              {isOrigin ? (
                <View
                  className="flex-row items-center gap-1 rounded-full px-2 py-1"
                  style={{ backgroundColor: colors.surface2 }}
                >
                  <Lock size={10} color={colors.creamDim} />
                  <Text className="font-body-bold text-[10px] text-cream-dim">ce défi</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Text className="px-4 pb-3.5 pt-1 font-body text-[11.5px] leading-[16px] text-cream-dim">
        Chaque défi vote de son côté : elle peut être validée dans l'un et refusée dans l'autre.
      </Text>
    </View>
  );
}
