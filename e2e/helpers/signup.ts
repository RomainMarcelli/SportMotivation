import { expect, type Page } from "@playwright/test";

/** Identité de test jetable. */
export type TestUser = {
  firstName: string;
  username: string;
  email: string;
  password: string;
};

/**
 * Identité UNIQUE par exécution (horodatage + aléa) → pas de collision entre
 * lancements successifs sur le backend partagé. Pseudo borné à 24 caractères
 * pour laisser la place aux suffixes de suggestion (30 max).
 */
export function uniqueUser(tag = "e2e"): TestUser {
  const id = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    firstName: "Test",
    username: `${tag}${id}`.slice(0, 24),
    email: `${tag}.${id}@example.com`,
    password: "Motdepasse1!",
  };
}

/** Ouvre l'écran d'inscription et attend qu'il soit prêt (bundle web lent au 1er chargement). */
export async function gotoSignUp(page: Page) {
  await page.goto("/sign-up");
  await expect(page.getByText("Crée ton compte")).toBeVisible({ timeout: 60_000 });
}

/** Remplit les champs du formulaire d'inscription (sans soumettre). */
export async function fillSignUp(page: Page, u: TestUser) {
  await page.getByPlaceholder("Romain").fill(u.firstName);
  await page.getByPlaceholder("romz").fill(u.username);
  await page.getByPlaceholder("ton@email.com").fill(u.email);
  await page.getByPlaceholder("8 caractères minimum").fill(u.password);
  await page.getByPlaceholder("Saisis-le à nouveau").fill(u.password);
}

/**
 * Crée un compte de bout en bout et attend d'arriver sur l'accueil (« Salut … »).
 * Confirmation e-mail désactivée → session directe après « Créer mon compte ».
 */
export async function signUpAndLand(page: Page, u: TestUser) {
  await gotoSignUp(page);
  await fillSignUp(page, u);
  await page.getByText("Créer mon compte").click();
  await expect(page.getByText(/Salut/)).toBeVisible({ timeout: 45_000 });
}

/**
 * Se connecte avec un compte existant depuis l'écran de connexion, puis attend
 * l'arrivée sur l'accueil (« Salut … »).
 */
export async function signIn(page: Page, u: Pick<TestUser, "email" | "password">) {
  await page.goto("/sign-in");
  await expect(page.getByText("Content de te revoir")).toBeVisible({ timeout: 60_000 });
  await page.getByPlaceholder("ton@email.com").fill(u.email);
  await page.getByPlaceholder("Ton mot de passe").fill(u.password);
  await page.getByText("Se connecter").click();
  await expect(page.getByText(/Salut/)).toBeVisible({ timeout: 45_000 });
}

/**
 * Déconnecte le compte courant : Réglages → « Se déconnecter » → confirmation
 * « Me déconnecter ». Attend le retour sur l'écran de connexion.
 */
export async function signOut(page: Page) {
  await page.goto("/settings");
  await page.getByText("Se déconnecter").click({ timeout: 30_000 });
  await page.getByText("Me déconnecter").click();
  // La déconnexion (async) fait quitter la zone authentifiée : on attend que
  // l'écran Réglages disparaisse (« Supprimer définitivement » lui est propre).
  await expect(page.getByText("Supprimer définitivement")).toHaveCount(0, { timeout: 30_000 });
  // Selon l'état d'onboarding LOCAL, l'app atterrit sur /onboarding ou /sign-in :
  // on rejoint explicitement la connexion. Si on était encore connecté, le guard
  // de route redirigerait vers l'app → l'assertion échouerait (donc c'est un vrai test).
  await page.goto("/sign-in");
  await expect(page.getByText("Content de te revoir")).toBeVisible({ timeout: 30_000 });
}

/**
 * Supprime le compte actuellement connecté (nettoyage). Enchaîne : Réglages →
 * « Supprimer définitivement » → confirmation « Supprimer » → accusé « Fermer ».
 * Best-effort : on n'échoue pas le test à cause du seul nettoyage.
 */
export async function deleteCurrentAccount(page: Page) {
  try {
    // Marge élargie : en suite complète le serveur web ralentit et un `goto` par
    // défaut (60 s) pouvait expirer → compte de test non nettoyé. Le nettoyage est
    // best-effort (try/catch), mais autant lui laisser le temps d'aboutir.
    await page.goto("/settings", { timeout: 90_000 });
    await page.getByText("Supprimer définitivement").click({ timeout: 30_000 });
    await page.getByText("Supprimer", { exact: true }).click();
    await expect(page.getByText("Compte supprimé")).toBeVisible({ timeout: 30_000 });
    await page.getByText("Fermer").click();
  } catch (err) {
    // Le nettoyage a échoué : on le signale sans casser le test fonctionnel.
    console.warn("[e2e] nettoyage du compte de test impossible :", err);
  }
}
