import { Pressable, Text, View } from "react-native";
import { Minus, Plus } from "lucide-react-native";

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
};

export function Stepper({ value, onChange, min = 0, max = 999, step = 1, suffix }: Props) {
  const decrement = () => onChange(Math.max(min, value - step));
  const increment = () => onChange(Math.min(max, value + step));

  return (
    <View className="flex-row items-center gap-3">
      <StepperButton onPress={decrement} disabled={value <= min}>
        <Minus size={18} color="#3b82f6" />
      </StepperButton>
      <View className="min-w-[64px] items-center">
        <Text className="text-lg font-semibold text-neutral-900 dark:text-white">
          {value}
          {suffix ? <Text className="text-sm text-neutral-500"> {suffix}</Text> : null}
        </Text>
      </View>
      <StepperButton onPress={increment} disabled={value >= max}>
        <Plus size={18} color="#3b82f6" />
      </StepperButton>
    </View>
  );
}

function StepperButton({
  onPress,
  disabled,
  children,
}: {
  onPress: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`h-10 w-10 items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-700 ${
        disabled ? "opacity-30" : "active:bg-neutral-100 dark:active:bg-neutral-800"
      }`}
    >
      {children}
    </Pressable>
  );
}
