import { expect, test } from "@playwright/test";

import {
  createGroup,
  currentGroupId,
  joinGroupByCode,
  revealInviteCode,
  uniqueGroupName,
} from "./helpers/groups";
import { deleteCurrentAccount, signUpAndLand, uniqueUser } from "./helpers/signup";

/**
 * Pénalité par joueur (deux contextes) — vraie règle métier. Depuis « Modifier le
 * défi », l'admin propose une nouvelle pénalité à Bob (chaque membre peut avoir la
 * sienne). Bob reçoit la proposition et l'ACCEPTE depuis l'écran de réponse. Couvre
 * `propose_penalty_change` + `respond_penalty_change`.
 *
 * L'écran de réponse (ancienne DA) confirme via `Alert` — inopérant/non fiable sur
 * web : on vérifie l'acceptation en RECHARGEANT l'écran (le statut passé à `accepted`
 * affiche « Cette demande a déjà été traitée. »), assertion indépendante de l'Alert.
 */
test.describe("Pénalité par joueur", () => {
  test("l'admin propose une pénalité à Bob, Bob l'accepte", async ({ browser }) => {
    test.setTimeout(240_000);

    const aliceCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const bobCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const alice = await aliceCtx.newPage();
    const bob = await bobCtx.newPage();

    try {
      await signUpAndLand(alice, uniqueUser("apen"));
      const groupName = uniqueGroupName();
      await createGroup(alice, groupName);
      const groupId = currentGroupId(alice);
      const code = await revealInviteCode(alice);

      // Prénom distinct « Bob » → cible sa carte de pénalité (testID `penalty-row-Bob`).
      await signUpAndLand(bob, { ...uniqueUser("bpen"), firstName: "Bob" });
      await joinGroupByCode(bob, code, groupName);

      // Alice ouvre « Modifier le défi » et propose une nouvelle pénalité à Bob.
      await alice.goto(`/group/${groupId}/edit`);
      const bobCard = alice.getByTestId("penalty-row-Bob");
      await expect(bobCard).toBeVisible({ timeout: 30_000 });
      // +1 € sur le stepper de Bob → le bouton « Proposer … à Bob » apparaît.
      await bobCard.getByLabel("Augmenter").click();
      const proposeBtn = bobCard.getByText(/Proposer .* à Bob/);
      await expect(proposeBtn).toBeVisible({ timeout: 15_000 });
      await proposeBtn.click();
      await expect(alice.getByText(/Proposition envoyée à Bob/)).toBeVisible({ timeout: 20_000 });

      // Bob reçoit la proposition et ouvre l'écran de réponse.
      await bob.goto("/notifications");
      await expect(bob.getByText("Changement de pénalité proposé")).toBeVisible({ timeout: 30_000 });
      await bob.getByText("Répondre").click();
      // `exact` : la notif « Changement de pénalité proposé » contient le même début.
      await expect(bob.getByText("Changement de pénalité", { exact: true })).toBeVisible({
        timeout: 20_000,
      });

      // Bob accepte → la RPC passe le statut à `accepted`.
      await bob.getByText("Accepter").click();
      // L'Alert de confirmation n'est pas fiable sur web : on recharge et on lit le
      // statut persisté (« déjà traitée » ⇒ la réponse a bien été enregistrée).
      await bob.waitForTimeout(1500);
      await bob.reload();
      await expect(bob.getByText(/déjà été traitée/)).toBeVisible({ timeout: 20_000 });

      await deleteCurrentAccount(bob);
      await deleteCurrentAccount(alice);
    } finally {
      await aliceCtx.close();
      await bobCtx.close();
    }
  });
});
