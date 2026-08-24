import { expect, test } from "@playwright/test";

/**
 * Onboarding (contexte neuf, non connecté) : à la racine, l'app redirige vers le
 * carrousel d'accueil tant que l'onboarding n'est pas « complété » (flag local).
 *
 * Les 3 slides sont toutes montées dans le track (décalées par translateX), donc
 * `toBeVisible` ne les distingue pas : on s'appuie sur le CTA du pied, qui passe de
 * « Suivant » à « C'est parti » une fois arrivé au dernier slide.
 */
test.describe("Onboarding", () => {
  test("parcourir le carrousel jusqu'à « C'est parti » mène à l'inscription", async ({ page }) => {
    await page.goto("/");
    // Slide 1 + CTA « Suivant ».
    await expect(page.getByText("Bougez à plusieurs")).toBeVisible({ timeout: 60_000 });
    const cta = page.getByText("Suivant", { exact: true });
    await expect(cta).toBeVisible();

    // Deux avancées → dernier slide (petite pause pour laisser React re-binder le
    // handler sur l'index courant + l'animation de 280 ms se poser).
    await cta.click();
    await page.waitForTimeout(400);
    await page.getByText("Suivant", { exact: true }).click();
    await page.waitForTimeout(400);

    // Dernier slide : le CTA devient « C'est parti » → mène à l'inscription.
    const finish = page.getByText("C'est parti", { exact: true });
    await expect(finish).toBeVisible({ timeout: 10_000 });
    await finish.click();
    await expect(page.getByText("Crée ton compte")).toBeVisible({ timeout: 30_000 });
  });

  test("« Se connecter » depuis l'onboarding mène à la connexion", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Bougez à plusieurs")).toBeVisible({ timeout: 60_000 });
    await page.getByText("Se connecter").click();
    await expect(page.getByText("Content de te revoir")).toBeVisible({ timeout: 30_000 });
  });
});
