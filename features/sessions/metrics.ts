import { normalizeSport } from "@/lib/sports";

export const MIN_SESSION_DURATION_MIN = 1;
export const MAX_SESSION_DURATION_MIN = 1440;
export const MAX_SESSION_DISTANCE_KM = 5000;

export type SessionMetricKind = "pace_per_km" | "pace_per_100m" | "speed_kmh";

export type SessionMetric = {
  kind: SessionMetricKind;
  label: "allure" | "vitesse";
  value: string;
};

const RUNNING_KEYS = ["course", "running", "run", "footing", "jogging", "trail", "marathon"];
const WALKING_KEYS = ["marche", "walk", "rando", "hiking", "trek"];
const CYCLING_KEYS = ["velo", "cyclisme", "cycling", "bike", "vtt", "spinning"];
const SWIMMING_KEYS = ["natation", "nage", "swim", "piscine"];

function includesOne(value: string, keys: readonly string[]): boolean {
  return keys.some((key) => value.includes(key));
}

/**
 * Les noms de sport sont libres en base. On utilise donc quelques familles
 * génériques plutôt qu'un catalogue fermé difficile à maintenir.
 */
export function metricKindForSport(activityType: string): SessionMetricKind {
  const sport = normalizeSport(activityType);
  if (includesOne(sport, SWIMMING_KEYS)) return "pace_per_100m";
  if (includesOne(sport, RUNNING_KEYS) || includesOne(sport, WALKING_KEYS)) {
    return "pace_per_km";
  }
  return "speed_kmh";
}

/** Sports pour lesquels la distance mérite d'être visible sans action préalable. */
export function isDistanceFirstClassSport(activityType: string): boolean {
  const sport = normalizeSport(activityType);
  return (
    includesOne(sport, RUNNING_KEYS) ||
    includesOne(sport, WALKING_KEYS) ||
    includesOne(sport, CYCLING_KEYS) ||
    includesOne(sport, SWIMMING_KEYS)
  );
}

export function parseDistanceKm(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (normalized.length === 0) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function validDistanceKm(value: number | null | undefined): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= MAX_SESSION_DISTANCE_KM
  );
}

export function validDurationMin(value: number | null | undefined): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= MIN_SESSION_DURATION_MIN &&
    value <= MAX_SESSION_DURATION_MIN
  );
}

export function averageSpeedKmh(
  distanceKm: number | null | undefined,
  durationMin: number | null | undefined
): number | null {
  if (!validDistanceKm(distanceKm) || !validDurationMin(durationMin)) return null;
  return distanceKm / (durationMin / 60);
}

export function paceMinutesPerKm(
  distanceKm: number | null | undefined,
  durationMin: number | null | undefined
): number | null {
  if (!validDistanceKm(distanceKm) || !validDurationMin(durationMin)) return null;
  return durationMin / distanceKm;
}

export function paceMinutesPer100m(
  distanceKm: number | null | undefined,
  durationMin: number | null | undefined
): number | null {
  if (!validDistanceKm(distanceKm) || !validDurationMin(durationMin)) return null;
  return durationMin / (distanceKm * 10);
}

export function formatDistanceKm(distanceKm: number | null | undefined): string | null {
  if (!validDistanceKm(distanceKm)) return null;
  const rounded = Math.round(distanceKm * 100) / 100;
  return `${String(rounded).replace(".", ",")} km`;
}

export function formatPace(minutes: number | null | undefined, unit = "/km"): string | null {
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes <= 0) return null;

  const totalSeconds = Math.round(minutes * 60);
  const wholeMinutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${wholeMinutes}:${String(seconds).padStart(2, "0")}${unit}`;
}

export function sessionMetric(
  activityType: string,
  durationMin: number | null | undefined,
  distanceKm: number | null | undefined
): SessionMetric | null {
  const kind = metricKindForSport(activityType);

  if (kind === "pace_per_km") {
    const value = formatPace(paceMinutesPerKm(distanceKm, durationMin));
    return value ? { kind, label: "allure", value } : null;
  }

  if (kind === "pace_per_100m") {
    const value = formatPace(paceMinutesPer100m(distanceKm, durationMin), "/100 m");
    return value ? { kind, label: "allure", value } : null;
  }

  const speed = averageSpeedKmh(distanceKm, durationMin);
  if (speed === null) return null;
  return {
    kind,
    label: "vitesse",
    value: `${String(Math.round(speed * 10) / 10).replace(".", ",")} km/h`,
  };
}
