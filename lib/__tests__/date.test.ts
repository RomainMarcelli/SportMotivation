import {
  daysUntil,
  formatDateRange,
  formatDbDate,
  startOfWeekMonday,
  toDateOnly,
  weekStartString,
} from "../date";

describe("toDateOnly", () => {
  it("formate en YYYY-MM-DD avec les composantes locales", () => {
    const d = new Date(2026, 5, 1, 14, 30); // 1 juin 2026 14h30 local
    expect(toDateOnly(d)).toBe("2026-06-01");
  });

  it("pad les mois et jours sur 2 chiffres", () => {
    const d = new Date(2026, 0, 5); // 5 janvier 2026
    expect(toDateOnly(d)).toBe("2026-01-05");
  });
});

describe("startOfWeekMonday", () => {
  it("retourne le lundi pour un mercredi", () => {
    // 2026-05-20 est un mercredi
    const wed = new Date(2026, 4, 20);
    expect(toDateOnly(startOfWeekMonday(wed))).toBe("2026-05-18"); // lundi
  });

  it("retourne le lundi même pour un lundi", () => {
    const mon = new Date(2026, 4, 18);
    expect(toDateOnly(startOfWeekMonday(mon))).toBe("2026-05-18");
  });

  it("retourne le lundi précédent pour un dimanche", () => {
    // 2026-05-24 est un dimanche
    const sun = new Date(2026, 4, 24);
    expect(toDateOnly(startOfWeekMonday(sun))).toBe("2026-05-18");
  });
});

describe("weekStartString", () => {
  it("combine startOfWeekMonday et toDateOnly", () => {
    expect(weekStartString(new Date(2026, 4, 22))).toBe("2026-05-18");
  });
});

describe("daysUntil", () => {
  const from = new Date(2026, 5, 15, 22, 0); // 15 juin 2026, soir

  it("0 le jour même (ignore l'heure)", () => {
    expect(daysUntil("2026-06-15", from)).toBe(0);
  });

  it("positif dans le futur", () => {
    expect(daysUntil("2026-08-01", from)).toBe(47);
  });

  it("négatif dans le passé", () => {
    expect(daysUntil("2026-06-10", from)).toBe(-5);
  });
});

describe("formatDateRange", () => {
  // On vérifie la STRUCTURE (mois en toutes lettres, flèche, année sur la fin
  // seulement) plutôt qu'une chaîne figée : le rendu exact dépend d'ICU.
  it("affiche « début → fin » avec l'année portée par la fin", () => {
    const range = formatDateRange(new Date(2026, 5, 1), new Date(2026, 7, 31));
    const [left, right] = range.split("→");
    expect(left).toContain("juin");
    expect(left).not.toContain("2026"); // le début ne porte pas l'année
    expect(right).toContain("août");
    expect(right).toContain("2026");
  });
});

describe("formatDbDate", () => {
  it("formate une date DB en français", () => {
    const out = formatDbDate("2026-06-01");
    expect(out).toContain("juin");
    expect(out).toContain("2026");
  });

  // Tolère un timestamp complet : on ne garde que la partie date.
  it("accepte un timestamp et n'en garde que le jour", () => {
    expect(formatDbDate("2026-06-01T10:30:00Z")).toContain("juin");
  });

  // Cas de tolérance : jamais de « Invalid time value » qui casserait l'écran.
  it("renvoie une chaîne vide sur une valeur absente ou illisible", () => {
    expect(formatDbDate(null)).toBe("");
    expect(formatDbDate(undefined)).toBe("");
    expect(formatDbDate("")).toBe("");
    expect(formatDbDate("pas-une-date")).toBe("");
  });
});
