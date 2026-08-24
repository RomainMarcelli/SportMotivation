import { expect, test } from "@playwright/test";

import { deleteCurrentAccount, signIn, signOut, signUpAndLand, uniqueUser } from "./helpers/signup";

test.describe("Connexion / Déconnexion", () => {
  test("aller-retour : déconnexion puis reconnexion", async ({ page }) => {
    const u = uniqueUser();
    await signUpAndLand(page, u); // crée le compte + connecté
    await signOut(page); // → écran de connexion
    await signIn(page, u); // reconnexion → accueil (« Salut … »)
    await deleteCurrentAccount(page); // nettoyage
  });

  test("mauvais mot de passe refusé", async ({ page }) => {
    const u = uniqueUser();
    await signUpAndLand(page, u);
    await signOut(page);

    // Tentative avec un mauvais mot de passe → message d'erreur.
    await page.goto("/sign-in");
    await expect(page.getByText("Content de te revoir")).toBeVisible({ timeout: 60_000 });
    await page.getByPlaceholder("ton@email.com").fill(u.email);
    await page.getByPlaceholder("Ton mot de passe").fill("MauvaisMdp9!");
    await page.getByText("Se connecter").click();
    await expect(page.getByText("E-mail ou mot de passe incorrect.")).toBeVisible({
      timeout: 20_000,
    });

    // Connexion correcte pour pouvoir nettoyer le compte.
    await signIn(page, u);
    await deleteCurrentAccount(page);
  });
});
