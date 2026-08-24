import { expect, test } from "@playwright/test";

import {
  createGroup,
  currentGroupId,
  joinGroupByCode,
  revealInviteCode,
  uniqueGroupName,
} from "./helpers/groups";
import { declareUnlistedSport } from "./helpers/sessions";
import { deleteCurrentAccount, signUpAndLand, uniqueUser } from "./helpers/signup";

/**
 * Vote de groupe pour ajouter un sport (deux contextes). Bob propose « Escalade »,
 * l'admin choisit « Lancer un vote » plutôt que d'ajouter directement. La majorité
 * stricte des membres est requise (2 membres → 2 « Pour ») : Alice ET Bob votent
 * Pour → le sport est ajouté et tout le monde reçoit « Sport ajouté au défi ».
 * Couvre `start_activity_vote` + `cast_activity_vote` (branche non testée par
 * activity-request, qui ne fait que l'ajout direct).
 */
test.describe("Vote de groupe sur un sport", () => {
  test("Alice lance un vote, Alice+Bob votent Pour → sport ajouté", async ({ browser }) => {
    test.setTimeout(240_000);

    const aliceCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const bobCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const alice = await aliceCtx.newPage();
    const bob = await bobCtx.newPage();

    try {
      await signUpAndLand(alice, uniqueUser("avot"));
      const groupName = uniqueGroupName();
      await createGroup(alice, groupName);
      const groupId = currentGroupId(alice);
      const code = await revealInviteCode(alice);

      await signUpAndLand(bob, uniqueUser("bvot"));
      await joinGroupByCode(bob, code, groupName);

      // Bob propose un sport non listé → demande d'ajout à l'admin.
      await declareUnlistedSport(bob, groupId, "Escalade");

      // Alice ouvre un VOTE de groupe au lieu d'ajouter directement.
      await alice.goto("/notifications");
      const startVoteBtn = alice.getByText("Lancer un vote");
      await expect(startVoteBtn).toBeVisible({ timeout: 30_000 });
      await startVoteBtn.click();
      // Pastille d'état (persistante) — texte distinct du toast « Vote lancé : … ».
      await expect(alice.getByText("Vote lancé au groupe")).toBeVisible({ timeout: 20_000 });

      // Alice vote « Pour » sur la nouvelle notification de vote (1/2).
      const alicePour = alice.getByText("Pour", { exact: true });
      await expect(alicePour).toBeVisible({ timeout: 20_000 });
      await alicePour.click();
      await expect(alice.getByText("Ton vote : Pour")).toBeVisible({ timeout: 20_000 });

      // Bob vote « Pour » (2/2) → majorité atteinte → sport ajouté.
      await bob.goto("/notifications");
      const bobPour = bob.getByText("Pour", { exact: true });
      await expect(bobPour).toBeVisible({ timeout: 30_000 });
      await bobPour.click();

      // La résolution notifie tout le groupe : « Sport ajouté au défi » chez Bob.
      await bob.reload();
      await expect(bob.getByText("Sport ajouté au défi")).toBeVisible({ timeout: 30_000 });

      await deleteCurrentAccount(bob);
      await deleteCurrentAccount(alice);
    } finally {
      await aliceCtx.close();
      await bobCtx.close();
    }
  });
});
