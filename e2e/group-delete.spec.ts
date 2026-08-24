import { expect, test } from "@playwright/test";

import { createGroup, currentGroupId, uniqueGroupName } from "./helpers/groups";
import { deleteCurrentAccount, signUpAndLand, uniqueUser } from "./helpers/signup";

/**
 * Supprimer le défi (admin, zone de danger de l'écran d'édition) : confirmation puis
 * accusé « Groupe supprimé. ». Le compte de test est ensuite nettoyé.
 */
test.describe("Supprimer le défi", () => {
  test("supprimer le défi depuis la zone de danger", async ({ page }) => {
    test.setTimeout(120_000);
    await signUpAndLand(page, uniqueUser("del"));
    await createGroup(page, uniqueGroupName());
    const groupId = currentGroupId(page);

    await page.goto(`/group/${groupId}/edit`);
    await expect(page.getByText("Supprimer le défi")).toBeVisible({ timeout: 30_000 });
    await page.getByText("Supprimer le défi").click();

    // Dialog de confirmation → bouton « Supprimer » (exact, ≠ « Supprimer le défi »).
    await expect(page.getByText("Supprimer le groupe")).toBeVisible({ timeout: 15_000 });
    await page.getByText("Supprimer", { exact: true }).click();
    await expect(page.getByText("Groupe supprimé.")).toBeVisible({ timeout: 20_000 });

    await deleteCurrentAccount(page);
  });
});
