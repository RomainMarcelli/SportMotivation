import { expect, test } from "@playwright/test";

import { createGroup, currentGroupId, uniqueGroupName } from "./helpers/groups";
import { endChallenge, hasServiceRole, seedCagnottePenalty } from "./helpers/seed";
import { deleteCurrentAccount, signUpAndLand, uniqueUser } from "./helpers/signup";

/**
 * Fin de défi : on seede une cagnotte puis on fait « terminer » le défi (challenge_end
 * reculé à hier). L'admin ouvre le bilan et DÉBLOQUE la cagnotte — ce déblocage passe
 * par la vraie RPC serveur `unlock_pot` (qui n'accepte que si le défi est terminé) →
 * écran de célébration. Nécessite la clé service_role → sinon skip.
 */
test.describe("Fin de défi", () => {
  test("débloquer la cagnotte une fois le défi terminé", async ({ page }) => {
    test.skip(!hasServiceRole(), "Nécessite SUPABASE_SERVICE_ROLE_KEY (seed privilégié).");
    test.setTimeout(120_000);

    await signUpAndLand(page, uniqueUser("fin"));
    const groupName = uniqueGroupName();
    await createGroup(page, groupName);
    const groupId = currentGroupId(page);

    // Cagnotte non vide + défi terminé (échéance à hier).
    await seedCagnottePenalty(groupId, 30);
    await endChallenge(groupId);

    await page.goto(`/group/${groupId}/fin-defi`);
    await expect(page.getByText("Défi terminé")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/30\s*€/).first()).toBeVisible({ timeout: 20_000 });

    // Déblocage réel (RPC unlock_pot) → écran « cloture » de célébration.
    await page.getByText("Débloquer la cagnotte").click();
    await expect(page.getByText(/Bravo/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("cagnotte débloquée")).toBeVisible({ timeout: 20_000 });

    await deleteCurrentAccount(page);
  });
});
