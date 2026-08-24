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
 * Transfert d'admin (deux contextes) : Alice (admin) confie l'administration à Bob
 * via le menu ⋮ → « Changer d'admin ». Bob a un prénom distinct (« Bob ») pour être
 * ciblé sans ambiguïté.
 */
test.describe("Transfert d'admin", () => {
  test("l'admin confie le rôle à un autre membre", async ({ browser }) => {
    // Flux 2-comptes + navigation menu/feuille : marge élargie (sous charge de batch).
    test.setTimeout(240_000);

    const aliceCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const bobCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const alice = await aliceCtx.newPage();
    const bob = await bobCtx.newPage();

    try {
      await signUpAndLand(alice, uniqueUser("atr"));
      const groupName = uniqueGroupName();
      await createGroup(alice, groupName);
      const groupId = currentGroupId(alice);
      const code = await revealInviteCode(alice);

      const bobUser = { ...uniqueUser("btr"), firstName: "Bob" };
      await signUpAndLand(bob, bobUser);
      await joinGroupByCode(bob, code, groupName);

      // Alice ouvre le menu ⋮ et transfère l'admin à Bob.
      await alice.goto(`/group/${groupId}`);
      await alice.getByLabel("Options du groupe").click();
      await alice.getByText("Changer d'admin").click();
      await expect(alice.getByText("Choisir le nouvel admin")).toBeVisible({ timeout: 15_000 });
      // La fiche candidat « Bob » de la feuille (rendue en dernier).
      await alice.getByText("Bob", { exact: true }).last().click();
      // Confirmation.
      await expect(alice.getByText("Confier l'admin à Bob ?")).toBeVisible({ timeout: 15_000 });
      await alice.getByText("Confirmer").click();
      await expect(alice.getByText(/Bob est désormais l'admin/)).toBeVisible({ timeout: 20_000 });

      await deleteCurrentAccount(bob);
      await deleteCurrentAccount(alice);
    } finally {
      await aliceCtx.close();
      await bobCtx.close();
    }
  });
});
