/**
 * Préférences de notification (écran Paramètres).
 *
 * Le filtrage réel se fait **en base** (trigger `filter_notification_by_prefs`,
 * SQL 035) : une notification refusée n'est jamais créée. Ici on ne gère que
 * l'affichage et l'écriture.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react-native";
import { Bell, CalendarDays, CheckCheck, Flag, Users } from "lucide-react-native";

import { useCurrentUser } from "@/lib/auth-store";
import { supabase } from "@/lib/supabase";

export const NOTIFICATION_PREF_KEYS = [
  "session_reminders",
  "weekly_recap",
  "votes",
  "group_activity",
  "challenge_end",
] as const;

export type NotificationPrefKey = (typeof NOTIFICATION_PREF_KEYS)[number];
export type NotificationPrefs = Record<NotificationPrefKey, boolean>;

/** Tout est activé tant que l'utilisateur n'a rien décidé. */
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  session_reminders: true,
  weekly_recap: true,
  votes: true,
  group_activity: true,
  challenge_end: true,
};

export type NotificationPrefItem = {
  key: NotificationPrefKey;
  label: string;
  sublabel: string;
  icon: LucideIcon;
  /**
   * `false` = la notification correspondante n'existe pas encore côté serveur
   * (il faut un planificateur). Le réglage est enregistré et sera honoré le
   * jour où elle arrive — mais on ne fait pas croire qu'il se passe quelque
   * chose aujourd'hui.
   */
  live: boolean;
};

export const NOTIFICATION_PREF_ITEMS: NotificationPrefItem[] = [
  {
    key: "session_reminders",
    label: "Rappels de séance",
    sublabel: "Quand une séance planifiée approche",
    icon: Bell,
    live: false,
  },
  {
    key: "weekly_recap",
    label: "Récap du dimanche",
    sublabel: "Séances restantes et votes en attente",
    icon: CalendarDays,
    live: false,
  },
  {
    key: "votes",
    label: "Votes à donner",
    sublabel: "Séances et excuses à valider",
    icon: CheckCheck,
    live: true,
  },
  {
    key: "group_activity",
    label: "Activité du groupe",
    sublabel: "Arrivées, départs, changement d'admin",
    icon: Users,
    live: true,
  },
  {
    key: "challenge_end",
    label: "Fin de défi",
    sublabel: "Rappel à 7 jours et clôture",
    icon: Flag,
    live: false,
  },
];

/**
 * Lit la colonne jsonb en tolérant tout : colonne absente (SQL 035 pas encore
 * passé), valeur nulle, clé inconnue, valeur qui n'est pas un booléen. Une
 * préférence illisible vaut « activé » — on ne prive personne d'une
 * notification à cause d'une donnée bancale.
 */
export function readNotificationPrefs(raw: unknown): NotificationPrefs {
  const prefs = { ...DEFAULT_NOTIFICATION_PREFS };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return prefs;

  const source = raw as Record<string, unknown>;
  for (const key of NOTIFICATION_PREF_KEYS) {
    if (source[key] === false) prefs[key] = false;
  }
  return prefs;
}

/** Combien de catégories sont coupées (pour le sous-titre de la section). */
export function mutedCount(prefs: NotificationPrefs): number {
  return NOTIFICATION_PREF_KEYS.filter((key) => !prefs[key]).length;
}

/** Résumé affiché sous le titre de la section Notifications. */
export function prefsSummary(prefs: NotificationPrefs): string {
  const muted = mutedCount(prefs);
  if (muted === 0) return "Tout est activé";
  if (muted === NOTIFICATION_PREF_KEYS.length) return "Tout est coupé";
  return `${muted} catégorie${muted > 1 ? "s" : ""} coupée${muted > 1 ? "s" : ""}`;
}

/** Préférences de l'utilisateur courant. */
export function useNotificationPrefs() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: ["notification-prefs", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<NotificationPrefs> => {
      const { data, error } = await supabase
        .from("users")
        .select("notification_prefs")
        .eq("id", user!.id)
        .maybeSingle();
      // Colonne absente = SQL 035 pas encore exécuté : on affiche les valeurs
      // par défaut plutôt que de casser l'écran entier.
      if (error) return { ...DEFAULT_NOTIFICATION_PREFS };
      return readNotificationPrefs(data?.notification_prefs);
    },
  });
}

/** Bascule une catégorie. Mise à jour optimiste : l'interrupteur ne doit pas « coller ». */
export function useSetNotificationPref() {
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const queryKey = ["notification-prefs", user?.id];

  return useMutation({
    mutationFn: async (change: { key: NotificationPrefKey; value: boolean }) => {
      const { error } = await supabase.rpc("set_notification_prefs", {
        p_prefs: { [change.key]: change.value },
      });
      if (error) throw error;
    },
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<NotificationPrefs>(queryKey);
      queryClient.setQueryData<NotificationPrefs>(queryKey, {
        ...(previous ?? DEFAULT_NOTIFICATION_PREFS),
        [change.key]: change.value,
      });
      return { previous };
    },
    onError: (_error, _change, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });
}
