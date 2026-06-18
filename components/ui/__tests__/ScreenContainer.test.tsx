import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ScreenContainer } from "../ScreenContainer";

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

describe("ScreenContainer", () => {
  it("rend ses enfants", () => {
    render(
      <SafeAreaProvider initialMetrics={metrics}>
        <ScreenContainer>
          <Text>Contenu écran</Text>
        </ScreenContainer>
      </SafeAreaProvider>
    );
    expect(screen.getByText("Contenu écran")).toBeTruthy();
  });
});
