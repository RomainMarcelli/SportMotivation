// Sélection de l'événement « objectif hebdo atteint » à célébrer côté client.
//
// Le serveur (SQL 069) émet une notification `objective_reached` — une seule par
// défi et par semaine — quand l'objectif effectif de la semaine est atteint. La
// modale de célébration (BadgeCelebration) s'en sert pour féliciter le membre dans
// la MÊME pop-up que ses badges fraîchement débloqués (une seule modale, pas quatre).
//
// Logique volontairement PURE (aucune dépendance React/Supabase) pour être testée.

/** Forme minimale d'une notification nécessaire au choix de la célébration. */
export type CelebrationNotif = {
  id: string;
  type: string;
  body: string;
  data: unknown;
  /** `true` = déjà vue → on ne re-fête pas. */
  read: boolean | null;
};

export type ObjectiveCelebration = {
  notificationId: string;
  groupId: string | null;
  /** Série INCLUANT la semaine tout juste validée (fournie par le serveur). */
  streak: number;
  /** Texte prêt à afficher (rédigé par le serveur, avec le nom du défi). */
  body: string;
};

/**
 * Renvoie l'« objectif hebdo atteint » à fêter : la notification `objective_reached`
 * NON LUE la plus récente, en ignorant celles déjà acquittées dans la session.
 * `null` s'il n'y a rien à célébrer.
 *
 * La liste est supposée triée du plus récent au plus ancien (comme `useNotifications`),
 * donc le premier match est le plus récent. Se fier au flag `read` suffit : le serveur
 * ne crée qu'une notification par défi/semaine.
 */
export function pickObjectiveCelebration(
  notifications: readonly CelebrationNotif[],
  dispatched?: ReadonlySet<string>
): ObjectiveCelebration | null {
  for (const n of notifications) {
    if (n.type !== "objective_reached") continue;
    if (n.read) continue;
    if (dispatched?.has(n.id)) continue;

    const data = (n.data ?? {}) as Record<string, unknown>;
    const rawStreak = data.streak;
    // `streak` peut arriver en number (jsonb) ou en string selon la sérialisation :
    // on tolère les deux, et 0 par défaut si la valeur est absente/invalide.
    const streak =
      typeof rawStreak === "number" ? rawStreak : Number(rawStreak) || 0;
    const groupId = typeof data.group_id === "string" ? data.group_id : null;

    return { notificationId: n.id, groupId, streak, body: n.body };
  }
  return null;
}
