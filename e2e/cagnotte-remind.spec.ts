import { expect, test } from "@playwright/test";

import {
  createGroup,
  currentGroupId,
  joinGroupByCode,
  revealInviteCode,
  uniqueGroupName,
} from "./helpers/groups";
import { hasServiceRole, nonAdminMemberId, seedCagnottePenalty } from "./helpers/seed";
import { deleteCurrentAccount, signUpAndLand, uniqueUser } from "./helpers/signup";

/**
 * Cagnotte — relance des retardataires (deux contextes). Le trésorier ne se relance
 * jamais lui-même (RPC `remind_unpaid_members`) : il faut donc un DÛ sur un AUTRE
 * membre. Bob rejoint le défi, on lui seede une pénalité impayée, puis Alice (admin)
 * déclenche « Relancer les retardataires » et confirme → une relance part.
 * Nécessite la clé service_role → sinon skip.
 */
test.describe("Cagnotte — relance", () => {
  test("l'admin relance un membre au solde en attente", async ({ browser }) => {
    test.skip(!hasServiceRole(), "Nécessite SUPABASE_SERVICE_ROLE_KEY (seed privilégié).");
    test.setTimeout(180_000);

    const aliceCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const bobCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const alice = await aliceCtx.newPage();
    const bob = await bobCtx.newPage();

    try {
      await signUpAndLand(alice, uniqueUser("armd"));
      const groupName = uniqueGroupName();
      await createGroup(alice, groupName);
      const groupId = currentGroupId(alice);
      const code = await revealInviteCode(alice);

      await signUpAndLand(bob, uniqueUser("brmd"));
      await joinGroupByCode(bob, code, groupName);

      // Pénalité impayée sur BOB (pas l'admin) → il est le retardataire à relancer.
      const bobId = await nonAdminMemberId(groupId);
      await seedCagnottePenalty(groupId, 20, bobId);

      await alice.goto(`/group/${groupId}/cagnotte`, { waitUntil: "domcontentloaded" });
      // Le pied de page trésorier propose la relance (badge = nb de membres à relancer).
      const relanceBtn = alice.getByText("Relancer les retardataires");
      await expect(relanceBtn).toBeVisible({ timeout: 30_000 });
      await relanceBtn.click();

      // Boîte de confirmation → bouton « Relancer » (exact, pour ne pas re-cibler le pied de page).
      await expect(alice.getByText("Relancer les retardataires ?")).toBeVisible({ timeout: 15_000 });
      await alice.getByText("Relancer", { exact: true }).last().click();

      await expect(alice.getByText(/Relance envoyée à \d+ membre/)).toBeVisible({ timeout: 20_000 });

      await deleteCurrentAccount(bob);
      await deleteCurrentAccount(alice);
    } finally {
      await aliceCtx.close();
      await bobCtx.close();
    }
  });
});
