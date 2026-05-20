import type { Database } from "@/types/database.types";

export type SessionStatus = Database["public"]["Enums"]["session_status"];

type StatusMeta = { label: string; tone: "amber" | "green" | "red" | "neutral" };

const STATUS_META: Record<SessionStatus, StatusMeta> = {
  pending_vote: { label: "En attente de vote", tone: "amber" },
  validated: { label: "Validée", tone: "green" },
  rejected: { label: "Rejetée", tone: "red" },
  expired: { label: "Expirée", tone: "neutral" },
};

export function sessionStatusMeta(status: SessionStatus): StatusMeta {
  return STATUS_META[status] ?? { label: status, tone: "neutral" };
}
