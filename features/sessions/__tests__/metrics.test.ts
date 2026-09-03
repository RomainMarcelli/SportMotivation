import {
  averageSpeedKmh,
  formatDistanceKm,
  formatPace,
  isDistanceFirstClassSport,
  metricKindForSport,
  paceMinutesPer100m,
  paceMinutesPerKm,
  parseDistanceKm,
  sessionMetric,
} from "../metrics";

describe("calculs de métriques de séance", () => {
  it("calcule une vitesse moyenne en km/h", () => {
    expect(averageSpeedKmh(30.5, 65)).toBeCloseTo(28.1538, 4);
    expect(sessionMetric("Vélo", 65, 30.5)).toEqual({
      kind: "speed_kmh",
      label: "vitesse",
      value: "28,2 km/h",
    });
  });

  it("calcule et formate une allure de course en min/km", () => {
    expect(paceMinutesPerKm(8.2, 42)).toBeCloseTo(5.12195, 4);
    expect(formatPace(paceMinutesPerKm(8.2, 42))).toBe("5:07/km");
    expect(sessionMetric("Course", 42, 8.2)?.value).toBe("5:07/km");
  });

  it("calcule l'allure de natation en min/100 m", () => {
    expect(paceMinutesPer100m(1.5, 30)).toBe(2);
    expect(sessionMetric("Natation", 30, 1.5)).toEqual({
      kind: "pace_per_100m",
      label: "allure",
      value: "2:00/100 m",
    });
  });

  it("utilise l'allure pour course/marche/randonnée et la vitesse sinon", () => {
    expect(metricKindForSport("Trail running")).toBe("pace_per_km");
    expect(metricKindForSport("Marche nordique")).toBe("pace_per_km");
    expect(metricKindForSport("Randonnée")).toBe("pace_per_km");
    expect(metricKindForSport("Natation")).toBe("pace_per_100m");
    expect(metricKindForSport("Kayak")).toBe("speed_kmh");
  });

  it("affiche directement la distance seulement pour les familles prévues", () => {
    expect(isDistanceFirstClassSport("Course")).toBe(true);
    expect(isDistanceFirstClassSport("Vélo")).toBe(true);
    expect(isDistanceFirstClassSport("Marche")).toBe(true);
    expect(isDistanceFirstClassSport("Randonnée")).toBe(true);
    expect(isDistanceFirstClassSport("Natation")).toBe(true);
    expect(isDistanceFirstClassSport("Musculation")).toBe(false);
  });

  it("gère les valeurs absentes, nulles, nulles métier ou invalides", () => {
    for (const distance of [undefined, null, 0, -1, Number.NaN, 5001]) {
      expect(averageSpeedKmh(distance, 60)).toBeNull();
      expect(paceMinutesPerKm(distance, 60)).toBeNull();
      expect(sessionMetric("Course", 60, distance)).toBeNull();
      expect(formatDistanceKm(distance)).toBeNull();
    }
    for (const duration of [undefined, null, 0, -1, Number.NaN, 1441]) {
      expect(sessionMetric("Course", duration, 10)).toBeNull();
    }
  });
});

describe("saisie et affichage de distance", () => {
  it("accepte le séparateur français ou décimal", () => {
    expect(parseDistanceKm("8,2")).toBe(8.2);
    expect(parseDistanceKm("30.5")).toBe(30.5);
    expect(parseDistanceKm("  ")).toBeNull();
    expect(parseDistanceKm("abc")).toBeNaN();
  });

  it("formate sans zéro ou décimales inutiles", () => {
    expect(formatDistanceKm(8.2)).toBe("8,2 km");
    expect(formatDistanceKm(10)).toBe("10 km");
  });

  it("préserve l'affichage historique quand la distance est absente", () => {
    expect(formatDistanceKm(null)).toBeNull();
    expect(sessionMetric("Course", 45, null)).toBeNull();
  });
});
