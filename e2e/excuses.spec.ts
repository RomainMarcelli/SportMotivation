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
 * Excuses (deux contextes) : Alice demande une excuse (soumise au vote du groupe),
 * Bob l'ACCEPTE depuis son deck de vote. Couvre l'écran de demande d'excuse
 * (`excuse.tsx`, atteint via « M'excuser cette semaine » de l'accueil) et le vote
 * d'excuse (`ExcuseVoteCard` dans `vote.tsx`).
 */
test.describe("Excuses", () => {
  test("Alice demande une excuse → Bob l'accepte", async ({ browser }) => {
    test.setTimeout(180_000);

    const aliceCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const bobCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const alice = await aliceCtx.newPage();
    const bob = await bobCtx.newPage();

    try {
      await signUpAndLand(alice, uniqueUser("aexc"));
      const groupName = uniqueGroupName();
      await createGroup(alice, groupName);
      const groupId = currentGroupId(alice);
      const code = await revealInviteCode(alice);

      await signUpAndLand(bob, uniqueUser("bexc"));
      await joinGroupByCode(bob, code, groupName);

      // Alice demande une excuse (type standard par défaut, motif libre).
      await alice.goto(`/group/${groupId}/excuse`, { waitUntil: "domcontentloaded" });
      const reason = alice.getByPlaceholder(/Explique en quelques mots/);
      await expect(reason).toBeVisible({ timeout: 30_000 });
      await reason.fill("Blessure au genou cette semaine.");
      await alice.getByText("Soumettre au vote").click();
      await expect(alice.getByText("Excuse soumise au vote du groupe.")).toBeVisible({ timeout: 20_000 });

      // Bob ouvre son deck de vote : l'excuse d'Alice s'y trouve → il l'accepte.
      await bob.goto(`/group/${groupId}/vote`, { waitUntil: "domcontentloaded" });
      await expect(bob.getByText("demande une excuse")).toBeVisible({ timeout: 30_000 });
      await bob.getByLabel("Accepter", { exact: true }).click();
      await expect(bob.getByText("Tu es à jour")).toBeVisible({ timeout: 20_000 });

      await deleteCurrentAccount(bob);
      await deleteCurrentAccount(alice);
    } finally {
      await aliceCtx.close();
      await bobCtx.close();
    }
  });
});
