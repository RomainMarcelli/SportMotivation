import { expect, test } from "@playwright/test";

import { createGroup, currentGroupId, uniqueGroupName } from "./helpers/groups";
import { hasServiceRole, seedBlame } from "./helpers/seed";
import { deleteCurrentAccount, signUpAndLand, uniqueUser } from "./helpers/signup";

/**
 * Blâmes : un blâme (« vote manqué », normalement produit par le cron `apply_session_blames`)
 * est SEEDÉ en base, puis on vérifie que le tableau de bord (onglet Infos) affiche la
 * section « Blâmes » avec le compteur du membre. Nécessite la clé service_role → sinon skip.
 */
test.describe("Blâmes", () => {
  test("un blâme seedé apparaît dans la section « Blâmes » du dashboard", async ({ page }) => {
    test.skip(!hasServiceRole(), "Nécessite SUPABASE_SERVICE_ROLE_KEY (seed privilégié).");
    test.setTimeout(120_000);

    await signUpAndLand(page, uniqueUser("blm"));
    const groupName = uniqueGroupName();
    await createGroup(page, groupName);
    const groupId = currentGroupId(page);

    // Seed : 1 blâme non soldé imputé à l'admin (« Toi »).
    await seedBlame(groupId);

    // Rechargement à froid → cache vidé → la vue des blâmes est relue fraîche.
    await page.goto(`/group/${groupId}`, { waitUntil: "domcontentloaded" });
    // `exact` : « Blâmes » (titre de section) sans matcher « Seuil de blâmes » / « 3 blâmes » des règles.
    await expect(page.getByText("Blâmes", { exact: true })).toBeVisible({ timeout: 30_000 });
    // Puce « Toi · 1 » (memberName(self) = « Toi », count = 1).
    await expect(page.getByText(/Toi\s*·\s*1/)).toBeVisible({ timeout: 20_000 });

    await deleteCurrentAccount(page);
  });
});
