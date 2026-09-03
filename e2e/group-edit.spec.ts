import { expect, test } from "@playwright/test";

import { createGroup, currentGroupId, uniqueGroupName } from "./helpers/groups";
import { deleteCurrentAccount, signUpAndLand, uniqueUser } from "./helpers/signup";

/**
 * Modifier le défi (admin) : on renomme le défi depuis l'écran d'édition et on
 * vérifie la persistance sur le tableau de bord.
 */
test.describe("Modifier le défi", () => {
  test("renommer le défi se reflète sur le tableau de bord", async ({ page }) => {
    test.setTimeout(120_000);
    await signUpAndLand(page, uniqueUser("edit"));
    await createGroup(page, uniqueGroupName());
    const groupId = currentGroupId(page);

    await page.goto(`/group/${groupId}/edit`, { waitUntil: "domcontentloaded" });
    // 1er champ texte = « Nom du défi » (2e = Description).
    const nameInput = page.getByRole("textbox").first();
    await expect(nameInput).toBeVisible({ timeout: 30_000 });
    const newName = `Défi renommé ${Date.now()}`;
    await nameInput.fill(newName);
    await page.getByText("Enregistrer les réglages").click();
    await expect(page.getByText("Réglages du groupe mis à jour.")).toBeVisible({ timeout: 20_000 });

    // Persistance : le nouveau nom s'affiche sur le dashboard.
    await page.goto(`/group/${groupId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(newName).first()).toBeVisible({ timeout: 30_000 });

    await deleteCurrentAccount(page);
  });
});
