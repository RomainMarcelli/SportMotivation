import { expect, test } from "@playwright/test";

import {
  createGroup,
  currentGroupId,
  joinGroupByCode,
  revealInviteCode,
  uniqueGroupName,
} from "./helpers/groups";
import { isoOffsetDays, setWebDate } from "./helpers/forms";
import { deleteCurrentAccount, signUpAndLand, uniqueUser } from "./helpers/signup";

/**
 * Suspensions (deux contextes) : Alice (admin) crée un défi, Bob rejoint, puis Alice
 * SUSPEND Bob depuis l'écran dédié (choix du membre + dates + motif). Une suspension
 * posée par l'admin est immédiatement « active » → elle apparaît en « En cours ».
 *
 * Bob a un prénom distinct (« Bob ») pour cibler sa puce sans ambiguïté (les comptes
 * de test s'appellent tous « Test »).
 */
test.describe("Suspensions", () => {
  test("l'admin suspend un membre → la suspension passe en cours", async ({ browser }) => {
    test.setTimeout(180_000);

    const aliceCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const bobCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const alice = await aliceCtx.newPage();
    const bob = await bobCtx.newPage();

    try {
      await signUpAndLand(alice, uniqueUser("asus"));
      const groupName = uniqueGroupName();
      await createGroup(alice, groupName);
      const groupId = currentGroupId(alice);
      const code = await revealInviteCode(alice);

      // Bob rejoint (prénom « Bob » pour une puce identifiable).
      const bobUser = { ...uniqueUser("bsus"), firstName: "Bob" };
      await signUpAndLand(bob, bobUser);
      await joinGroupByCode(bob, code, groupName);

      // Alice ouvre l'écran Suspensions et suspend Bob.
      await alice.goto(`/group/${groupId}/suspensions`);
      await expect(alice.getByText("Suspendre un membre")).toBeVisible({ timeout: 30_000 });

      // Choisir le membre (seule puce « Bob » sélectionnable).
      await alice.getByText("Bob", { exact: true }).click();

      // Dates (la fenêtre de défi par défaut couvre 3 mois → +1/+2 j sont valides).
      await setWebDate(alice, "Début", isoOffsetDays(1));
      await setWebDate(alice, "Fin", isoOffsetDays(2));

      await alice.getByText("Suspendre", { exact: true }).click();

      // Confirmation + la suspension apparaît en « En cours ».
      await expect(alice.getByText(/Bob est suspendu/)).toBeVisible({ timeout: 20_000 });
      await expect(alice.getByText("En cours")).toBeVisible({ timeout: 20_000 });

      await deleteCurrentAccount(bob);
      await deleteCurrentAccount(alice);
    } finally {
      await aliceCtx.close();
      await bobCtx.close();
    }
  });
});
