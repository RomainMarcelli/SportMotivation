import { expect, type Page } from "@playwright/test";

/** Nom de défi unique par exécution (évite les collisions entre lancements). */
export function uniqueGroupName(tag = "E2E Défi"): string {
  return `${tag} ${Date.now()}`;
}

/**
 * Crée un défi depuis /group/create. Seuls le NOM et l'acceptation des règles sont
 * requis pour activer « Créer le défi » : les activités sont pré-sélectionnées par
 * défaut (`DEFAULT_SPORTS`) et le reste a des valeurs par défaut. Attend l'arrivée
 * sur le tableau de bord du groupe (le nom s'affiche dans l'entête).
 */
export async function createGroup(page: Page, name: string) {
  await page.goto("/group/create", { waitUntil: "domcontentloaded" });
  await expect(page.getByPlaceholder("Défi de l'été")).toBeVisible({ timeout: 60_000 });
  await page.getByPlaceholder("Défi de l'été").fill(name);
  // Case « ces règles seront figées au lancement » — obligatoire (schéma Zod).
  await page.getByText(/ces règles seront/).click();
  await page.getByText("Créer le défi").click();
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 45_000 });
}

/**
 * Lit l'ID du groupe dans l'URL courante (`/group/<uuid>` avec d'éventuels
 * paramètres `?solo=…&tab=…`). À appeler une fois arrivé sur le tableau de bord.
 */
export function currentGroupId(page: Page): string {
  const match = /\/group\/([^/?#]+)/.exec(page.url());
  if (!match) throw new Error(`Impossible d'extraire l'ID du groupe de l'URL : ${page.url()}`);
  return match[1];
}

/**
 * Depuis le tableau de bord d'un groupe, ouvre la feuille « Inviter », déplie le
 * bloc « Code, QR code et lien » et renvoie le code d'invitation à 6 chiffres.
 * (C'est ce code qu'un autre joueur saisit dans `/group/join` pour rejoindre.)
 */
export async function revealInviteCode(page: Page): Promise<string> {
  await page.getByText("Inviter", { exact: true }).click();
  // La feuille est ouverte : le bloc code démarre replié → on le déplie.
  await page.getByText("Code, QR code et lien").click();
  // Le code s'affiche en grand (seul texte « 6 chiffres exactement » de l'écran).
  const codeNode = page.getByText(/^\d{6}$/).first();
  await expect(codeNode).toBeVisible({ timeout: 15_000 });
  const code = (await codeNode.textContent())?.trim();
  if (!code || !/^\d{6}$/.test(code)) throw new Error(`Code d'invitation illisible : « ${code} »`);
  return code;
}

/**
 * Rejoint un groupe via son code à 6 chiffres : `/group/join` → « Voir le défi »
 * → acceptation des règles → « Rejoindre le défi ». Attend l'arrivée sur le
 * tableau de bord (le nom du défi s'affiche).
 */
export async function joinGroupByCode(page: Page, code: string, expectedName: string) {
  await page.goto("/group/join", { waitUntil: "domcontentloaded" });
  const codeInput = page.getByPlaceholder("123456");
  await expect(codeInput).toBeVisible({ timeout: 60_000 });
  await codeInput.fill(code);
  await page.getByText("Voir le défi").click();

  // Écran de confirmation : on accepte les règles (obligatoire) puis on rejoint.
  await expect(page.getByText(/J'accepte les règles/)).toBeVisible({ timeout: 45_000 });
  await page.getByText(/J'accepte les règles/).click();
  await page.getByText("Rejoindre le défi").click();

  await expect(page.getByText(expectedName).first()).toBeVisible({ timeout: 45_000 });
}
