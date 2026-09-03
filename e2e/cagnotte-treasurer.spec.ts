import { expect, test } from "@playwright/test";

import { createGroup, currentGroupId, uniqueGroupName } from "./helpers/groups";
import { hasServiceRole, seedCagnottePenalty } from "./helpers/seed";
import { deleteCurrentAccount, signUpAndLand, uniqueUser } from "./helpers/signup";

/**
 * Cagnotte — vue trésorier : avec une pénalité seedée, l'admin (trésorier) active la
 * « Vue trésorier » et marque le membre comme payé. Nécessite la clé service_role → sinon skip.
 */
test.describe("Cagnotte — trésorier", () => {
  test("marquer un membre comme réglé", async ({ page }) => {
    test.skip(!hasServiceRole(), "Nécessite SUPABASE_SERVICE_ROLE_KEY (seed privilégié).");
    test.setTimeout(120_000);

    await signUpAndLand(page, uniqueUser("tre"));
    await createGroup(page, uniqueGroupName());
    const groupId = currentGroupId(page);
    await seedCagnottePenalty(groupId, 15);

    await page.goto(`/group/${groupId}/cagnotte`, { waitUntil: "domcontentloaded" });
    // Le membre à régler apparaît (montant 15 €).
    await expect(page.getByText(/15\s*€/).first()).toBeVisible({ timeout: 30_000 });

    // Active la vue trésorier puis marque « payé ».
    await page.getByText("Vue trésorier").click();
    await page.getByText("Marquer payé").click();
    await expect(page.getByText("Toi : réglé.")).toBeVisible({ timeout: 20_000 });

    await deleteCurrentAccount(page);
  });
});
