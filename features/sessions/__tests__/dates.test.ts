import {
  checkProofDate,
  declarableDateRange,
  endOfDay,
  isDeclarableDate,
  isSameLocalDay,
  parseExifDate,
} from "../dates";

describe("declarableDateRange", () => {
  it("borne min = lundi 00h00 de la semaine, borne max = fin de journée", () => {
    // Vendredi 13 juin 2026 14h30
    const now = new Date(2026, 5, 13, 14, 30);
    const { min, max } = declarableDateRange(now);
    // Lundi 8 juin 2026 00h00
    expect(min.getFullYear()).toBe(2026);
    expect(min.getMonth()).toBe(5);
    expect(min.getDate()).toBe(8);
    expect(min.getHours()).toBe(0);
    expect(min.getMinutes()).toBe(0);
    // Fin de journée du vendredi
    expect(max.getDate()).toBe(13);
    expect(max.getHours()).toBe(23);
    expect(max.getMinutes()).toBe(59);
  });

  it("un lundi : seul le lundi est sélectionnable (min == jour de max)", () => {
    const monday = new Date(2026, 5, 8, 9, 0); // lundi
    const { min, max } = declarableDateRange(monday);
    expect(min.getDate()).toBe(8);
    expect(max.getDate()).toBe(8);
  });

  it("un dimanche reste dans la même semaine (lundi précédent)", () => {
    const sunday = new Date(2026, 5, 14, 20, 0); // dimanche
    const { min } = declarableDateRange(sunday);
    expect(min.getDate()).toBe(8); // lundi 8
  });

  it("resserre min au début du défi si le défi démarre en milieu de semaine", () => {
    const now = new Date(2026, 5, 13, 14, 30); // vendredi 13
    // Défi démarré le mercredi 10 → le lundi 8 et mardi 9 ne sont plus sélectionnables.
    const { min } = declarableDateRange(now, "2026-06-10", "2026-09-10");
    expect(min.getDate()).toBe(10);
    expect(min.getMonth()).toBe(5);
  });

  it("ignore un début de défi antérieur au lundi de la semaine", () => {
    const now = new Date(2026, 5, 13, 14, 30);
    const { min } = declarableDateRange(now, "2026-05-01"); // bien avant → min reste lundi 8
    expect(min.getDate()).toBe(8);
  });

  it("resserre max à la fin du défi si le défi se termine cette semaine", () => {
    const now = new Date(2026, 5, 13, 14, 30); // vendredi 13
    const { max } = declarableDateRange(now, "2026-06-01", "2026-06-11"); // fin jeudi 11
    expect(max.getDate()).toBe(11);
    expect(max.getHours()).toBe(23);
  });
});

describe("isDeclarableDate", () => {
  const now = new Date(2026, 5, 13, 14, 30); // vendredi

  it("accepte un jour de la semaine en cours (lundi → aujourd'hui)", () => {
    expect(isDeclarableDate(new Date(2026, 5, 8, 7, 0), now)).toBe(true); // lundi
    expect(isDeclarableDate(new Date(2026, 5, 13, 6, 0), now)).toBe(true); // vendredi matin
  });

  it("refuse le futur (même dans la semaine)", () => {
    expect(isDeclarableDate(new Date(2026, 5, 14, 0, 0), now)).toBe(false); // dimanche
  });

  it("refuse la semaine précédente", () => {
    expect(isDeclarableDate(new Date(2026, 5, 7, 12, 0), now)).toBe(false); // dimanche d'avant
    expect(isDeclarableDate(new Date(2026, 5, 1, 12, 0), now)).toBe(false);
  });
});

describe("isSameLocalDay", () => {
  it("vrai pour deux heures du même jour", () => {
    expect(isSameLocalDay(new Date(2026, 5, 13, 8, 0), new Date(2026, 5, 13, 22, 0))).toBe(true);
  });
  it("faux pour deux jours différents", () => {
    expect(isSameLocalDay(new Date(2026, 5, 13), new Date(2026, 5, 12))).toBe(false);
  });
});

describe("checkProofDate", () => {
  const declared = new Date(2026, 5, 13, 0, 0);

  it("match si même jour", () => {
    expect(checkProofDate(new Date(2026, 5, 13, 9, 41), declared)).toEqual({
      ok: true,
      reason: "match",
    });
  });
  it("mismatch si jour différent (photo d'il y a 1 mois)", () => {
    expect(checkProofDate(new Date(2026, 4, 13, 9, 41), declared)).toEqual({
      ok: false,
      reason: "mismatch",
    });
  });
  it("missing si pas de date", () => {
    expect(checkProofDate(null, declared)).toEqual({ ok: false, reason: "missing" });
    expect(checkProofDate(undefined, declared)).toEqual({ ok: false, reason: "missing" });
  });
});

describe("parseExifDate", () => {
  it("parse le format EXIF DateTimeOriginal", () => {
    const d = parseExifDate({ DateTimeOriginal: "2026:06:13 09:41:07" });
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(5);
    expect(d!.getDate()).toBe(13);
    expect(d!.getHours()).toBe(9);
  });

  it("retombe sur DateTime puis sur le bloc {Exif} imbriqué", () => {
    expect(parseExifDate({ DateTime: "2026:06:13 10:00:00" })!.getDate()).toBe(13);
    expect(parseExifDate({ "{Exif}": { DateTimeOriginal: "2026:06:13 10:00:00" } })!.getDate()).toBe(
      13
    );
  });

  it("accepte un ISO en repli", () => {
    const d = parseExifDate({ DateTimeOriginal: "2026-06-13T09:41:07" });
    expect(d!.getDate()).toBe(13);
  });

  it("renvoie null si absent/illisible", () => {
    expect(parseExifDate(null)).toBeNull();
    expect(parseExifDate(undefined)).toBeNull();
    expect(parseExifDate({})).toBeNull();
    expect(parseExifDate({ DateTimeOriginal: "n'importe quoi" })).toBeNull();
  });
});

describe("endOfDay", () => {
  it("met l'heure à 23:59:59.999", () => {
    const e = endOfDay(new Date(2026, 5, 13, 3, 0));
    expect(e.getHours()).toBe(23);
    expect(e.getMinutes()).toBe(59);
    expect(e.getMilliseconds()).toBe(999);
  });
});
