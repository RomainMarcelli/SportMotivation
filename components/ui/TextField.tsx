import { Eye, EyeOff, type LucideIcon } from "lucide-react-native";
import { forwardRef, useState } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";

import { colors } from "@/constants/colors";
import { fontFamily } from "@/constants/fonts";

type Props = TextInputProps & {
  label?: string;
  error?: string;
  /** Icône lucide affichée à gauche du champ. */
  icon?: LucideIcon;
};

/**
 * Champ de saisie DA : label optionnel, icône à gauche, états focus/erreur, et
 * œil afficher/masquer automatique quand `secureTextEntry` est passé.
 * Compatible react-hook-form (forwardRef + passthrough de `onBlur`).
 */
export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, icon: Icon, secureTextEntry, onFocus, onBlur, style, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const isPassword = !!secureTextEntry;

  const borderColor = error ? colors.red : focused ? colors.coral : colors.line;
  const backgroundColor = focused ? colors.surface2 : colors.surface;

  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text className="font-body-bold uppercase text-cream-dim tracking-label text-[12px]">
          {label}
        </Text>
      ) : null}

      <View style={{ position: "relative", justifyContent: "center" }}>
        {Icon ? (
          <View style={{ position: "absolute", left: 14, zIndex: 1 }} pointerEvents="none">
            <Icon size={18} color={colors.creamDim} />
          </View>
        ) : null}

        <TextInput
          ref={ref}
          placeholderTextColor="rgba(183,161,139,0.6)"
          secureTextEntry={isPassword ? hidden : false}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            {
              minHeight: 52,
              borderRadius: 14,
              borderWidth: 1,
              borderColor,
              backgroundColor,
              color: colors.cream,
              fontFamily: fontFamily.bodyRegular,
              fontSize: 14,
              paddingVertical: 14,
              paddingLeft: Icon ? 44 : 14,
              paddingRight: isPassword ? 44 : 14,
            },
            style,
          ]}
          {...rest}
        />

        {isPassword ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Afficher le mot de passe" : "Masquer le mot de passe"}
            style={{ position: "absolute", right: 12, padding: 4 }}
          >
            {hidden ? (
              <EyeOff size={18} color={colors.creamDim} />
            ) : (
              <Eye size={18} color={colors.creamDim} />
            )}
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text className="font-body-medium text-red text-[12px]">{error}</Text>
      ) : null}
    </View>
  );
});
