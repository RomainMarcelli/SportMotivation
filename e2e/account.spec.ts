import { expect, test } from "@playwright/test";

import {
  deleteCurrentAccount,
  signIn,
  signOut,
  signUpAndLand,
  uniqueUser,
} from "./helpers/signup";

/**
 * Compte : sécurité. Le changement de mot de passe est PROUVÉ par une reconnexion
 * avec le nouveau.
 *
 * NB : le changement d'E-MAIL n'est pas couvert en E2E — le Supabase de dev rejette
 * la demande pour les adresses de test `@example.com` (« Email address … is invalid »),
 * la validation/SMTP n'étant pas configurée. L'app gère correctement le refus (message
 * d'erreur), mais on ne peut pas en faire un test vert déterministe ici.
 */
test.describe("Compte — sécurité", () => {
  test("changer de mot de passe puis se reconnecter avec le nouveau", async ({ page }) => {
    test.setTimeout(120_000);
    const user = uniqueUser("pwd");
    const newPassword = "Nouveaupass2@";
    await signUpAndLand(page, user);

    await page.goto("/account/password", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("Ton mot de passe").fill(user.password);
    await page.getByPlaceholder("8 caractères minimum").fill(newPassword);
    await page.getByPlaceholder("Saisis-le à nouveau").fill(newPassword);
    await page.getByText("Modifier mon mot de passe").click();
    await expect(page.getByText("Mot de passe modifié")).toBeVisible({ timeout: 20_000 });

    // Preuve : déconnexion puis reconnexion avec le NOUVEAU mot de passe.
    await signOut(page);
    await signIn(page, { email: user.email, password: newPassword });

    await deleteCurrentAccount(page);
  });
});
