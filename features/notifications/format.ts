/** Mise en forme de la liste de notifications (pure, testable). */

export type WithDate = { created_at: string };

/**
 * « à l'instant » → « il y a 2 h » → « hier » → « dimanche » → « 12.06 ».
 *
 * La maquette n'affiche jamais d'heure absolue dans la liste : sur un flux qu'on
 * consulte plusieurs fois par jour, « il y a 2 h » se lit sans réfléchir.
 */
export function relativeTime(iso: string, now: Date): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  if (days === 0) return `il y a ${hours} h`;
  if (days === 1) return "hier";
  if (days < 7) {
    return ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"][
      date.getDay()
    ];
  }
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`;
}

export type NotificationSection<T> = { title: string; data: T[] };

/**
 * Regroupe par ancienneté : « Aujourd'hui » / « Hier » / « Plus tôt ».
 * Les sections vides sont omises — un titre sans contenu est du bruit.
 */
export function groupByDay<T extends WithDate>(
  items: T[],
  now: Date
): NotificationSection<T>[] {
  const today: T[] = [];
  const yesterday: T[] = [];
  const earlier: T[] = [];
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const base = startOfDay(now);

  for (const item of items) {
    const date = new Date(item.created_at);
    if (Number.isNaN(date.getTime())) {
      earlier.push(item);
      continue;
    }
    const days = Math.round((base - startOfDay(date)) / 86_400_000);
    if (days <= 0) today.push(item);
    else if (days === 1) yesterday.push(item);
    else earlier.push(item);
  }

  return [
    { title: "Aujourd'hui", data: today },
    { title: "Hier", data: yesterday },
    { title: "Plus tôt", data: earlier },
  ].filter((section) => section.data.length > 0);
}

/**
 * Compteur de la pastille d'entête : « 3 nouvelles » / « 1 nouvelle ».
 *
 * « non lues » décrivait l'état du registre ; « nouvelles » décrit ce qui
 * intéresse le lecteur — ce qu'il n'a pas encore vu.
 */
export function unreadLabel(count: number): string | null {
  if (count <= 0) return null;
  return count === 1 ? "1 nouvelle" : `${count} nouvelles`;
}

/**
 * Cible d'un vote portée par la notification (`session_id` ou `excuse_id`),
 * `null` si la notification n'appelle pas de vote.
 */
export function voteTargetId(notification: {
  type: string;
  data?: unknown;
}): string | null {
  if (notification.type !== "vote_pending_session" && notification.type !== "vote_pending_excuse") {
    return null;
  }
  const data = (notification.data ?? {}) as Record<string, unknown>;
  const id = notification.type === "vote_pending_excuse" ? data.excuse_id : data.session_id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

/**
 * Invitation déjà traitée ? Renvoie le statut (`accepted` / `refused`) ou `null`
 * si elle est encore en attente — ou si on n'en sait rien.
 */
export function invitationOutcome(
  notification: { type: string; data?: unknown },
  statuses: Record<string, string> | undefined
): "accepted" | "refused" | null {
  if (notification.type !== "group_invitation" || !statuses) return null;
  const data = (notification.data ?? {}) as Record<string, unknown>;
  const id = typeof data.invitation_id === "string" ? data.invitation_id : null;
  if (!id) return null;
  const status = statuses[id];
  return status === "accepted" || status === "refused" ? status : null;
}

/**
 * Ce vote a-t-il déjà été donné ? Sans la liste des votes (chargement, RLS), on
 * répond `false` : proposer un bouton en trop est moins grave que de faire croire
 * à quelqu'un qu'il a voté alors que non.
 */
export function isVoteDone(
  notification: { type: string; data?: unknown },
  votedTargetIds: Set<string> | undefined
): boolean {
  const target = voteTargetId(notification);
  if (!target || !votedTargetIds) return false;
  return votedTargetIds.has(target);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
