import { expect, type Page } from "@playwright/test";

/** Image de preuve (PNG sans EXIF → le contrôle anti-fraude de date ne bloque pas). */
const PROOF_FILE = "e2e/fixtures/proof.png";

/**
 * Déclare une séance depuis le tableau de bord d'un groupe : activité « Course »
 * (dans les sports par défaut → pas d'avertissement), durée par défaut, preuve
 * PHOTO via l'upload d'un fichier (l'ImagePicker web ouvre un `<input type=file>`
 * que Playwright intercepte). Termine sur « Valider la séance ».
 */
export async function declareRunSession(page: Page, options: { distanceKm?: string } = {}) {
  // Le bouton du dashboard ouvre l'écran de déclaration.
  await page.getByText("Déclarer une séance").click();
  await expect(page.getByText("Course", { exact: true })).toBeVisible({ timeout: 30_000 });
  await page.getByText("Course", { exact: true }).click();

  if (options.distanceKm) {
    await page.getByPlaceholder("Ex. 8,2 km").fill(options.distanceKm);
  }

  // Preuve photo : l'ImagePicker web ouvre un sélecteur de fichier. On l'intercepte
  // via l'event `filechooser` et on fournit l'image (méthode `setFiles` du FileChooser,
  // pas `setInputFiles`). Sans handler, Playwright l'annulerait et l'input disparaîtrait.
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByText("Choisir un fichier").click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(PROOF_FILE);

  // Photo posée → le bloc « Photo ajoutée » apparaît et « Valider » s'active.
  await expect(page.getByText("Photo ajoutée")).toBeVisible({ timeout: 20_000 });
  await page.getByText("Valider la séance").click();
}

/**
 * Déclare une séance avec un sport NON listé (chip « Autre » → saisie libre), preuve
 * photo, puis PRÉVIENT l'admin depuis la modale d'avertissement. Résultat : une
 * demande d'ajout (`activity_request`) parvient à l'admin. Réutilisé par les flux
 * vote de groupe / refus de sport / temps réel.
 */
export async function declareUnlistedSport(page: Page, groupId: string, sport: string) {
  await page.goto(`/group/${groupId}/declare`, { waitUntil: "domcontentloaded" });
  // `exact` : le chip « Autre » (le texte d'aide contient aussi « Autre »).
  await expect(page.getByText("Autre", { exact: true })).toBeVisible({ timeout: 30_000 });
  await page.getByText("Autre", { exact: true }).click();
  const custom = page.getByPlaceholder("Précise ton sport (ex. Boxe Thaï)");
  await custom.fill(sport);
  await custom.press("Enter"); // onSubmitEditing → valide et sélectionne le sport

  const fc = page.waitForEvent("filechooser");
  await page.getByText("Choisir un fichier").click();
  await (await fc).setFiles(PROOF_FILE);
  await expect(page.getByText("Photo ajoutée")).toBeVisible({ timeout: 20_000 });

  await page.getByText("Valider la séance").click();
  // Sport non autorisé → modale : on prévient l'admin de l'ajouter.
  await expect(page.getByText("Prévenir l'admin de l'ajouter")).toBeVisible({ timeout: 15_000 });
  await page.getByText("Prévenir l'admin de l'ajouter").click();
  await expect(page.getByText(/Demande envoyée à l'admin pour ajouter/)).toBeVisible({
    timeout: 20_000,
  });
}
