import {
  formatStravaActivity,
  stravaDurationToMinutes,
  stravaTypeToActivityId,
  toStravaProofData,
  type StravaActivity,
} from "../strava";

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
