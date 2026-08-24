import type { LucideIcon } from "lucide-react-native";
import {
  Activity,
  Bike,
  Dumbbell,
  Footprints,
  MountainSnow,
  PersonStanding,
  Waves,
} from "lucide-react-native";

import { getSportIcon } from "@/lib/sports";

export type ActivityOption = {
  id: string;
  label: string;
  icon: LucideIcon;
};

/**
 * Activités sportives proposées par défaut à la création d'un groupe.
 * Les `id` correspondent aux clés stockées en base (cf. default `groups.accepted_activities`).
 */
export const ACTIVITY_OPTIONS: ActivityOption[] = [
  { id: "running", label: "Course", icon: Footprints },
  { id: "weight_training", label: "Musculation", icon: Dumbbell },
  { id: "cycling", label: "Vélo", icon: Bike },
  { id: "swimming", label: "Natation", icon: Waves },
  { id: "yoga", label: "Yoga", icon: PersonStanding },
  { id: "hiking", label: "Randonnée", icon: MountainSnow },
  { id: "other", label: "Autre", icon: Activity },
];

export function getActivityLabel(id: string): string {
  return ACTIVITY_OPTIONS.find((a) => a.id === id)?.label ?? id;
}

/**
 * Icône d'une activité. Pour un sport du catalogue, son icône dédiée ; pour un
 * sport libre ajouté par un membre (« équitation »…), on délègue au matcher par
 * mots-clés de `lib/sports`, qui couvre bien plus de disciplines que le catalogue.
 */
export function getActivityIcon(id: string): LucideIcon {
  const option = ACTIVITY_OPTIONS.find((a) => a.id === id);
  return option ? option.icon : getSportIcon(id);
}

export type ActivitiesSummary = {
  /** Les premières activités, prêtes à afficher (« Course, Vélo »). */
  label: string;
  /** Combien ne sont PAS montrées (0 = la liste est complète). */
  extra: number;
  total: number;
};

/**
 * Résumé tenant sur **une ligne** pour le récap des règles.
 *
 * La liste complète débordait sur trois lignes et déformait le tableau ; on en
 * montre deux et le « +N » invite à ouvrir la liste entière.
 */
export function activitiesSummary(ids: string[], max = 2): ActivitiesSummary {
  const limit = Math.max(1, max);
  const shown = ids.slice(0, limit).map(getActivityLabel);
  return {
    label: shown.length > 0 ? shown.join(", ") : "—",
    extra: Math.max(0, ids.length - shown.length),
    total: ids.length,
  };
}

export type ActivitiesDisplay =
  | { mode: "inline"; label: string; extra: 0; total: number }
  | { mode: "popup"; label: string; extra: number; total: number };

/**
 * Décide comment afficher les activités dans le récap des règles.
 *
 * Peu d'activités, courtes → on les montre **toutes en clair**, sans popup :
 * ouvrir une feuille pour lire « Course, Vélo » n'apporte rien. Dès qu'il y en a
 * trop (`> maxInline`) ou que le texte déborde de la ligne (`> maxChars`), on
 * repasse en résumé « Course, Vélo +2 » cliquable qui ouvre la liste complète.
 */
export function activitiesDisplay(
  ids: string[],
  { maxInline = 3, maxChars = 28, previewCount = 2 } = {}
): ActivitiesDisplay {
  const total = ids.length;
  if (total === 0) return { mode: "inline", label: "—", extra: 0, total: 0 };

  const full = ids.map(getActivityLabel).join(", ");
  if (total <= maxInline && full.length <= maxChars) {
    return { mode: "inline", label: full, extra: 0, total };
  }

  const preview = ids.slice(0, previewCount).map(getActivityLabel).join(", ");
  return { mode: "popup", label: preview, extra: total - previewCount, total };
}
