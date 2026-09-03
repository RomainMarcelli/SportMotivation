import { expect, test } from "@playwright/test";

import {
  createGroup,
  joinGroupByCode,
  revealInviteCode,
  uniqueGroupName,
} from "./helpers/groups";
import { deleteCurrentAccount, signUpAndLand, uniqueUser } from "./helpers/signup";

/**
 * Gestion des notifications (deux contextes). Bob rejoint le défi d'Alice → Alice a
 * une notification non lue. Elle la marque « Tout lu » (le compteur de non-lues
 * disparaît), puis « Tout effacer » (liste vidée → état vide). Couvre `useMarkAllRead`
 * + `useDeleteAllNotifications`.
 */
test.describe("Gestion des notifications", () => {
  test("Alice marque tout lu puis efface tout", async ({ browser }) => {
    test.setTimeout(180_000);

    const aliceCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const bobCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const alice = await aliceCtx.newPage();
    const bob = await bobCtx.newPage();

    try {
      await signUpAndLand(alice, uniqueUser("amng"));
      const groupName = uniqueGroupName();
      await createGroup(alice, groupName);
      const code = await revealInviteCode(alice);

      await signUpAndLand(bob, uniqueUser("bmng"));
      await joinGroupByCode(bob, code, groupName);

      // Alice a une notification non lue (« Nouveau membre »).
      await alice.goto("/notifications", { waitUntil: "domcontentloaded" });
      await expect(alice.getByText(/vient de rejoindre/)).toBeVisible({ timeout: 30_000 });
      const markAll = alice.getByText("Tout marquer lu");
      await expect(markAll).toBeVisible({ timeout: 15_000 });

      // Tout marquer lu → le bloc « non lues » (compteur + bouton) disparaît.
      await markAll.click();
      await expect(alice.getByText("Tout marquer lu")).toHaveCount(0, { timeout: 15_000 });

      // Tout effacer → confirmation → liste vidée.
      await alice.getByLabel("Tout effacer").click();
      await expect(alice.getByText("Tout effacer").first()).toBeVisible({ timeout: 15_000 });
      await alice.getByText("Tout effacer").last().click();
      await expect(alice.getByText("Notifications effacées")).toBeVisible({ timeout: 20_000 });
      await expect(alice.getByText("Rien pour l'instant")).toBeVisible({ timeout: 15_000 });

      await deleteCurrentAccount(bob);
      await deleteCurrentAccount(alice);
    } finally {
      await aliceCtx.close();
      await bobCtx.close();
    }
  });
});
