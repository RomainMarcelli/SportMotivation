import { expect, test } from "@playwright/test";

import { deleteCurrentAccount, signUpAndLand, uniqueUser } from "./helpers/signup";

/**
 * Profil : édition de l'identité. On modifie le prénom depuis « Modifier le profil »,
 * on vérifie le retour (« Profil mis à jour ») puis la PERSISTANCE en rechargeant
 * l'onglet Profil (le nouveau prénom doit s'y afficher).
 */
test.describe("Profil", () => {
  test("modifier son prénom se reflète sur l'onglet Profil", async ({ page }) => {
    const user = uniqueUser("prof");
    await signUpAndLand(page, user);

    // Onglet Profil : le prénom initial (« Test ») s'affiche en gros, et le bouton
    // « Modifier le profil » sert de repère de chargement (unique sur l'écran).
    await page.goto("/profile");
    await expect(page.getByText("Modifier le profil")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(user.firstName).first()).toBeVisible({ timeout: 20_000 });

    // Écran d'édition : on remplace le prénom (1er champ texte : Prénom / Nom / Pseudo).
    await page.getByText("Modifier le profil").click();
    const newFirstName = "Testeur";
    const firstNameInput = page.getByRole("textbox").first();
    await expect(firstNameInput).toBeVisible({ timeout: 30_000 });
    await firstNameInput.fill(newFirstName);
    await page.getByText("Enregistrer").click();

    // La sauvegarde confirme par un toast, puis renvoie à l'écran précédent.
    await expect(page.getByText("Profil mis à jour")).toBeVisible({ timeout: 20_000 });

    // Persistance : on recharge l'onglet Profil → le nouveau prénom est bien là.
    await page.goto("/profile");
    await expect(page.getByText(newFirstName).first()).toBeVisible({ timeout: 20_000 });

    await deleteCurrentAccount(page);
  });
});
