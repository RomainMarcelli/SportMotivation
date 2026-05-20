import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getOnboardingCompleted,
  resetOnboarding,
  setOnboardingCompleted,
} from "../onboarding-state";

describe("onboarding-state", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("retourne false quand aucun flag n'est posé", async () => {
    expect(await getOnboardingCompleted()).toBe(false);
  });

  it("retourne true après setOnboardingCompleted", async () => {
    await setOnboardingCompleted();
    expect(await getOnboardingCompleted()).toBe(true);
  });

  it("retourne false après resetOnboarding", async () => {
    await setOnboardingCompleted();
    await resetOnboarding();
    expect(await getOnboardingCompleted()).toBe(false);
  });
});
