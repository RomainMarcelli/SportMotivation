import { expect, test } from "@playwright/test";

import { createGroup, uniqueGroupName } from "./helpers/groups";
import { declareRunSession } from "./helpers/sessions";
import { deleteCurrentAccount, signUpAndLand, uniqueUser } from "./helpers/signup";

test.describe("Séances", () => {
  test("déclarer une séance → elle apparaît dans l'onglet Séances", async ({ page }) => {
    await signUpAndLand(page, uniqueUser());
    await createGroup(page, uniqueGroupName());
    await declareRunSession(page);

    // Retour sur le tableau de bord : la séance figure dans l'onglet « Séances ».
    await page.getByText("Séances", { exact: true }).click();
    await expect(page.getByText("Course").first()).toBeVisible({ timeout: 20_000 });

    await deleteCurrentAccount(page);
  });
});
