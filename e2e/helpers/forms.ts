import { type Page } from "@playwright/test";

/**
 * Renseigne un `<input type="date">` de l'app sur le web. `DateField` superpose un
 * input natif CACHÉ (opacity 0, 1×1, `pointer-events:none`) qui porte la valeur et
 * déclenche le `onChange` React — il n'est donc pas « visible » au sens Playwright,
 * et `fill()` échouerait. On écrit la valeur via le setter natif du prototype (pour
 * que React détecte le changement) puis on émet `input`/`change`.
 *
 * @param label le libellé du champ = son `aria-label` (« Début », « Fin »…).
 * @param iso   date au format "YYYY-MM-DD".
 */
export async function setWebDate(page: Page, label: string, iso: string) {
  const input = page.getByLabel(label, { exact: true });
  await input.evaluate((el, value) => {
    const proto = window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    setter?.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, iso);
}

/** Date locale + `offsetDays` au format "YYYY-MM-DD" (pour des dates relatives à aujourd'hui). */
export function isoOffsetDays(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
