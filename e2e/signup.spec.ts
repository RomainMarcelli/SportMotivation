import { expect, test } from "@playwright/test";

import {
  deleteCurrentAccount,
  fillSignUp,
  gotoSignUp,
  signUpAndLand,
  uniqueUser,
} from "./helpers/signup";

test.describe("Inscription", () => {
  test("valide les entrées du formulaire", async ({ page }) => {
    await gotoSignUp(page);

    // E-mail au mauvais format → message d'erreur.
    await page.getByPlaceholder("ton@email.com").fill("pas-un-email");
    await page.getByPlaceholder("ton@email.com").blur();
    await expect(page.getByText("Email invalide")).toBeVisible();

    // Mots de passe différents → message d'erreur.
    await page.getByPlaceholder("8 caractères minimum").fill("Motdepasse1!");
    await page.getByPlaceholder("Saisis-le à nouveau").fill("Different1!");
    await page.getByPlaceholder("Saisis-le à nouveau").blur();
    await expect(page.getByText("Les mots de passe ne correspondent pas")).toBeVisible();
  });

  test("inscription réussie → on arrive dans l'app", async ({ page }) => {
    const u = uniqueUser();
    await signUpAndLand(page, u);
    // Nettoyage : on supprime le compte de test créé.
    await deleteCurrentAccount(page);
  });

  test("un pseudo déjà pris propose des alternatives disponibles", async ({ page, browser }) => {
    const u = uniqueUser();

    // 1) On crée un compte : son pseudo devient PRIS.
    await signUpAndLand(page, u);

    // 2) Dans un contexte NON connecté (nouvelle session), on ouvre l'inscription
    //    et on retape le MÊME pseudo.
    const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const guest = await guestContext.newPage();
    await guest.goto("/sign-up");
    await expect(guest.getByText("Crée ton compte")).toBeVisible({ timeout: 60_000 });
    await guest.getByPlaceholder("romz").fill(u.username);

    // 3) Le pseudo est annoncé pris, ET des alternatives disponibles apparaissent.
    await expect(guest.getByText("Ce pseudo est déjà pris.")).toBeVisible({ timeout: 15_000 });
    await expect(guest.getByText("Pseudos disponibles :")).toBeVisible({ timeout: 15_000 });

    // 4) On clique la 1re suggestion → le champ se remplit, l'erreur disparaît.
    const firstSuggestion = guest.getByTestId("username-suggestion").first();
    await expect(firstSuggestion).toBeVisible();
    const chosen = (await firstSuggestion.innerText()).trim();
    await firstSuggestion.click();
    await expect(guest.getByText("Ce pseudo est déjà pris.")).toHaveCount(0);
    // La suggestion choisie commence bien par le pseudo de base.
    expect(chosen.startsWith(u.username)).toBe(true);

    await guestContext.close();

    // 5) Nettoyage : la page principale est toujours connectée au compte créé.
    await deleteCurrentAccount(page);
  });
});
