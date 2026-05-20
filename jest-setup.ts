import "@testing-library/jest-native/extend-expect";

// Mock AsyncStorage (utilisé par auth-store et onboarding-state)
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Mock du client Supabase : évite l'init du client realtime (WebSocket indispo sous Node)
// et donne un point d'override pour les tests d'intégration mockés.
jest.mock("@/lib/supabase", () => {
  const auth = {
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signUp: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    signInWithIdToken: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
  };
  return {
    supabase: {
      auth,
      from: jest.fn(),
      storage: { from: jest.fn() },
    },
  };
});
