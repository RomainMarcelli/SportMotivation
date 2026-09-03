import { expect, test } from "@playwright/test";

import {
  createGroup,
  currentGroupId,
  joinGroupByCode,
  revealInviteCode,
  uniqueGroupName,
} from "./helpers/groups";
import { declareRunSession } from "./helpers/sessions";
import {
  hasServiceRole,
  nonAdminMemberId,
  seedTodaySession,
  setGroupRules,
} from "./helpers/seed";
import { deleteCurrentAccount, signUpAndLand, uniqueUser } from "./helpers/signup";

/**
 * Octroi d'une séance supplémentaire (deux contextes, loop complet). Le défi est
 * plafonné à 1 séance/jour et Bob en a déjà une aujourd'hui (seed) : sa nouvelle
 * déclaration lève `DAILY_LIMIT_REACHED` → la modale propose de demander une séance
 * de plus. Alice (admin) reçoit la demande et l'accorde d'un tap. Couvre
 * `request_session_limit` (joueur) + `grant_session_limit` (admin, depuis la notif).
 * Nécessite la clé service_role → sinon skip.
 */
test.describe("Séance supplémentaire", () => {
  test("Bob atteint la limite → Alice lui accorde une séance", async ({ browser }) => {
    test.skip(!hasServiceRole(), "Nécessite SUPABASE_SERVICE_ROLE_KEY (limite + séance seedées).");
    test.setTimeout(240_000);

    const aliceCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const bobCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const alice = await aliceCtx.newPage();
    const bob = await bobCtx.newPage();

    try {
      await signUpAndLand(alice, uniqueUser("alim"));
      const groupName = uniqueGroupName();
      await createGroup(alice, groupName);
      const groupId = currentGroupId(alice);
      const code = await revealInviteCode(alice);

      await signUpAndLand(bob, uniqueUser("blim"));
      await joinGroupByCode(bob, code, groupName);

      // Plafond à 1/jour + une séance de Bob déjà comptée aujourd'hui → quota épuisé.
      await setGroupRules(groupId, { max_sessions_per_day: 1 });
      const bobId = await nonAdminMemberId(groupId);
      await seedTodaySession(groupId, bobId);

      // Bob tente une déclaration → le serveur refuse (DAILY_LIMIT_REACHED) → modale.
      await bob.goto(`/group/${groupId}`, { waitUntil: "domcontentloaded" });
      await declareRunSession(bob);
      await expect(bob.getByText("Limite du jour atteinte")).toBeVisible({ timeout: 20_000 });
      await bob.getByText("Demander une séance de plus").click();
      await expect(bob.getByText(/Demande envoyée à l'admin/)).toBeVisible({ timeout: 20_000 });

      // Alice reçoit la demande et accorde la séance depuis ses notifications.
      await alice.goto("/notifications", { waitUntil: "domcontentloaded" });
      const grantBtn = alice.getByText("Accorder une séance");
      await expect(grantBtn).toBeVisible({ timeout: 30_000 });
      await grantBtn.click();
      await expect(alice.getByText("Séance supplémentaire accordée.")).toBeVisible({
        timeout: 20_000,
      });

      await deleteCurrentAccount(bob);
      await deleteCurrentAccount(alice);
    } finally {
      await aliceCtx.close();
      await bobCtx.close();
    }
  });
});
