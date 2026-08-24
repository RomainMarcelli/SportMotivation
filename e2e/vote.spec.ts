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
 * Scénario de VOTE à deux comptes (deux contextes de navigateur isolés, chacun sa
 * session Supabase) :
 *   1. Alice crée un défi et récupère son code d'invitation ;
 *   2. Bob rejoint le défi avec ce code ;
 *   3. Alice déclare une séance (preuve photo) → elle devient votable pour Bob ;
 *   4. Bob ouvre le deck de vote et VALIDE la séance d'Alice.
 *
 * À 2 membres, le seuil de majorité est 1 (`voteThreshold`), donc le seul vote de
 * Bob suffit : après validation, le deck passe à l'état « Tu es à jour ».
 */
test.describe("Vote", () => {
  test("Bob valide la séance déclarée par Alice", async ({ browser }) => {
    // Flux lourd (2 inscriptions + création + adhésion + déclaration photo + vote) :
    // le budget par défaut de 90 s est trop court, on le porte à 3 min.
    test.setTimeout(180_000);

    // Deux contextes = deux navigateurs indépendants (cookies/localStorage séparés)
    // → deux comptes réellement connectés en parallèle.
    const aliceCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const bobCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const alice = await aliceCtx.newPage();
    const bob = await bobCtx.newPage();

    try {
      // 1. Alice crée le défi et lit le code d'invitation.
      await signUpAndLand(alice, uniqueUser("alice"));
      const groupName = uniqueGroupName();
      await createGroup(alice, groupName);
      const groupId = currentGroupId(alice);
      const code = await revealInviteCode(alice);

      // 2. Bob rejoint le même défi avec le code.
      await signUpAndLand(bob, uniqueUser("bob"));
      await joinGroupByCode(bob, code, groupName);

      // 3. Alice déclare une séance. On revient au tableau de bord pour fermer la
      //    feuille d'invitation restée ouverte, puis on déclare.
      await alice.goto(`/group/${groupId}`);
      await declareRunSession(alice);

      // 4. Bob ouvre le deck de vote du groupe et valide la séance d'Alice.
      await bob.goto(`/group/${groupId}/vote`);
      await expect(bob.getByText("À valider")).toBeVisible({ timeout: 30_000 });
      // La carte porte le prénom de l'auteur (les comptes de test s'appellent « Test »).
      await expect(bob.getByText("a déclaré une séance")).toBeVisible({ timeout: 30_000 });
      await bob.getByLabel("Valider", { exact: true }).click();

      // La seule séance votable ayant été traitée, le deck passe à « Tu es à jour ».
      await expect(bob.getByText("Tu es à jour")).toBeVisible({ timeout: 20_000 });

      // Nettoyage : suppression réelle des deux comptes jetables.
      await deleteCurrentAccount(bob);
      await deleteCurrentAccount(alice);
    } finally {
      await aliceCtx.close();
      await bobCtx.close();
    }
  });
});
