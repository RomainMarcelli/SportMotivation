import { expect, test } from "@playwright/test";

import { createGroup, currentGroupId, uniqueGroupName } from "./helpers/groups";
import { hasServiceRole, seedCagnottePenalty } from "./helpers/seed";
import { deleteCurrentAccount, signUpAndLand, uniqueUser } from "./helpers/signup";

/**
 * Cagnotte : une pénalité (normalement produite par la clôture hebdo côté serveur)
 * est SEEDÉE en base, puis on vérifie que l'écran Cagnotte l'affiche bien (montant +
 * contributeur). Nécessite la clé service_role (cf. `helpers/seed.ts`) → sinon skip.
 */
test.describe("Cagnotte", () => {
  test("une pénalité seedée apparaît dans la cagnotte", async ({ page }) => {
    test.skip(!hasServiceRole(), "Nécessite SUPABASE_SERVICE_ROLE_KEY (seed privilégié).");
    test.setTimeout(120_000);

    await signUpAndLand(page, uniqueUser("cag"));
    const groupName = uniqueGroupName();
    await createGroup(page, groupName);
    const groupId = currentGroupId(page);

    // Seed : 42 € de pénalité imputés à l'admin → total de cagnotte = 42 €.
    await seedCagnottePenalty(groupId, 42);

    await page.goto(`/group/${groupId}/cagnotte`);
    // Le total (formatEuro(42) = « 42 € ») s'affiche, et le contributeur est « Toi ».
    await expect(page.getByText(/42\s*€/).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Toi").first()).toBeVisible({ timeout: 20_000 });

    await deleteCurrentAccount(page);
  });
});
