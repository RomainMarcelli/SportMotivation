/**
 * Cagnotte — logique pure (agrégation + libellés), testable sans réseau.
 *
 * Le calcul métier (qui doit quoi, réglé / en attente, regroupement de
 * l'historique par semaine) vit ici ; les appels Supabase sont dans
 * `queries.ts` / `mutations.ts` et l'écran dans `app/group/[id]/cagnotte.tsx`.
 *
 * Modèle : chaque dette d'un membre est une ligne `pot_transactions`
 * (`transaction_type = 'penalty_added'`) avec `is_paid`. Le registre des
 * pénalités (`penalties`) donne le TYPE (séance manquée / blâme) et la semaine.
 */

export type MemberRole = "admin" | "member" | "treasurer";

/** Détail d'un membre dans la cagnotte (une ligne de « Détail par membre »). */
export type CagnotteMember = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  avatarUrl: string | null;
  avatarColor: string | null;
  avatarIcon: string | null;
  role: MemberRole | null;
  /** Nombre de pénalités (séances manquées + blâmes) de ce membre. */
  penaltyCount: number;
  /** Total dû (réglé + en attente). */
  totalAmount: number;
  /** Déjà réglé (transactions cochées par le trésorier). */
  paidAmount: number;
  /** Vrai si TOUT est réglé pour ce membre. */
  isPaid: boolean;
};

export type PenaltyType = "missed_session" | "blame_threshold";

/** Une pénalité de l'historique. */
export type PenaltyHistoryItem = {
  id: string;
  userId: string;
  firstName: string | null;
  username: string | null;
  penaltyType: PenaltyType;
  amount: number;
  /** Lundi de la semaine concernée (YYYY-MM-DD). */
  weekStart: string;
  /** Horodatage de création (ISO). */
  createdAt: string;
};

/* ------------------------------------------------------------------ totaux */

export type CagnotteTotals = {
  total: number;
  paid: number;
  pending: number;
  /** Part réglée dans [0, 1] (0 si total nul). */
  paidRatio: number;
};

/**
 * Totaux de la cagnotte à partir du détail par membre.
 * `total`/`paid`/`pending` sont cohérents entre eux : c'est ce qui alimente le
 * héro (montant) ET la barre réglé/en attente (mêmes chiffres, pas de dérive).
 */
export function cagnotteTotals(members: CagnotteMember[]): CagnotteTotals {
  const total = members.reduce((s, m) => s + m.totalAmount, 0);
  const paid = members.reduce((s, m) => s + m.paidAmount, 0);
  const pending = Math.max(0, total - paid);
  return { total, paid, pending, paidRatio: total > 0 ? paid / total : 0 };
}

/**
 * Membres avec un solde en attente (compteur du bouton « Relancer »).
 * Un membre listé a forcément ≥ 1 pénalité, donc `!isPaid` = il reste à régler.
 */
export function unpaidMembers(members: CagnotteMember[]): CagnotteMember[] {
  return members.filter((m) => !m.isPaid);
}

/* ------------------------------------------------------------------ libellés */

/** « 1 pénalité » / « 3 pénalités » — accord au pluriel. */
export function penaltyCountLabel(count: number): string {
  return `${count} pénalité${count > 1 ? "s" : ""}`;
}

/**
 * Libellé du type de pénalité. Depuis le refactor 054, le blâme = « vote manqué »
 * (ne pas voter une séance avant l'échéance), donc la pénalité de seuil s'affiche
 * « Vote manqué » plutôt que « Blâme atteint ».
 */
export function penaltyTypeLabel(type: PenaltyType): string {
  return type === "blame_threshold" ? "Vote manqué" : "Séance manquée";
}

/**
 * Montant en euros, à la française : entier sans décimales (« 5 € »), sinon
 * deux décimales avec virgule (« 12,50 € »). On arrondit au centime pour éviter
 * les « 4.999999 » issus des sommes de flottants.
 */
export function formatEuro(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const body = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(".", ",");
  return `${body} €`;
}

/* ------------------------------------------------------- historique par semaine */

export type HistoryGroup = {
  /** Lundi de la semaine (YYYY-MM-DD). */
  weekStart: string;
  /** Libellé relatif : « Cette semaine », « Semaine dernière », « Il y a N semaines ». */
  label: string;
  items: PenaltyHistoryItem[];
};

// Parse une date « YYYY-MM-DD » en date locale (midi implicite via composants),
// sans dépendre du fuseau — comparer des lundis, pas des instants.
function parseYMD(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

/** Nombre de semaines entre deux lundis (`from` plus ancien → positif). */
export function weeksBetween(fromWeek: string, toWeek: string): number {
  const ms = parseYMD(toWeek).getTime() - parseYMD(fromWeek).getTime();
  return Math.round(ms / (7 * 86_400_000));
}

function weekLabel(weekStart: string, nowWeekStart: string): string {
  const diff = weeksBetween(weekStart, nowWeekStart);
  if (diff <= 0) return "Cette semaine";
  if (diff === 1) return "Semaine dernière";
  return `Il y a ${diff} semaines`;
}

/**
 * Regroupe l'historique par semaine, de la plus récente à la plus ancienne, avec
 * un libellé relatif à la semaine en cours (`nowWeekStart` = lundi courant).
 * Les pénalités d'une même semaine sont conservées dans l'ordre reçu (déjà trié
 * du plus récent au plus ancien côté RPC).
 */
export function groupHistoryByWeek(
  items: PenaltyHistoryItem[],
  nowWeekStart: string
): HistoryGroup[] {
  const byWeek = new Map<string, PenaltyHistoryItem[]>();
  for (const item of items) {
    const bucket = byWeek.get(item.weekStart);
    if (bucket) bucket.push(item);
    else byWeek.set(item.weekStart, [item]);
  }
  // Semaines triées décroissant (chaîne ISO YYYY-MM-DD → l'ordre lexical suffit).
  const weeks = [...byWeek.keys()].sort((a, b) => (a < b ? 1 : -1));
  return weeks.map((weekStart) => ({
    weekStart,
    label: weekLabel(weekStart, nowWeekStart),
    items: byWeek.get(weekStart)!,
  }));
}
