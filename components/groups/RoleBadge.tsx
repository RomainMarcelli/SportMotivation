import { Crown, Wallet } from "lucide-react-native";

import type { MemberRole } from "@/constants/roles";

/** Petite icône indiquant le rôle (admin / trésorier). Rien pour un membre simple. */
export function RoleBadge({ role, size = 14 }: { role: MemberRole; size?: number }) {
  if (role === "admin") return <Crown size={size} color="#f59e0b" />;
  if (role === "treasurer") return <Wallet size={size} color="#3b82f6" />;
  return null;
}
