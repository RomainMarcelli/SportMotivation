import { test } from "@playwright/test";

import { createGroup, uniqueGroupName } from "./helpers/groups";
import { deleteCurrentAccount, signUpAndLand, uniqueUser } from "./helpers/signup";

test.describe("Groupes", () => {
  test("créer un défi → arrivée sur le tableau de bord", async ({ page }) => {
    await signUpAndLand(page, uniqueUser());
    await createGroup(page, uniqueGroupName());
    // Nettoyage : la suppression du compte efface aussi le défi créé (dont on est admin/seul).
    await deleteCurrentAccount(page);
  });
});
