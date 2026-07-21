/**
 * Transfert du rôle d'admin (logique pure, testable).
 * L'admin choisit son successeur parmi les AUTRES membres actifs du groupe.
 */

export type TransferCandidate = {
  id: string;
  joinedAt: string;
  user: { id: string };
};

const TRANSFER_ERROR_MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: "Tu dois être connecté.",
  NOT_MEMBER: "Tu n'es pas membre de ce groupe.",
  NOT_ADMIN: "Seul l'admin peut transférer l'administration.",
  ALREADY_ADMIN: "Tu es déjà l'admin de ce groupe.",
  TARGET_NOT_MEMBER: "Ce membre ne fait plus partie du groupe.",
};

export function mapTransferAdminError(code: string): string {
  // ⚠ Du plus long au plus court : « TARGET_NOT_MEMBER » CONTIENT « NOT_MEMBER »,
  // un simple parcours dans l'ordre de déclaration renverrait le mauvais message.
  const keys = Object.keys(TRANSFER_ERROR_MESSAGES).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (code.includes(key)) return TRANSFER_ERROR_MESSAGES[key];
  }
  return code;
}

/**
 * Membres à qui l'on peut confier l'administration : tous sauf moi,
 * du plus ancien au plus récent (le plus ancien en premier = suggestion naturelle).
 */
export function eligibleNewAdmins<T extends TransferCandidate>(
  members: T[],
  meId: string | undefined
): T[] {
  return members
    .filter((m) => m.user.id !== meId)
    .slice()
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
}

/** Peut-on proposer un transfert d'administration ? (admin + au moins un autre membre) */
export function canTransferAdmin(candidateCount: number, isAdmin: boolean): boolean {
  return isAdmin && candidateCount > 0;
}
