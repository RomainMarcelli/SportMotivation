import type { Database } from "@/types/database.types";

export type MemberRole = Database["public"]["Enums"]["member_role"];

export function roleLabel(role: MemberRole): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "treasurer":
      return "Trésorier";
    case "member":
      return "Membre";
  }
}
