import { expect, test } from "@playwright/test";

import { createGroup, uniqueGroupName } from "./helpers/groups";
import { declareRunSession } from "./helpers/sessions";
import { deleteCurrentAccount, signUpAndLand, uniqueUser } from "./helpers/signup";

test.describe("Séances", () => {
  test("déclarer une séance sans distance → affichage historique inchangé", async ({ page }) => {
    await signUpAndLand(page, uniqueUser());
    await createGroup(page, uniqueGroupName());
    await declareRunSession(page);

    // Retour sur le tableau de bord : la séance figure dans l'onglet « Séances ».
    await page.getByText("Séances", { exact: true }).click();
    await expect(page.getByText("Course").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel("Voir la séance Course").first()).not.toContainText("km");

    await deleteCurrentAccount(page);
  });

  test("déclarer une séance avec distance → feed et fiche affichent les métriques", async ({
    page,
  }) => {
    await signUpAndLand(page, uniqueUser("distance"));
    await createGroup(page, uniqueGroupName());
    await declareRunSession(page, { distanceKm: "8,2" });

    await page.getByText("Séances", { exact: true }).click();
    const row = page.getByLabel("Voir la séance Course").first();
    await expect(row).toContainText("8,2 km", { timeout: 20_000 });
    await expect(row).toContainText("/km");

    await row.click();
    await expect(page.getByText("Source des données")).toBeVisible();
    await expect(page.getByText("Saisie manuelle")).toBeVisible();
    await expect(page.getByText("8,2 km").last()).toBeVisible();

    await deleteCurrentAccount(page);
  });
});
