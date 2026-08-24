import { defineConfig, devices } from "@playwright/test";

// Port DÉDIÉ aux tests (≠ 8081 du serveur de dev) : on n'interfère pas avec la
// session de dev en cours. Surchargeable via E2E_PORT.
const PORT = process.env.E2E_PORT ?? "8099";
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Tests fonctionnels (E2E) de Sport Motiv sur la version WEB — celle utilisée pour
 * les revues (~390px). Playwright démarre le serveur web Expo (`expo start --web`,
 * port 8081), ou réutilise celui déjà lancé, puis pilote un Chromium en viewport
 * mobile.
 *
 * ⚠ Ces tests tapent sur le Supabase de DEV : ils créent des comptes jetables et
 * les suppriment eux-mêmes (via la suppression de compte RÉELLE de l'app). D'où
 * `workers: 1` + `fullyParallel: false` : on évite les collisions de données sur
 * un backend partagé.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    // Viewport mobile (~390px) : on teste ce que Romain voit en revue web.
    viewport: { width: 390, height: 844 },
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: `npx expo start --web --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // CI=1 → Expo non-interactif ; BROWSER=none → n'ouvre pas de navigateur en plus.
    env: { CI: "1", BROWSER: "none" },
  },
});
