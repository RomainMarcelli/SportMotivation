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
 * Refus d'un sport (deux contextes). Bob propose « Escalade », l'admin REFUSE avec un
 * commentaire → le demandeur est prévenu (« Sport non ajouté »). Couvre
 * `reject_group_activity` (branche « Refuser » de la demande d'ajout).
 */
test.describe("Refus d'un sport", () => {
  test("l'admin refuse la demande → Bob est prévenu", async ({ browser }) => {
    test.setTimeout(240_000);

    const aliceCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const bobCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const alice = await aliceCtx.newPage();
    const bob = await bobCtx.newPage();

    try {
      await signUpAndLand(alice, uniqueUser("arej"));
      const groupName = uniqueGroupName();
      await createGroup(alice, groupName);
      const groupId = currentGroupId(alice);
      const code = await revealInviteCode(alice);

      await signUpAndLand(bob, uniqueUser("brej"));
      await joinGroupByCode(bob, code, groupName);

      await declareUnlistedSport(bob, groupId, "Escalade");

      // Alice refuse la demande, avec un mot d'explication.
      await alice.goto("/notifications", { waitUntil: "domcontentloaded" });
      const refuseBtn = alice.getByText("Refuser", { exact: true });
      await expect(refuseBtn).toBeVisible({ timeout: 30_000 });
      await refuseBtn.click();
      await alice.getByPlaceholder("Un mot pour expliquer (facultatif)…").fill("Pas pour ce défi.");
      await alice.getByText("Envoyer le refus").click();
      // Pastille d'état exacte (le toast « Demande refusée. … » contient le même début).
      await expect(alice.getByText("Demande refusée", { exact: true })).toBeVisible({
        timeout: 20_000,
      });

      // Bob reçoit le refus.
      await bob.goto("/notifications", { waitUntil: "domcontentloaded" });
      await expect(bob.getByText("Sport non ajouté")).toBeVisible({ timeout: 30_000 });

      await deleteCurrentAccount(bob);
      await deleteCurrentAccount(alice);
    } finally {
      await aliceCtx.close();
      await bobCtx.close();
    }
  });
});
