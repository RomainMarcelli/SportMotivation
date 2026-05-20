/**
 * Helpers Strava (logique pure, testable). L'auth OAuth et les appels réseau vivent dans
 * `lib/strava.ts` ; ici on ne fait que transformer les données d'activité Strava.
 */

export type StravaActivity = {
  id: number;
  name: string;
  type: string; // ex: "Run", "Ride", "Swim", "Hike", "Workout"...
  sport_type?: string;
  distance: number; // mètres
  moving_time: number; // secondes
  start_date_local: string; // ISO
};

/** Données condensées qu'on stocke dans session_proofs.strava_data (JSONB). */
export type StravaProofData = {
  activity_id: number;
  name: string;
  type: string;
  distance_m: number;
  moving_time_s: number;
  start_date_local: string;
};

/** Mappe un type d'activité Strava vers l'un de nos identifiants d'activité internes. */
export function stravaTypeToActivityId(stravaType: string): string {
  switch (stravaType) {
    case "Run":
    case "TrailRun":
    case "VirtualRun":
      return "running";
    case "Ride":
    case "VirtualRide":
    case "EBikeRide":
    case "MountainBikeRide":
      return "cycling";
    case "Swim":
      return "swimming";
    case "Hike":
    case "Walk":
      return "hiking";
    case "WeightTraining":
    case "Workout":
    case "Crossfit":
      return "weight_training";
    case "Yoga":
      return "yoga";
    default:
      return "other";
  }
}

/** Durée Strava (secondes) → minutes entières. */
export function stravaDurationToMinutes(movingTimeSeconds: number): number {
  return Math.max(1, Math.round(movingTimeSeconds / 60));
}

/** Extrait les données condensées à stocker dans la preuve. */
export function toStravaProofData(activity: StravaActivity): StravaProofData {
  return {
    activity_id: activity.id,
    name: activity.name,
    type: activity.sport_type ?? activity.type,
    distance_m: activity.distance,
    moving_time_s: activity.moving_time,
    start_date_local: activity.start_date_local,
  };
}

/** Libellé court pour afficher une activité Strava dans une liste. */
export function formatStravaActivity(activity: StravaActivity): string {
  const km = (activity.distance / 1000).toFixed(1);
  const min = stravaDurationToMinutes(activity.moving_time);
  return `${activity.name} — ${km} km · ${min} min`;
}
