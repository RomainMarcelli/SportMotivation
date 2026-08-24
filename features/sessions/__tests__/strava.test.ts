import {
  describeStravaError,
  formatStravaActivity,
  stravaActivityDate,
  stravaDurationToMinutes,
  stravaTypeToActivityId,
  toStravaProofData,
  type StravaActivity,
} from "../strava";
import { isSameLocalDay } from "../dates";

const activity: StravaActivity = {
  id: 999,
  name: "Sortie longue",
  type: "Run",
  distance: 10250,
  moving_time: 3120, // 52 min
  start_date_local: "2026-05-20T07:00:00Z",
};

describe("stravaTypeToActivityId", () => {
  it("mappe les types connus", () => {
    expect(stravaTypeToActivityId("Run")).toBe("running");
    expect(stravaTypeToActivityId("Ride")).toBe("cycling");
    expect(stravaTypeToActivityId("Swim")).toBe("swimming");
    expect(stravaTypeToActivityId("Hike")).toBe("hiking");
    expect(stravaTypeToActivityId("WeightTraining")).toBe("weight_training");
    expect(stravaTypeToActivityId("Yoga")).toBe("yoga");
  });
  it("retombe sur 'other' pour un type inconnu", () => {
    expect(stravaTypeToActivityId("KiteSurf")).toBe("other");
  });
});

describe("stravaDurationToMinutes", () => {
  it("convertit les secondes en minutes arrondies", () => {
    expect(stravaDurationToMinutes(3120)).toBe(52);
    expect(stravaDurationToMinutes(29)).toBe(1); // minimum 1
  });
});

describe("toStravaProofData", () => {
  it("condense l'activité", () => {
    expect(toStravaProofData(activity)).toEqual({
      activity_id: 999,
      name: "Sortie longue",
      type: "Run",
      distance_m: 10250,
      moving_time_s: 3120,
      start_date_local: "2026-05-20T07:00:00Z",
    });
  });
  it("préfère sport_type si présent", () => {
    expect(toStravaProofData({ ...activity, sport_type: "TrailRun" }).type).toBe("TrailRun");
  });
});

describe("formatStravaActivity", () => {
  it("affiche nom, distance et durée", () => {
    expect(formatStravaActivity(activity)).toBe("Sortie longue — 10.3 km · 52 min");
  });
});

describe("stravaActivityDate", () => {
  it("parse start_date_local en Date", () => {
    const d = stravaActivityDate({ ...activity, start_date_local: "2026-06-13T07:00:00" });
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(5);
    expect(d!.getDate()).toBe(13);
  });

  it("null si date absente/illisible", () => {
    expect(stravaActivityDate({ ...activity, start_date_local: "" })).toBeNull();
    expect(stravaActivityDate({ ...activity, start_date_local: "xxx" })).toBeNull();
  });

  it("permet de vérifier la correspondance avec la date déclarée", () => {
    const sameDay = stravaActivityDate({ ...activity, start_date_local: "2026-06-13T07:00:00" })!;
    expect(isSameLocalDay(sameDay, new Date(2026, 5, 13, 20, 0))).toBe(true);
    expect(isSameLocalDay(sameDay, new Date(2026, 5, 12, 20, 0))).toBe(false);
  });
});

describe("describeStravaError", () => {
  it("401 → invite à se reconnecter (app révoquée)", () => {
    expect(describeStravaError("Strava 401: Unauthorized")).toMatch(/révoqué/i);
  });

  it("403 → renvoie vers la révocation strava.com puis reconnexion", () => {
    const msg = describeStravaError("Strava 403: Forbidden");
    expect(msg).toMatch(/accès aux activités/i);
    expect(msg).toMatch(/strava\.com\/settings\/apps/i);
    expect(msg).toMatch(/reconnecte/i);
    expect(msg).toMatch(/\[Strava 403: Forbidden\]/); // détail brut conservé
  });

  it("rate limit → invite à patienter, pas à révoquer", () => {
    // « rate limit » est testé AVANT le 403 générique : sinon un 403 rate-limit
    // enverrait à tort révoquer l'app alors qu'il suffit d'attendre.
    const msg = describeStravaError("Strava 403: Rate Limit Exceeded (rate limit:exceeded)");
    expect(msg).toMatch(/patiente/i);
    expect(msg).not.toMatch(/strava\.com/i);
  });

  it("quota d'athlètes dépassé → dit de NE PAS reconnecter en boucle", () => {
    // Cas réel : app en « Single Player Mode » (1 athlète), compteur saturé par les
    // essais. Reconnecter aggrave — le message doit l'interdire explicitement.
    const msg = describeStravaError("Strava 403: Forbidden (connected athletes:exceeded)");
    expect(msg).toMatch(/quota/i);
    expect(msg).toMatch(/1 athlète/i);
    expect(msg).toMatch(/NE reconnecte PAS|pas en boucle/i);
  });

  it("autre statut → remonte le message brut sans le masquer", () => {
    expect(describeStravaError("Failed to fetch")).toBe(
      "Activités indisponibles — Failed to fetch"
    );
    expect(describeStravaError("action invalide")).toBe(
      "Activités indisponibles — action invalide"
    );
  });

  it("message vide → libellé de repli", () => {
    expect(describeStravaError("")).toBe("Activités indisponibles — erreur inconnue");
  });

  it("ne confond pas un code englobant (4013) avec 401", () => {
    // Le \b évite qu'un nombre comme 4013 déclenche par erreur le message 401.
    expect(describeStravaError("Erreur 4013")).toMatch(/Activités indisponibles/);
  });
});
