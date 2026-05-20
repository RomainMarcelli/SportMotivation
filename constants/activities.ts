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
