import { startOfWeekMonday, toDateOnly, weekStartString } from "../date";

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
