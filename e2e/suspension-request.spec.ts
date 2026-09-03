import { expect, test } from "@playwright/test";

import {
  createGroup,
  currentGroupId,
  joinGroupByCode,
  revealInviteCode,
  uniqueGroupName,
} from "./helpers/groups";
import { isoOffsetDays, setWebDate } from "./helpers/forms";
import { deleteCurrentAccount, signUpAndLand, uniqueUser } from "./helpers/signup";

/**
 * Suspension côté JOUEUR (deux contextes) : Bob (membre) fait une DEMANDE de
 * suspension (dates + motif) ; Alice (admin) la voit en « Demandes en attente » et
 * l'ACCEPTE. Complète `suspensions.spec` (qui teste la suspension directe par l'admin).
 */
test.describe("Suspensions — demande joueur", () => {
  test("Bob demande une suspension → Alice l'accepte", async ({ browser }) => {
    test.setTimeout(180_000);

    const aliceCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const bobCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const alice = await aliceCtx.newPage();
    const bob = await bobCtx.newPage();

    try {
      await signUpAndLand(alice, uniqueUser("asr"));
      const groupName = uniqueGroupName();
      await createGroup(alice, groupName);
      const groupId = currentGroupId(alice);
      const code = await revealInviteCode(alice);

      await signUpAndLand(bob, uniqueUser("bsr"));
      await joinGroupByCode(bob, code, groupName);

      // Bob demande une suspension.
      await bob.goto(`/group/${groupId}/suspensions`, { waitUntil: "domcontentloaded" });
      await expect(bob.getByText("Demander une suspension")).toBeVisible({ timeout: 30_000 });
      await setWebDate(bob, "Début", isoOffsetDays(1));
      await setWebDate(bob, "Fin", isoOffsetDays(3));
      await bob.getByPlaceholder("Explique ta situation").fill("Vacances en famille.");
      await bob.getByText("Envoyer la demande").click();
      await expect(bob.getByText(/Demande envoyée/)).toBeVisible({ timeout: 20_000 });

      // Alice voit la demande en attente et l'accepte.
      await alice.goto(`/group/${groupId}/suspensions`, { waitUntil: "domcontentloaded" });
      await expect(alice.getByText("Demandes en attente")).toBeVisible({ timeout: 30_000 });
      await alice.getByText("Accepter").click();
      await expect(alice.getByText(/Suspension accordée/)).toBeVisible({ timeout: 20_000 });

      await deleteCurrentAccount(bob);
      await deleteCurrentAccount(alice);
    } finally {
      await aliceCtx.close();
      await bobCtx.close();
    }
  });
});
