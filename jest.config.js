/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest-setup.ts"],
  // Les tests E2E Playwright (e2e/*.spec.ts) tournent avec leur propre runner,
  // pas Jest : sans ça, jest-expo les ramasserait (il matche aussi `*.spec.ts`).
  testPathIgnorePatterns: ["/node_modules/", "/e2e/"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|nativewind|react-native-css-interop|react-native-svg|@supabase/.*|lucide-react-native))",
  ],
  collectCoverageFrom: [
    "features/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "hooks/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/__tests__/**",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};
