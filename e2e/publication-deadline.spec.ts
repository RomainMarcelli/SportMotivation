import { expect, test } from "@playwright/test";

import { isoOffsetDays, setWebDate } from "./helpers/forms";
import {
  createGroup,
  currentGroupId,
  joinGroupByCode,
  revealInviteCode,
  uniqueGroupName,
} from "./helpers/groups";
import { hasServiceRole, isMonday, setGroupRules } from "./helpers/seed";
import { deleteCurrentAccount, signUpAndLand, uniqueUser } from "./helpers/signup";

/**
 * Assouplissement du délai de publication = demande de changement de règle (deux
 * contextes). Le défi est réglé sur « jour même » (seed). Bob sélectionne un jour
 * PASSÉ de la semaine → l'encart d'avertissement apparaît → il demande à l'admin
 * d'assouplir. Alice (admin) reçoit la notification `rule_change_request` qui l'amène
 * à modifier le défi. Couvre `request_rule_change("publication_deadline")` — le SEUL
 * changement de règle câblé dans l'UI (même mécanisme pour toute règle demandable).
 */
test.describe("Assouplir le délai de publication", () => {
  test("Bob demande l'assouplissement → Alice reçoit la demande", async ({ browser }) => {
    test.skip(!hasServiceRole(), "Nécessite SUPABASE_SERVICE_ROLE_KEY (règle 'same_day' seedée).");
    // Un lundi, aucun jour passé de la semaine n'est sélectionnable → l'encart ne
    // peut pas s'afficher. On saute honnêtement plutôt que d'échouer.
    test.skip(isMonday(), "Aucun jour passé sélectionnable un lundi.");
    test.setTimeout(240_000);

    const aliceCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const bobCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const alice = await aliceCtx.newPage();
    const bob = await bobCtx.newPage();

    try {
      await signUpAndLand(alice, uniqueUser("apub"));
      const groupName = uniqueGroupName();
      await createGroup(alice, groupName);
      const groupId = currentGroupId(alice);
      // Force la règle « jour même » (non exposée par l'assistant de création).
      await setGroupRules(groupId, { publication_deadline: "same_day" });
      const code = await revealInviteCode(alice);

      await signUpAndLand(bob, uniqueUser("bpub"));
      await joinGroupByCode(bob, code, groupName);

      // Bob ouvre la déclaration et choisit HIER (jour passé, dans la semaine courante
      // dès lors qu'on n'est pas lundi — garanti par le skip ci-dessus).
      await bob.goto(`/group/${groupId}/declare`);
      await expect(bob.getByText("Course", { exact: true })).toBeVisible({ timeout: 30_000 });
      await setWebDate(bob, "Date", isoOffsetDays(-1));

      // L'encart « jour même » apparaît → Bob demande l'assouplissement.
      const askBtn = bob.getByText("Demander à l'admin d'assouplir");
      await expect(askBtn).toBeVisible({ timeout: 15_000 });
      await askBtn.click();
      await expect(bob.getByText(/Demande envoyée à l'admin d'assouplir/)).toBeVisible({
        timeout: 20_000,
      });

      // Alice reçoit la demande de changement de règle (action « Modifier le défi »).
      await alice.goto("/notifications");
      await expect(alice.getByText("Une règle à revoir ?")).toBeVisible({ timeout: 30_000 });
      await expect(alice.getByText("Modifier le défi")).toBeVisible({ timeout: 15_000 });

      await deleteCurrentAccount(bob);
      await deleteCurrentAccount(alice);
    } finally {
      await aliceCtx.close();
      await bobCtx.close();
    }
  });
});
