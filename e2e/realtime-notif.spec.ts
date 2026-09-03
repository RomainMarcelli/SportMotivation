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
 * Notification en TEMPS RÉEL (deux contextes). Alice reste sur l'écran Notifications ;
 * Bob rejoint le défi. La notification « Nouveau membre » doit apparaître chez Alice
 * SANS rechargement (abonnement Realtime, SQL 058 + `useNotificationsRealtime`).
 *
 * La liste n'a pas de rafraîchissement périodique : si elle se met à jour toute
 * seule, c'est bien le Realtime qui a agi. Marge élargie (30 s) car la livraison
 * temps réel peut varier.
 */
test.describe("Notifications temps réel", () => {
  test("une notif apparaît chez Alice sans rechargement", async ({ browser }) => {
    test.setTimeout(240_000);

    const aliceCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const bobCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const alice = await aliceCtx.newPage();
    const bob = await bobCtx.newPage();

    try {
      await signUpAndLand(alice, uniqueUser("art"));
      const groupName = uniqueGroupName();
      await createGroup(alice, groupName);
      const groupId = currentGroupId(alice);
      const code = await revealInviteCode(alice);

      // Alice s'installe sur l'écran Notifications (vide au départ), abonnée au Realtime.
      await alice.goto("/notifications", { waitUntil: "domcontentloaded" });
      await expect(alice.getByText("Rien pour l'instant")).toBeVisible({ timeout: 30_000 });

      // Bob rejoint → insère une notif « member_joined » pour l'admin Alice.
      await signUpAndLand(bob, uniqueUser("brt"));
      await joinGroupByCode(bob, code, groupName);

      // Alice NE recharge PAS : la notif doit surgir via l'abonnement temps réel.
      await expect(alice.getByText(/vient de rejoindre/)).toBeVisible({ timeout: 30_000 });

      // (`groupId` est capturé pour le contexte du défi ; l'assertion porte sur la notif.)
      expect(groupId).toBeTruthy();

      await deleteCurrentAccount(bob);
      await deleteCurrentAccount(alice);
    } finally {
      await aliceCtx.close();
      await bobCtx.close();
    }
  });
});
