import {
  DEFAULT_NOTIFICATION_PREFS,
  mutedCount,
  prefsSummary,
  readNotificationPrefs,
} from "../notification-prefs";

describe("readNotificationPrefs", () => {
  it("active tout quand rien n'a été choisi", () => {
    expect(readNotificationPrefs({})).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });

  it("lit une catégorie coupée", () => {
    expect(readNotificationPrefs({ group_activity: false }).group_activity).toBe(false);
    expect(readNotificationPrefs({ group_activity: false }).votes).toBe(true);
  });

  // La colonne peut ne pas exister (SQL 035 pas encore passé), être nulle, ou
  // contenir n'importe quoi : jamais de plantage, jamais de notification perdue.
  it("tolère une valeur illisible", () => {
    expect(readNotificationPrefs(null)).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(readNotificationPrefs(undefined)).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(readNotificationPrefs("boom")).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(readNotificationPrefs([1, 2])).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });

  // Seul `false` coupe : une chaîne "false" ou un 0 sont des données bancales,
  // et on préfère envoyer une notification de trop qu'en priver quelqu'un.
  it("ne coupe que sur un vrai booléen false", () => {
    expect(readNotificationPrefs({ votes: "false" }).votes).toBe(true);
    expect(readNotificationPrefs({ votes: 0 }).votes).toBe(true);
    expect(readNotificationPrefs({ votes: null }).votes).toBe(true);
  });

  it("ignore les clés inconnues", () => {
    expect(readNotificationPrefs({ carrier_pigeon: false })).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });
});

describe("mutedCount", () => {
  it("compte les catégories coupées", () => {
    expect(mutedCount(DEFAULT_NOTIFICATION_PREFS)).toBe(0);
    expect(mutedCount(readNotificationPrefs({ votes: false, weekly_recap: false }))).toBe(2);
  });
});

describe("prefsSummary", () => {
  it("dit quand tout est actif", () => {
    expect(prefsSummary(DEFAULT_NOTIFICATION_PREFS)).toBe("Tout est activé");
  });

  it("accorde le pluriel", () => {
    expect(prefsSummary(readNotificationPrefs({ votes: false }))).toBe("1 catégorie coupée");
    expect(prefsSummary(readNotificationPrefs({ votes: false, challenge_end: false }))).toBe(
      "2 catégories coupées"
    );
  });

  it("dit quand tout est coupé", () => {
    const allMuted = readNotificationPrefs({
      session_reminders: false,
      weekly_recap: false,
      votes: false,
      group_activity: false,
      challenge_end: false,
    });
    expect(prefsSummary(allMuted)).toBe("Tout est coupé");
  });
});
