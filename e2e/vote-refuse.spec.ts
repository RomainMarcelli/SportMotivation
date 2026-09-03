import { expect, test } from "@playwright/test";

import {
  createGroup,
  currentGroupId,
  joinGroupByCode,
  revealInviteCode,
  uniqueGroupName,
} from "./helpers/groups";
import { declareRunSession } from "./helpers/sessions";
import { deleteCurrentAccount, signUpAndLand, uniqueUser } from "./helpers/signup";

/**
 * Vote — chemin du REFUS (deux contextes) : Alice déclare une séance, Bob la REFUSE
 * via la modale d'explication (commentaire transmis à l'auteur). Complète `vote.spec`
 * (qui ne couvre que « valider »).
 */
test.describe("Vote — refus", () => {
  test("Bob refuse la séance d'Alice avec un commentaire", async ({ browser }) => {
    test.setTimeout(180_000);

    const aliceCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const bobCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const alice = await aliceCtx.newPage();
    const bob = await bobCtx.newPage();

    try {
      await signUpAndLand(alice, uniqueUser("aref"));
      const groupName = uniqueGroupName();
      await createGroup(alice, groupName);
      const groupId = currentGroupId(alice);
      const code = await revealInviteCode(alice);

      await signUpAndLand(bob, uniqueUser("bref"));
      await joinGroupByCode(bob, code, groupName);

      // Alice déclare (Bob doit rejoindre AVANT — règle joined_at).
      await alice.goto(`/group/${groupId}`, { waitUntil: "domcontentloaded" });
      await declareRunSession(alice);

      // Bob ouvre le deck, ouvre la modale de refus, explique, puis refuse.
      await bob.goto(`/group/${groupId}/vote`, { waitUntil: "domcontentloaded" });
      await expect(bob.getByText("À valider")).toBeVisible({ timeout: 30_000 });
      await bob.getByLabel("Refuser", { exact: true }).click();

      // Modale : « Refuser cette séance ? » + champ d'explication + bouton.
      const comment = bob.getByPlaceholder(/la preuve ne correspond pas/);
      await expect(comment).toBeVisible({ timeout: 15_000 });
      await comment.fill("La photo ne prouve pas la séance.");
      await bob.getByText("Refuser la séance").click();

      // Seule séance traitée → deck vide.
      await expect(bob.getByText("Tu es à jour")).toBeVisible({ timeout: 20_000 });

      await deleteCurrentAccount(bob);
      await deleteCurrentAccount(alice);
    } finally {
      await aliceCtx.close();
      await bobCtx.close();
    }
  });
});
