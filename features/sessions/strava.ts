/**
 * Helpers Strava (logique pure, testable). L'auth OAuth et les appels réseau vivent dans
 * `lib/strava.ts` ; ici on ne fait que transformer les données d'activité Strava.
 */

import { formatDuration } from "@/lib/duration";

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

/**
 * Date de début d'une activité Strava (heure locale du sportif).
 * `start_date_local` est ISO sans fuseau → interprété en heure locale par `Date`.
 * Sert à vérifier que l'activité correspond bien au jour déclaré (anti-fraude).
 */
export function stravaActivityDate(activity: StravaActivity): Date | null {
  const raw = activity.start_date_local;
  if (!raw) return null;
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : new Date(t);
}

/** Libellé court pour afficher une activité Strava dans une liste. */
export function formatStravaActivity(activity: StravaActivity): string {
  const km = (activity.distance / 1000).toFixed(1);
  const min = stravaDurationToMinutes(activity.moving_time);
  return `${activity.name} — ${km} km · ${formatDuration(min)}`;
}

/**
 * Traduit une erreur de chargement d'activités Strava en message ACTIONNABLE.
 *
 * Le proxy encode le statut Strava dans le message (« Strava 403: … ») : on en
 * fait un conseil clair plutôt qu'un code brut, car chaque statut a une cause et
 * un remède précis :
 *  - **401** → l'app a été révoquée côté Strava (ou jeton mort) → se reconnecter.
 *  - **403** → jeton VALIDE mais SANS le scope « activités » : Strava a connecté
 *    le compte avec la seule permission de base. C'est le piège `approval_prompt`
 *    (cf. `lib/strava.ts`) — il faut se reconnecter en accordant la lecture des
 *    activités.
 *  - autre (« Failed to fetch », « action invalide »…) → on remonte le message
 *    brut sans le masquer, ça pointe l'Edge Function.
 *
 * Fonction pure (pas d'accès réseau) → testable directement.
 */
export function describeStravaError(message: string): string {
  // Limite d'API atteinte : Strava répond 403 « Rate Limit Exceeded ». Rien à
  // reconnecter — il faut juste patienter. On teste ce cas AVANT le 403 générique.
  if (/rate limit/i.test(message)) {
    return "Limite de requêtes Strava atteinte. Patiente ~15 min puis réessaie (rien à reconnecter).";
  }
  // Quota d'ATHLÈTES de l'app Strava dépassé (une app neuve est en « Single Player
  // Mode » = 1 athlète). ⚠ Reconnecter n'aide PAS et gonfle encore le compteur :
  // il faut révoquer les accès existants sur strava.com, sinon demander une hausse
  // de quota. Testé avant le 403 générique (c'est aussi un 403).
  if (/connected athletes|athlete limit|logged-in athlete|athlète.{0,4}connect/i.test(message)) {
    return (
      "Quota Strava atteint : ton app est limitée à 1 athlète. NE reconnecte PAS en boucle " +
      "(ça aggrave). Sur strava.com/settings/apps, révoque les accès « Sport motiv », attends, " +
      "puis connecte une seule fois."
    );
  }
  if (/\b401\b/.test(message)) {
    return "Strava a révoqué l'autorisation. Reconnecte ton compte.";
  }
  if (/\b403\b/.test(message)) {
    // 403 générique : le scope PEUT être accordé (cf. ligne « Accès » à l'écran) et
    // Strava refuse quand même — signe d'une autorisation restée partielle côté
    // Strava. Le remède fiable est de RÉVOQUER l'app sur strava.com puis reconnecter
    // (le simple « déconnecter » in-app ne purge pas le consentement serveur). On
    // garde le détail brut entre crochets pour le diagnostic.
    return (
      "Strava a refusé l'accès aux activités (403). Va sur strava.com/settings/apps, " +
      `révoque « Sport motiv », puis reconnecte dans l'app. [${message}]`
    );
  }
  return `Activités indisponibles — ${message || "erreur inconnue"}`;
}
