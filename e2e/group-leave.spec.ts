import { expect, test } from "@playwright/test";

import {
  createGroup,
  currentGroupId,
  joinGroupByCode,
  revealInviteCode,
  uniqueGroupName,
} from "./helpers/groups";
import { deleteCurrentAccount, signUpAndLand, uniqueUser } from "./helpers/signup";

/**
 * Quitter un défi (membre non-admin) : Bob rejoint puis quitte via le menu ⋮.
 */
test.describe("Quitter le défi", () => {
  test("un membre quitte le défi", async ({ browser }) => {
    test.setTimeout(180_000);

    const aliceCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const bobCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const alice = await aliceCtx.newPage();
    const bob = await bobCtx.newPage();

    try {
      await signUpAndLand(alice, uniqueUser("alv"));
      const groupName = uniqueGroupName();
      await createGroup(alice, groupName);
      const groupId = currentGroupId(alice);
      const code = await revealInviteCode(alice);

      await signUpAndLand(bob, uniqueUser("blv"));
      await joinGroupByCode(bob, code, groupName);

      // Bob ouvre le menu ⋮ et quitte le défi.
      await bob.goto(`/group/${groupId}`, { waitUntil: "domcontentloaded" });
      await bob.getByLabel("Options du groupe").click();
      await bob.getByText("Quitter le groupe").click();
      // Dialog de confirmation → bouton « Quitter le groupe ».
      await expect(bob.getByText("Quitter le groupe ?")).toBeVisible({ timeout: 15_000 });
      // Le menu ⋮ et le dialog coexistent → 2 « Quitter le groupe » ; le bouton de
      // confirmation (dialog) est rendu en dernier.
      await bob.getByText("Quitter le groupe", { exact: true }).last().click();
      await expect(bob.getByText(/Tu as quitté/)).toBeVisible({ timeout: 20_000 });

      await deleteCurrentAccount(bob);
      await deleteCurrentAccount(alice);
    } finally {
      await aliceCtx.close();
      await bobCtx.close();
    }
  });
});
