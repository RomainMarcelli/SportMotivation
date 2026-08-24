import { expect, test } from "@playwright/test";

import { createGroup, currentGroupId, uniqueGroupName } from "./helpers/groups";
import { deleteCurrentAccount, signUpAndLand, uniqueUser } from "./helpers/signup";

/**
 * Invitation PAR PSEUDO + notification d'invitation (deux contextes) :
 *   1. Alice crée un défi ;
 *   2. Bob s'inscrit (profil public par défaut → trouvable par pseudo) ;
 *   3. Alice cherche Bob par son pseudo et l'invite ;
 *   4. Bob reçoit la notification « Voir l'invitation », l'ouvre et rejoint le défi.
 *
 * Couvre `InviteByHandle` (recherche + envoi), le flux notifications → accept-invite,
 * et l'acceptation réelle (`useAcceptInvitation`).
 */
test.describe("Invitations", () => {
  test("Alice invite Bob par pseudo → Bob accepte via ses notifications", async ({ browser }) => {
    test.setTimeout(180_000);

    const aliceCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const bobCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const alice = await aliceCtx.newPage();
    const bob = await bobCtx.newPage();

    try {
      // 1. Alice crée le défi.
      await signUpAndLand(alice, uniqueUser("ainv"));
      const groupName = uniqueGroupName();
      await createGroup(alice, groupName);
      const groupId = currentGroupId(alice);

      // 2. Bob s'inscrit (on retient son pseudo pour la recherche).
      const bobUser = uniqueUser("binv");
      await signUpAndLand(bob, bobUser);

      // 3. Alice ouvre « Inviter », cherche Bob par pseudo et l'invite.
      await alice.goto(`/group/${groupId}`);
      await alice.getByText("Inviter", { exact: true }).click();
      const search = alice.getByPlaceholder("Chercher un pseudo…");
      await expect(search).toBeVisible({ timeout: 30_000 });
      await search.fill(bobUser.username);
      // La fiche résultat porte « @pseudo ».
      await expect(alice.getByText(`@${bobUser.username}`)).toBeVisible({ timeout: 20_000 });
      // Deux boutons « Inviter » coexistent (celui du bandeau membres, derrière la
      // feuille, et celui de la fiche résultat) : la fiche est rendue en dernier.
      await alice.getByText("Inviter", { exact: true }).last().click();
      await expect(alice.getByText(/Invitation envoyée/)).toBeVisible({ timeout: 20_000 });

      // 4. Bob ouvre ses notifications, l'invitation y est → il l'accepte.
      await bob.goto("/notifications");
      await expect(bob.getByText("Voir l'invitation")).toBeVisible({ timeout: 30_000 });
      await bob.getByText("Voir l'invitation").click();

      await expect(bob.getByText(/J'ai lu et j'accepte/)).toBeVisible({ timeout: 30_000 });
      await bob.getByText(/J'ai lu et j'accepte/).click();
      await bob.getByText("Accepter et rejoindre").click();

      // Arrivée sur le tableau de bord du défi (CTA « Déclarer une séance » = membre actif).
      await expect(bob.getByText("Déclarer une séance")).toBeVisible({ timeout: 45_000 });

      await deleteCurrentAccount(bob);
      await deleteCurrentAccount(alice);
    } finally {
      await aliceCtx.close();
      await bobCtx.close();
    }
  });
});
