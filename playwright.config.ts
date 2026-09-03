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
  // Les parcours multi-comptes dépassent parfois 90 s lorsque Metro compile une
  // nouvelle route en arrière-plan. Ce plafond reste borné mais évite de tuer un
  // scénario dont l'UI continue de progresser normalement.
  timeout: 150_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    // Viewport mobile (~390px) : on teste ce que Romain voit en revue web.
    viewport: { width: 390, height: 844 },
    actionTimeout: 15_000,
    // Une passe complète peut provoquer une compilation de route > 60 s, même si
    // la même navigation à froid termine ensuite en moins de 40 s.
    navigationTimeout: 120_000,
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
    // Un Metro réutilisé après plusieurs passes finit près du heap Node de 4 Go et
    // rend les dernières navigations aléatoires. Le port est dédié : chaque passe
    // doit donc posséder un serveur neuf, arrêté automatiquement par Playwright.
    reuseExistingServer: false,
    // Le bundle froid SDK 54 dépasse parfois 3 minutes sur la machine de revue.
    timeout: 360_000,
    // CI=1 → Expo non-interactif ; BROWSER=none → n'ouvre pas de navigateur en plus.
    // La suite complète monte à ~3,8 Go : garder une marge évite les GC bloquants.
    env: { CI: "1", BROWSER: "none", NODE_OPTIONS: "--max-old-space-size=8192" },
  },
});
