import { expect, test } from "@playwright/test";

import {
  createGroup,
  currentGroupId,
  joinGroupByCode,
  revealInviteCode,
  uniqueGroupName,
} from "./helpers/groups";
import { deleteCurrentAccount, signUpAndLand, uniqueUser } from "./helpers/signup";

const PROOF_FILE = "e2e/fixtures/proof.png";

/**
 * Demande d'ajout de sport (deux contextes, loop complet) : Bob déclare une séance
 * avec un sport NON listé (« Escalade »), ce qui déclenche la modale d'avertissement
 * → il PRÉVIENT l'admin. Alice (admin) reçoit la demande dans ses notifications et
 * AJOUTE le sport au défi. Couvre `requestActivity` (déclaration) + `useAddActivity`
 * (action de notification).
 */
test.describe("Demande d'ajout de sport", () => {
  test("Bob propose un sport non listé → Alice l'ajoute", async ({ browser }) => {
    test.setTimeout(240_000);

    const aliceCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const bobCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const alice = await aliceCtx.newPage();
    const bob = await bobCtx.newPage();

    try {
      await signUpAndLand(alice, uniqueUser("aact"));
      const groupName = uniqueGroupName();
      await createGroup(alice, groupName);
      const groupId = currentGroupId(alice);
      const code = await revealInviteCode(alice);

      await signUpAndLand(bob, uniqueUser("bact"));
      await joinGroupByCode(bob, code, groupName);

      // Bob déclare une séance avec un sport non listé (« Autre » → saisie custom).
      await bob.goto(`/group/${groupId}/declare`, { waitUntil: "domcontentloaded" });
      // `exact` : le chip « Autre » (le texte d'aide contient aussi « Autre »).
      await expect(bob.getByText("Autre", { exact: true })).toBeVisible({ timeout: 30_000 });
      await bob.getByText("Autre", { exact: true }).click();
      const custom = bob.getByPlaceholder("Précise ton sport (ex. Boxe Thaï)");
      await custom.fill("Escalade");
      await custom.press("Enter"); // onSubmitEditing → valide et sélectionne le sport

      // Preuve photo (comme la déclaration standard).
      const fc = bob.waitForEvent("filechooser");
      await bob.getByText("Choisir un fichier").click();
      await (await fc).setFiles(PROOF_FILE);
      await expect(bob.getByText("Photo ajoutée")).toBeVisible({ timeout: 20_000 });

      await bob.getByText("Valider la séance").click();

      // Sport non autorisé → modale : Bob prévient l'admin.
      await expect(bob.getByText("Prévenir l'admin de l'ajouter")).toBeVisible({ timeout: 15_000 });
      await bob.getByText("Prévenir l'admin de l'ajouter").click();
      await expect(bob.getByText(/Demande envoyée à l'admin pour ajouter/)).toBeVisible({ timeout: 20_000 });

      // Alice reçoit la demande et ajoute le sport depuis ses notifications.
      await alice.goto("/notifications", { waitUntil: "domcontentloaded" });
      const addBtn = alice.getByText(/Ajouter « Escalade »/);
      await expect(addBtn).toBeVisible({ timeout: 30_000 });
      await addBtn.click();
      await expect(alice.getByText(/ajouté au défi/)).toBeVisible({ timeout: 20_000 });

      await deleteCurrentAccount(bob);
      await deleteCurrentAccount(alice);
    } finally {
      await aliceCtx.close();
      await bobCtx.close();
    }
  });
});
