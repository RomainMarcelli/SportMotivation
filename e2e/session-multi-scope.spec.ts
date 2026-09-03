import { expect, test } from "@playwright/test";

import { createGroup, currentGroupId, uniqueGroupName } from "./helpers/groups";
import { declareRunSession } from "./helpers/sessions";
import { deleteCurrentAccount, signUpAndLand, uniqueUser } from "./helpers/signup";

/**
 * Déclaration multi-défis (un seul compte, deux défis). Le joueur crée deux défis
 * puis déclare une séance depuis le premier : le `SessionScopePicker` coche tous les
 * défis actifs par défaut → la séance part dans les DEUX. On le prouve par le toast
 * « … dans 2 défis » ET par la présence de la séance dans l'onglet Séances du 2ᵉ défi.
 * Couvre `SessionScopePicker` + `publish_session_to_my_groups`.
 */
test.describe("Déclaration multi-défis", () => {
  test("une séance déclarée compte dans les deux défis", async ({ page }) => {
    test.setTimeout(180_000);

    await signUpAndLand(page, uniqueUser("scope"));

    // Deux défis actifs (l'auteur est admin des deux).
    await createGroup(page, uniqueGroupName("Défi A"));
    const groupAId = currentGroupId(page);
    await createGroup(page, uniqueGroupName("Défi B"));
    const groupBId = currentGroupId(page);

    // Déclaration depuis le défi A ; la portée coche A + B par défaut.
    await page.goto(`/group/${groupAId}`, { waitUntil: "domcontentloaded" });
    await declareRunSession(page);

    // Le toast confirme la publication dans les DEUX défis (count = 2).
    await expect(page.getByText("Séance envoyée au vote dans 2 défis")).toBeVisible({
      timeout: 30_000,
    });

    // Et la séance figure bien dans l'onglet Séances du défi B.
    await page.goto(`/group/${groupBId}`, { waitUntil: "domcontentloaded" });
    await page.getByText("Séances", { exact: true }).click();
    await expect(page.getByText("Course").first()).toBeVisible({ timeout: 20_000 });

    await deleteCurrentAccount(page);
  });
});
